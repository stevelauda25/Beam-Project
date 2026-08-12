import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

type Permission = 'Admin' | 'Write'
type ApiKey = {
  id: number
  name: string
  access: string
  permission: Permission
  created: string
  lastUsed: string
  expires: string
  value: string
}

const apiIcons = {
  chevron: '/assets/api-chevron.svg',
  plus: '/assets/api-permission-admin.svg',
  admin: '/assets/api-more.svg',
  write: '/assets/api-permission-write.svg',
  more: '/assets/api-expires-chevron.svg',
  copy: '/assets/api-copy.svg',
} as const

const INITIAL_KEYS: ApiKey[] = [
  { id: 1, name: 'Production App', access: 'All workspaces', permission: 'Admin', created: 'Aug 12, 2026', lastUsed: 'Never used', expires: 'No expiry', value: 'fmd_live_R7q-Hm2K9TUaJp4Xc8vL1nQzE6YsB0Wd' },
  { id: 2, name: 'CI Pipeline', access: 'Marketing ws', permission: 'Write', created: 'Aug 12, 2026', lastUsed: '2 hours ago', expires: '90 days', value: 'fmd_live_A3x-Nk8P5QVrL2tJ7mC9uHsF4YeZ1Gb' },
  { id: 3, name: 'Claude Agent', access: 'Docs workspace', permission: 'Admin', created: 'Aug 11, 2026', lastUsed: 'Yesterday', expires: '30 days', value: 'fmd_live_T9v-Kq4M8XUaR1pL6nD3sJhE7YcW2Bz' },
]

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)))
  const fieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [isOpen])

  const chooseOption = (option: string) => {
    onChange(option)
    setActiveIndex(options.indexOf(option))
    setIsOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { setIsOpen(false); return }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) chooseOption(options[activeIndex])
      else setIsOpen(true)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) => event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length)
    }
  }

  return (
    <div className={`apiSelect apiSelect${label.replace(' ', '')}${isOpen ? ' open' : ''}`} ref={fieldRef}>
      <button className="apiSelectTrigger" type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} onKeyDown={handleKeyDown}>
        <span className={value ? '' : 'placeholder'}>{value || label}</span>
        <img src={apiIcons.chevron} alt="" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="apiSelectMenu" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button className={`${value === option ? 'selected' : ''}${activeIndex === index ? ' focused' : ''}`} type="button" role="option" aria-selected={value === option} key={option} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseOption(option)}>
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
  const [access, setAccess] = useState('')
  const [permission, setPermission] = useState('')
  const [expires, setExpires] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [createdKeyName, setCreatedKeyName] = useState<string | null>(null)
  const createdToastTimerRef = useRef<number | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (createdToastTimerRef.current !== null) window.clearTimeout(createdToastTimerRef.current)
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
  }, [])

  const createKey = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !access || !permission || !expires) return
    const newKeyName = name.trim()
    setKeys((current) => [...current, {
      id: Date.now(), name: newKeyName, access, permission: permission as Permission,
      created: 'Aug 12, 2026', lastUsed: 'Never used', expires,
      value: `fmd_live_${crypto.randomUUID().replaceAll('-', '').slice(0, 36)}`,
    }])
    setName(''); setAccess(''); setPermission(''); setExpires('')
    setCreatedKeyName(newKeyName)
    if (createdToastTimerRef.current !== null) window.clearTimeout(createdToastTimerRef.current)
    createdToastTimerRef.current = window.setTimeout(() => setCreatedKeyName(null), 3000)
  }

  const copyKey = async (key: ApiKey) => {
    try {
      await navigator.clipboard.writeText(key.value)
      setCopiedId(key.id)
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => setCopiedId(null), 1400)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <section className="apiKeysPage" aria-labelledby="api-keys-title">
      <h1 id="api-keys-title">API Keys</h1>
      <form className="apiKeyForm" onSubmit={createKey}>
        <div className="apiKeyFields">
          <label className="apiNameField">
            <span className="srOnly">API key name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter the name" />
          </label>
          <SelectField label="Access" value={access} options={['All workspaces', 'Marketing ws', 'Docs workspace']} onChange={setAccess} />
          <SelectField label="Permission" value={permission} options={['Admin', 'Write']} onChange={setPermission} />
          <SelectField label="Expires" value={expires} options={['No expiry', '30 days', '90 days']} onChange={setExpires} />
          <button className="createApiKey" type="submit" disabled={!name.trim() || !access || !permission || !expires}>
            <img src={apiIcons.plus} alt="" aria-hidden="true" />Create API Key
          </button>
        </div>
        <p>Create an API key for apps, scripts, or agents. The full key is shown only once.</p>
      </form>

      <div className="apiTable" role="table" aria-label="API keys">
        <div className="apiTableRow apiTableHead" role="row">
          {['Name', 'Access', 'Permission', 'Created', 'Last used', 'Expires', ''].map((heading, index) => <div role="columnheader" key={`${heading}-${index}`}>{heading}</div>)}
        </div>
        {keys.map((key) => (
          <div className="apiKeyRecord" role="rowgroup" key={key.id}>
            <div className="apiTableRow apiKeySummary" role="row">
              <div role="cell">{key.name}</div>
              <div role="cell">{key.access}</div>
              <div role="cell" className={`apiPermission ${key.permission.toLowerCase()}`}><img src={key.permission === 'Admin' ? apiIcons.admin : apiIcons.write} alt="" />{key.permission}</div>
              <div role="cell">{key.created}</div>
              <div role="cell" className={key.lastUsed === 'Never used' ? 'apiMuted' : ''}>{key.lastUsed}</div>
              <div role="cell">{key.expires}</div>
              <div role="cell" className="apiMenuCell">
                <button type="button" aria-label={`Actions for ${key.name}`} aria-expanded={openMenuId === key.id} onClick={() => setOpenMenuId((current) => current === key.id ? null : key.id)}><img src={apiIcons.more} alt="" /></button>
                {openMenuId === key.id && <div className="apiRowMenu"><button type="button" onClick={() => { setKeys((current) => current.filter((item) => item.id !== key.id)); setOpenMenuId(null) }}>Revoke key</button></div>}
              </div>
            </div>
            <div className="apiKeyValue" role="row">
              <div role="cell">
                <span>{key.value}</span>
                <span className="apiCopyControl">
                  <button type="button" onClick={() => copyKey(key)} aria-label={`Copy ${key.name} API key`}><img src={apiIcons.copy} alt="" /></button>
                  {copiedId === key.id && <span className="copyNotice" role="status">Link-copied</span>}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {createdKeyName && (
        <div className="apiCreatedToast" role="status" aria-live="polite">
          <span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span>
          <div><strong>API key created</strong><span>{createdKeyName} was created successfully.</span></div>
        </div>
      )}
    </section>
  )
}
