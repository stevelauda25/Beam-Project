import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const serverDir = dirname(fileURLToPath(import.meta.url))
const host = process.env.BEAM_API_HOST ?? '127.0.0.1'
const port = Number(process.env.BEAM_API_PORT ?? 8787)
const databasePath = resolve(process.env.BEAM_DATABASE_PATH ?? resolve(serverDir, 'data/beam.sqlite'))
const tokenPepper = process.env.BEAM_API_KEY_PEPPER ?? 'beam-local-development-pepper-change-me'
const devAuthToken = process.env.BEAM_DEV_AUTH_TOKEN ?? 'beam-local-dev-token'

mkdirSync(dirname(databasePath), { recursive: true })
const database = new DatabaseSync(databasePath)
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    access TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('Admin', 'Write')),
    token_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    last_four TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    expires_at TEXT,
    revoked_at TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS api_keys_active_name
  ON api_keys (user_id, workspace_id, lower(name))
  WHERE revoked_at IS NULL;

  CREATE INDEX IF NOT EXISTS api_keys_workspace
  ON api_keys (user_id, workspace_id, created_at DESC);
`)

const listKeys = database.prepare(`
  SELECT id, workspace_id, name, access, permission, prefix, last_four,
         created_at, last_used_at, expires_at, revoked_at
  FROM api_keys
  WHERE user_id = ? AND workspace_id = ?
  ORDER BY created_at DESC
`)
const insertKey = database.prepare(`
  INSERT INTO api_keys (
    id, user_id, workspace_id, name, access, permission, token_hash,
    prefix, last_four, created_at, expires_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const revokeKey = database.prepare(`
  UPDATE api_keys SET revoked_at = ?
  WHERE id = ? AND user_id = ? AND workspace_id = ? AND revoked_at IS NULL
`)

const sendJson = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

const readJson = async (request) => {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 16_384) throw new Error('PAYLOAD_TOO_LARGE')
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new Error('INVALID_JSON') }
}

const authenticate = (request) => {
  const authorization = request.headers.authorization ?? ''
  const suppliedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const expected = Buffer.from(devAuthToken)
  const supplied = Buffer.from(suppliedToken)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
  return { userId: request.headers['x-beam-user-id']?.toString().trim() || 'dev-user' }
}

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ')
const validateCreateRequest = (body) => {
  const name = typeof body.name === 'string' ? normalizeName(body.name) : ''
  if (name.length < 3 || name.length > 64) return { error: 'Name must be between 3 and 64 characters.' }
  if (!/^[\p{L}\p{N} ._()-]+$/u.test(name)) return { error: 'Name contains unsupported characters.' }
  if (!['Admin', 'Write'].includes(body.permission)) return { error: 'Permission must be Admin or Write.' }
  if (typeof body.access !== 'string' || !body.access.trim()) return { error: 'Access is required.' }
  if (![null, 30, 90].includes(body.expiresInDays ?? null)) return { error: 'Expiration must be null, 30, or 90 days.' }
  return { name, access: body.access.trim(), permission: body.permission, expiresInDays: body.expiresInDays ?? null }
}

const keyStatus = (row, now = Date.now()) => {
  if (row.revoked_at) return 'revoked'
  if (!row.expires_at) return 'active'
  const expiresAt = Date.parse(row.expires_at)
  if (expiresAt <= now) return 'expired'
  if (expiresAt - now <= 7 * 86_400_000) return 'expiring-soon'
  return 'active'
}

const keyMetadata = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  access: row.access,
  permission: row.permission,
  prefix: row.prefix,
  lastFour: row.last_four,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  status: keyStatus(row),
})

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/health') return sendJson(response, 200, { status: 'ok' })

  const identity = authenticate(request)
  if (!identity) return sendJson(response, 401, { error: 'Unauthorized' })
  const workspaceId = request.headers['x-beam-workspace-id']?.toString().trim() || 'personal'

  try {
    if (request.method === 'GET' && url.pathname === '/api/keys') {
      return sendJson(response, 200, { keys: listKeys.all(identity.userId, workspaceId).map(keyMetadata) })
    }

    if (request.method === 'POST' && url.pathname === '/api/keys') {
      const body = await readJson(request)
      const validated = validateCreateRequest(body)
      if (validated.error) return sendJson(response, 400, validated)

      const id = randomUUID()
      const secret = `fmd_live_${randomBytes(27).toString('base64url')}`
      const prefix = 'fmd_live_'
      const lastFour = secret.slice(-4)
      const createdAt = new Date()
      const expiresAt = validated.expiresInDays === null
        ? null
        : new Date(createdAt.getTime() + validated.expiresInDays * 86_400_000).toISOString()
      const tokenHash = createHmac('sha256', tokenPepper).update(secret).digest('hex')

      try {
        insertKey.run(id, identity.userId, workspaceId, validated.name, validated.access, validated.permission, tokenHash, prefix, lastFour, createdAt.toISOString(), expiresAt)
      } catch (error) {
        if (String(error).includes('UNIQUE constraint failed')) return sendJson(response, 409, { error: 'An active API key with this name already exists.' })
        throw error
      }

      return sendJson(response, 201, {
        key: { id, workspaceId, name: validated.name, access: validated.access, permission: validated.permission, prefix, lastFour, createdAt: createdAt.toISOString(), lastUsedAt: null, expiresAt, revokedAt: null, status: 'active' },
        secret,
      })
    }

    const revokeMatch = request.method === 'DELETE' && url.pathname.match(/^\/api\/keys\/([^/]+)$/)
    if (revokeMatch) {
      const result = revokeKey.run(new Date().toISOString(), decodeURIComponent(revokeMatch[1]), identity.userId, workspaceId)
      if (result.changes === 0) return sendJson(response, 404, { error: 'Active API key not found.' })
      return sendJson(response, 200, { revoked: true })
    }

    return sendJson(response, 404, { error: 'Not found' })
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { error: 'Request body is too large.' })
    if (error.message === 'INVALID_JSON') return sendJson(response, 400, { error: 'Invalid JSON.' })
    console.error(error)
    return sendJson(response, 500, { error: 'Internal server error.' })
  }
})

server.listen(port, host, () => {
  console.log(`Beam API listening at http://${host}:${port}`)
  console.log(`SQLite database: ${databasePath}`)
  if (!process.env.BEAM_API_KEY_PEPPER) console.warn('Using the local development API-key pepper. Set BEAM_API_KEY_PEPPER outside local development.')
})

const shutdown = () => server.close(() => { database.close(); process.exit(0) })
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
