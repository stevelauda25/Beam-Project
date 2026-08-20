import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react'

type Permission = 'Admin' | 'Write'
type ApiKeyStatus = 'active' | 'expiring-soon' | 'expired' | 'revoked'
type ApiKey = {
  id: number
  name: string
  access: string
  permission: Permission
  createdAt: string
  lastUsed: string
  expiresAt: string | null
  prefix: string
  lastFour: string
  revokedAt?: string | null
}

const apiIcons = {
  chevron: '/assets/api-chevron.svg',
  plus: '/assets/api-permission-admin.svg',
  admin: '/assets/api-more.svg',
  write: '/assets/api-permission-write.svg',
  more: '/assets/api-expires-chevron.svg',
  copy: '/assets/api-copy.svg',
  show: '/assets/api-show.svg',
  hide: '/assets/api-hide.svg',
  bannerShow: '/assets/api-banner-show.svg',
  bannerCopy: '/assets/api-banner-copy.svg',
  close: '/assets/file-activity-close.svg',
} as const

const maskKey = (key: Pick<ApiKey, 'prefix' | 'lastFour'>) => `${key.prefix}••••••••${key.lastFour}`
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatDate = (value: string) => dateFormatter.format(new Date(value))
const calculateExpiry = (duration: string, createdAt: Date) => {
  if (duration === 'No expiry') return null
  const durationDays = Number.parseInt(duration, 10)
  return new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
}
const getKeyStatus = (key: ApiKey, now = Date.now()): ApiKeyStatus => {
  if (key.revokedAt) return 'revoked'
  if (!key.expiresAt) return 'active'
  const expiresAt = Date.parse(key.expiresAt)
  if (expiresAt <= now) return 'expired'
  if (expiresAt - now <= 7 * 24 * 60 * 60 * 1000) return 'expiring-soon'
  return 'active'
}
const statusLabel: Record<ApiKeyStatus, string> = {
  active: 'Active',
  'expiring-soon': 'Expiring soon',
  expired: 'Expired',
  revoked: 'Revoked',
}
const normalizeKeyName = (value: string) => value.trim().replace(/\s+/g, ' ')
const validateKeyName = (value: string, keys: ApiKey[]) => {
  const normalizedName = normalizeKeyName(value)
  if (!normalizedName) return 'Enter an API key name.'
  if (normalizedName.length < 3) return 'Name must contain at least 3 characters.'
  if (normalizedName.length > 64) return 'Name cannot exceed 64 characters.'
  if (!/^[\p{L}\p{N} ._()-]+$/u.test(normalizedName)) return 'Name contains unsupported characters.'
  if (keys.some((key) => normalizeKeyName(key.name).toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) return `An API key named “${normalizedName}” already exists.`
  return null
}

// Replace this boundary with the backend revocation request when the API is connected.
const requestKeyRevocation = async (_keyId: number) => {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 650))
}

const INITIAL_KEYS: ApiKey[] = [
  { id: 1, name: 'Production App', access: 'All workspaces', permission: 'Admin', createdAt: '2026-08-12T00:00:00.000Z', lastUsed: 'Never used', expiresAt: null, prefix: 'fmd_live_', lastFour: 'B0Wd' },
  { id: 2, name: 'CI Pipeline', access: 'Marketing ws', permission: 'Write', createdAt: '2026-08-12T00:00:00.000Z', lastUsed: '2 hours ago', expiresAt: '2026-11-10T00:00:00.000Z', prefix: 'fmd_live_', lastFour: 'Z1Gb' },
  { id: 3, name: 'Claude Agent', access: 'Docs workspace', permission: 'Admin', createdAt: '2026-08-11T00:00:00.000Z', lastUsed: 'Yesterday', expiresAt: '2026-09-10T00:00:00.000Z', prefix: 'fmd_live_', lastFour: 'W2Bz' },
]

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)))
  const fieldRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef({ value: '', timer: 0 })
  const listboxId = useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [isOpen])

  useEffect(() => () => window.clearTimeout(searchRef.current.timer), [])

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.indexOf(value)))
    setIsOpen(true)
  }

  const chooseOption = (option: string) => {
    onChange(option)
    setActiveIndex(options.indexOf(option))
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault()
        setIsOpen(false)
        window.requestAnimationFrame(() => triggerRef.current?.focus())
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) chooseOption(options[activeIndex])
      else openMenu()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) openMenu()
      setActiveIndex((current) => event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (!isOpen) openMenu()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }
    if (event.key === 'Tab') {
      setIsOpen(false)
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      window.clearTimeout(searchRef.current.timer)
      const query = `${searchRef.current.value}${event.key}`.toLocaleLowerCase()
      searchRef.current.value = query
      searchRef.current.timer = window.setTimeout(() => { searchRef.current.value = '' }, 700)
      const startIndex = isOpen ? activeIndex + 1 : 0
      const matchIndex = options.findIndex((_, offset) => options[(startIndex + offset) % options.length].toLocaleLowerCase().startsWith(query))
      if (matchIndex >= 0) {
        const nextIndex = (startIndex + matchIndex) % options.length
        if (!isOpen) setIsOpen(true)
        setActiveIndex(nextIndex)
      }
    }
  }

  return (
    <div className={`apiSelect apiSelect${label.replace(' ', '')}${isOpen ? ' open' : ''}`} ref={fieldRef}>
      <button ref={triggerRef} className="apiSelectTrigger" type="button" aria-label={`${label}: ${value || 'not selected'}`} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={listboxId} aria-activedescendant={isOpen ? optionId(activeIndex) : undefined} onClick={() => isOpen ? setIsOpen(false) : openMenu()} onKeyDown={handleKeyDown}>
        <span className={value ? '' : 'placeholder'}>{value || label}</span>
        <img src={apiIcons.chevron} alt="" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="apiSelectMenu" id={listboxId} role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button id={optionId(index)} className={`${value === option ? 'selected' : ''}${activeIndex === index ? ' focused' : ''}`} type="button" role="option" aria-selected={value === option} key={option} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseOption(option)}>
              <span>{option}</span>{value === option && <img src="/assets/download-success.svg" alt="" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS)
  const [name, setName] = useState('')
  const [isNameTouched, setIsNameTouched] = useState(false)
  const [access, setAccess] = useState('')
  const [permission, setPermission] = useState('')
  const [expires, setExpires] = useState('')
  const [createdKey, setCreatedKey] = useState<{ name: string; value: string } | null>(null)
  const [isCreatedKeyVisible, setIsCreatedKeyVisible] = useState(false)
  const [createdCopyFeedback, setCreatedCopyFeedback] = useState<'success' | 'failure' | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [revokedKeyName, setRevokedKeyName] = useState<string | null>(null)
  const [createdKeyName, setCreatedKeyName] = useState<string | null>(null)
  const createdToastTimerRef = useRef<number | null>(null)
  const copiedTimerRef = useRef<number | null>(null)
  const createdKeyTextRef = useRef<HTMLSpanElement>(null)
  const revokedToastTimerRef = useRef<number | null>(null)
  const copiedKeyTimerRef = useRef<number | null>(null)
  const normalizedName = normalizeKeyName(name)
  const nameError = validateKeyName(name, keys)
  const isFormValid = !createdKey && !nameError && Boolean(access && permission && expires)

  useEffect(() => () => {
    if (createdToastTimerRef.current !== null) window.clearTimeout(createdToastTimerRef.current)
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
    if (revokedToastTimerRef.current !== null) window.clearTimeout(revokedToastTimerRef.current)
    if (copiedKeyTimerRef.current !== null) window.clearTimeout(copiedKeyTimerRef.current)
  }, [])

  useEffect(() => {
    if (!keyToRevoke) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !isRevoking) { setKeyToRevoke(null); setRevokeError(null) }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [keyToRevoke, isRevoking])

  const createKey = (event: FormEvent) => {
    event.preventDefault()
    setIsNameTouched(true)
    if (!isFormValid) return
    const newKeyName = normalizedName
    const createdAt = new Date()
    const value = `fmd_live_${crypto.randomUUID().replaceAll('-', '').slice(0, 36)}`
    setKeys((current) => [...current, {
      id: Date.now(), name: newKeyName, access, permission: permission as Permission,
      createdAt: createdAt.toISOString(), lastUsed: 'Never used', expiresAt: calculateExpiry(expires, createdAt),
      prefix: 'fmd_live_', lastFour: value.slice(-4),
    }])
    setName(''); setIsNameTouched(false); setAccess(''); setPermission(''); setExpires('')
    setCreatedKey({ name: newKeyName, value })
    setIsCreatedKeyVisible(true); setCreatedCopyFeedback(null)
    setCreatedKeyName(newKeyName)
    if (createdToastTimerRef.current !== null) window.clearTimeout(createdToastTimerRef.current)
    createdToastTimerRef.current = window.setTimeout(() => setCreatedKeyName(null), 3000)
  }

  const copyCreatedKey = async () => {
    if (!createdKey) return
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
    try {
      await navigator.clipboard.writeText(createdKey.value)
      setCreatedCopyFeedback('success')
      copiedTimerRef.current = window.setTimeout(() => setCreatedCopyFeedback(null), 2200)
      return
    } catch {
      setIsCreatedKeyVisible(true)
      setCreatedCopyFeedback('failure')
      window.requestAnimationFrame(() => {
        const keyText = createdKeyTextRef.current
        const selection = window.getSelection()
        if (!keyText || !selection) return
        const range = document.createRange()
        range.selectNodeContents(keyText)
        selection.removeAllRanges()
        selection.addRange(range)
      })
    }
    copiedTimerRef.current = window.setTimeout(() => setCreatedCopyFeedback(null), 2200)
  }

  const copyKeyReference = async (key: ApiKey) => {
    if (copiedKeyTimerRef.current !== null) window.clearTimeout(copiedKeyTimerRef.current)
    try {
      await navigator.clipboard.writeText(maskKey(key))
      setCopiedKeyId(key.id)
      copiedKeyTimerRef.current = window.setTimeout(() => setCopiedKeyId(null), 2200)
    } catch {
      setCopiedKeyId(null)
    }
  }

  const revokeKey = async () => {
    if (!keyToRevoke) return
    const keyBeingRevoked = keyToRevoke
    setIsRevoking(true)
    setRevokeError(null)
    try {
      await requestKeyRevocation(keyBeingRevoked.id)
      setKeys((current) => current.map((item) => item.id === keyBeingRevoked.id ? { ...item, revokedAt: new Date().toISOString() } : item))
      setKeyToRevoke(null)
      setRevokedKeyName(keyBeingRevoked.name)
      if (revokedToastTimerRef.current !== null) window.clearTimeout(revokedToastTimerRef.current)
      revokedToastTimerRef.current = window.setTimeout(() => setRevokedKeyName(null), 3000)
    } catch {
      setRevokeError('The API key could not be revoked. Check your connection and try again.')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <section className="apiKeysPage" aria-labelledby="api-keys-title">
      <h1 id="api-keys-title">API Keys</h1>
      <form className="apiKeyForm" onSubmit={createKey}>
        <div className="apiKeyFields">
          <label className="apiNameField">
            <span className="srOnly">API key name</span>
            <input value={name} spellCheck={false} autoCapitalize="none" onChange={(event) => setName(event.target.value)} onBlur={() => setIsNameTouched(true)} placeholder="Enter the name" aria-invalid={isNameTouched && Boolean(nameError)} aria-describedby="api-key-name-feedback" />
          </label>
          <SelectField label="Access" value={access} options={['All workspaces', 'Marketing ws', 'Docs workspace']} onChange={setAccess} />
          <SelectField label="Permission" value={permission} options={['Admin', 'Write']} onChange={setPermission} />
          <SelectField label="Expires" value={expires} options={['No expiry', '30 days', '90 days']} onChange={setExpires} />
          <button className="createApiKey" type="submit" disabled={!isFormValid}>
            <img src={apiIcons.plus} alt="" aria-hidden="true" />Create API Key
          </button>
        </div>
        <div className="apiKeyHint" id="api-key-name-feedback"><span className={isNameTouched && nameError ? 'apiNameError' : ''} role={isNameTouched && nameError ? 'alert' : undefined}>{isNameTouched && nameError ? nameError : 'Create an API key for apps, scripts, or agents. The full key is shown only once.'}</span></div>
      </form>

      {createdKey && (
        <section className="apiCreationBanner" aria-labelledby="created-api-key-title" aria-describedby="created-api-key-warning" aria-live="polite">
          <div className="apiCreationBannerIntro" id="created-api-key-warning"><div><strong id="created-api-key-title">Copy this API key now</strong><span>You won’t be able to view it again after dismissing this banner.</span></div></div>
          <div className="apiCreationKeyWrap">
            <div className="apiCreatedKeyField">
              <span ref={createdKeyTextRef}>{isCreatedKeyVisible ? createdKey.value : maskKey({ prefix: 'fmd_live_', lastFour: createdKey.value.slice(-4) })}</span>
              <button type="button" onClick={() => setIsCreatedKeyVisible((visible) => !visible)} aria-label={isCreatedKeyVisible ? 'Hide API key' : 'Show API key'} aria-pressed={isCreatedKeyVisible}><img className={isCreatedKeyVisible ? 'apiBannerHideIcon' : ''} src={isCreatedKeyVisible ? apiIcons.hide : apiIcons.bannerShow} alt="" /></button>
              <span className="apiCopyControl"><button type="button" onClick={() => void copyCreatedKey()} aria-label="Copy API key"><img src={apiIcons.bannerCopy} alt="" /></button>{createdCopyFeedback && <span className={`copyNotice${createdCopyFeedback === 'failure' ? ' failure' : ''}`} role={createdCopyFeedback === 'failure' ? 'alert' : 'status'}>{createdCopyFeedback === 'success' ? 'API key copied' : 'Copy failed — press ⌘C or Ctrl+C'}</span>}</span>
            </div>
          </div>
        </section>
      )}
      {keys.length === 0 ? (
        <section className="apiKeysEmptyState" aria-labelledby="api-keys-empty-title" aria-describedby="api-keys-empty-description">
          <img src="/assets/api-keys-empty.svg" width="229" height="288" alt="" aria-hidden="true" />
          <div>
            <h2 id="api-keys-empty-title">No API keys yet</h2>
            <p id="api-keys-empty-description">Create your first API key to connect apps, scripts, or agents to Beam.</p>
          </div>
        </section>
      ) : <div className="apiTable" role="table" aria-label="API keys">
        <div className="apiTableRow apiTableHead" role="row">
          {['Name', 'Access', 'Permission', 'Created', 'Last used', 'Expires', 'Status', ''].map((heading, index) => <div role="columnheader" key={`${heading}-${index}`}>{heading}</div>)}
        </div>
        {keys.map((key) => {
          const status = getKeyStatus(key)
          const canRevoke = status === 'active' || status === 'expiring-soon'
          return (
          <div className="apiKeyRecord" role="rowgroup" key={key.id}>
            <div className="apiTableRow apiKeySummary" role="row">
              <div role="cell">{key.name}</div>
              <div role="cell">{key.access}</div>
              <div role="cell" className={`apiPermission ${key.permission.toLowerCase()}`}><img src={key.permission === 'Admin' ? apiIcons.admin : apiIcons.write} alt="" />{key.permission}</div>
              <div role="cell">{formatDate(key.createdAt)}</div>
              <div role="cell" className={key.lastUsed === 'Never used' ? 'apiMuted' : ''}>{key.lastUsed}</div>
              <div role="cell">{key.expiresAt ? formatDate(key.expiresAt) : 'No expiry'}</div>
              <div role="cell"><span className={`apiStatusBadge ${status}`}>{statusLabel[status]}</span></div>
              <div role="cell" className="apiMenuCell">
                <button type="button" disabled={!canRevoke} aria-label={canRevoke ? `Actions for ${key.name}` : `${key.name} is ${statusLabel[status].toLowerCase()}`} aria-expanded={openMenuId === key.id} onClick={() => setOpenMenuId((current) => current === key.id ? null : key.id)}><img src={apiIcons.more} alt="" /></button>
                {openMenuId === key.id && <div className="apiRowMenu"><button type="button" onClick={() => { setKeyToRevoke(key); setOpenMenuId(null) }}>Revoke key</button></div>}
              </div>
            </div>
            <div className="apiKeyValue" role="row">
              <div role="cell">
                <span className="apiKeyText">{maskKey(key)}</span>
                <span className="apiCopyControl">
                  <button type="button" onClick={() => void copyKeyReference(key)} aria-label={`Copy masked API key reference for ${key.name}`}><img src={apiIcons.copy} alt="" /></button>
                  {copiedKeyId === key.id && <span className="copyNotice" role="status">Key reference copied</span>}
                </span>
              </div>
            </div>
          </div>
          )
        })}
      </div>}
      {createdKeyName && (
        <div className="apiCreatedToast" role="status" aria-live="polite">
          <span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span>
          <div><strong>API key created</strong><span>{createdKeyName} was created successfully.</span></div>
        </div>
      )}
      {revokedKeyName && (
        <div className="apiCreatedToast apiRevokedToast" role="status" aria-live="polite">
          <span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span>
          <div><strong>API key revoked</strong><span>{revokedKeyName} was revoked successfully.</span></div>
        </div>
      )}
      {keyToRevoke && (
        <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isRevoking) { setKeyToRevoke(null); setRevokeError(null) } }}>
          <section className="newFolderModal apiRevokeModal" role="alertdialog" aria-modal="true" aria-labelledby="revoke-api-key-title" aria-describedby="revoke-api-key-description">
            <header><h2 id="revoke-api-key-title">Revoke API key</h2><button type="button" aria-label="Close revoke API key dialog" disabled={isRevoking} onClick={() => { setKeyToRevoke(null); setRevokeError(null) }}><img src={apiIcons.close} alt="" /></button></header>
            <div className="apiRevokeContent">
              <div><strong>Revoke “{keyToRevoke.name}”?</strong><p id="revoke-api-key-description">All apps, scripts, or agents connected with this key will stop working immediately. You’ll need to create a new key and update each integration.</p></div>
              {revokeError && <p className="apiRevokeError" role="alert">{revokeError}</p>}
              <div className="apiRevokeActions"><button type="button" disabled={isRevoking} onClick={() => { setKeyToRevoke(null); setRevokeError(null) }}>Cancel</button><button className="dangerModalButton" type="button" disabled={isRevoking} aria-busy={isRevoking} onClick={() => void revokeKey()}>{isRevoking ? 'Revoking…' : revokeError ? 'Try again' : 'Revoke key'}</button></div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
