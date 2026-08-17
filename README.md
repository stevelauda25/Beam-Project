# Beam App Project

React implementation of the Beam file-management interface.

## Requirements

- Node.js 22.12 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

## Local API backend

The API-key backend uses Node's built-in SQLite support. Copy `.env.example` to
`.env`, replace the development secrets, and run the backend in a second terminal:

```bash
npm run dev:api
```

The API listens at `http://127.0.0.1:8787`. Vite proxies `/api` and `/health`
to it during local development. The SQLite database is created at
`server/data/beam.sqlite` and is ignored by Git.

Local API requests require these headers:

```text
Authorization: Bearer beam-local-dev-token
X-Beam-User-Id: dev-user
X-Beam-Workspace-Id: personal
```

Available endpoints:

- `GET /health`
- `GET /api/keys`
- `POST /api/keys`
- `DELETE /api/keys/:id`

The complete API-key secret is returned only by `POST /api/keys`. SQLite stores
an HMAC hash plus the safe prefix and last four characters, never the secret.

## Production build

```bash
npm run build
npm run preview
```
