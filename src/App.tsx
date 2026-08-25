import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ApiKeysPage from './components/ApiKeysPage'
import SettingsPage from './components/SettingsPage'
import AccountProfilePage from './components/AccountProfilePage'
import BillingUsagePage from './components/BillingUsagePage'
import CreateWorkspacePage from './components/CreateWorkspacePage'
import UploadDemoOverlay from './components/UploadDemoOverlay'
import WorkspaceAvatar from './components/WorkspaceAvatar'
import { createStorageId, deleteStoredFile, getStoredFile, storeFile } from './utils/fileStorage'

const icons = {
  personal: '/assets/personal.svg',
  chevron: '/assets/chevron.svg',
  panel: '/assets/panel.svg',
  panelExpand: '/assets/panel-expand.svg',
  search: '/assets/search.svg',
  searchClear: '/assets/search-clear.svg',
  shortcut: '/assets/shortcut.svg',
  folder: '/assets/folder.svg',
  folderCreate: '/assets/folder-create.svg',
  folderCreateEnter: '/assets/folder-create-enter.svg',
  key: '/assets/key.svg',
  settings: '/assets/settings.svg',
  more: '/assets/more.svg',
  accountChevron: '/assets/account-chevron.svg',
  accountChevronCollapsed: '/assets/account-chevron-collapsed.svg',
  accountPlanArrow: '/assets/account-plan-arrow.svg',
  actionOpen: '/assets/action-open.svg',
  actionRename: '/assets/action-rename.svg',
  actionDelete: '/assets/action-delete.svg',
  orgCheck: '/assets/org-check.svg',
  companyAbc: '/assets/company-abc.svg',
  companyXyz: '/assets/company-xyz.svg',
  upload: '/assets/upload.svg',
  activityLine: '/assets/activity-line.svg',
  previewClose: '/assets/preview-close.svg',
  previewInfo: '/assets/preview-info.svg',
  previewCopy: '/assets/preview-copy.svg',
  previewShare: '/assets/preview-share.svg',
  copySuccess: '/assets/copy-success.svg',
  downloadSuccess: '/assets/download-success.svg',
  previewDownload: '/assets/preview-download.svg',
  previewRetry: '/assets/preview-retry.svg',
  viewList: '/assets/view-list-tabs.svg',
  viewGrid: '/assets/view-grid-tabs.svg',
  fileDocument: '/assets/file-document.svg',
  emptyFolders: '/assets/empty-folders.svg',
  emptyFiles: '/assets/empty-files.svg',
  paneHandle: '/assets/pane-handle.svg',
  metadataDivider: '/assets/metadata-divider.svg',
  dropFolder: '/assets/drop-folder.svg',
  fileActivityInfo: '/assets/file-activity-info.svg',
  fileActivityClose: '/assets/file-activity-close.svg',
  avatar: '/assets/avatar.png',
} as const

type Folder = { name: string; count: number; active?: boolean }
type FileKind = 'folder' | 'file'
type FileRow = { name: string; size: string; modified: string; badge?: string; kind: FileKind; folderName?: string; path?: string }
type AppView = 'home' | 'folder' | 'apiKeys' | 'settings' | 'account' | 'billing'
type AppearanceTheme = 'light' | 'dark' | 'system'
const accountEmail = 'michele@beam.app'
const readAccountName = () => window.localStorage.getItem('beam-account-display-name') || 'Michele J.'

const readAppearanceTheme = (): AppearanceTheme => {
  const saved = window.localStorage.getItem('beam-appearance-theme')
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

const applyAppearanceTheme = (theme: AppearanceTheme) => {
  const resolvedTheme = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
}

const folders: Folder[] = [
  { name: 'Folder 001', count: 4, active: true },
  { name: 'Product Resources', count: 3 },
  { name: 'Website Assets', count: 3 },
]

const files: FileRow[] = [
  { name: 'Folder 001', size: '2.4KB', modified: '5 days ago', badge: 'Starter', kind: 'folder' },
  { name: 'Product Resources', size: '856MB', modified: '5 days ago', kind: 'folder' },
  { name: 'Website Assets', size: '420MB', modified: '6 days ago', kind: 'folder' },
]

type FolderFile = { name: string; kind: string; size: string; modified: string; previewAvailable?: boolean; storageId?: string; mimeType?: string }
type CopyFeedback = { status: 'success' | 'failure'; fileName: string } | null
type DownloadFeedback = { status: 'success' | 'failure'; file: FolderFile } | null
type FolderActivityAction = 'Viewed' | 'Uploaded' | 'Downloaded' | 'Shared' | 'Deleted'
type FolderActivity = { id: string; action: FolderActivityAction; fileName: string; actor: string; createdAt: number }
type ShareRole = 'Viewer' | 'Editor'
type ShareLinkAccess = 'restricted' | 'viewer' | 'editor'
type ShareMember = { id: string; name: string; email: string; role: ShareRole }
type FileShareSettings = { members: ShareMember[]; linkAccess: ShareLinkAccess; token: string; demoSeedVersion?: number }
const demoShareMembers: ShareMember[] = [
  { id: 'demo-james', name: 'James T.', email: 'james@beam.app', role: 'Editor' },
  { id: 'demo-aisha', name: 'Aisha R.', email: 'aisha@beam.app', role: 'Viewer' },
  { id: 'demo-daniel', name: 'Daniel K.', email: 'daniel@beam.app', role: 'Viewer' },
]

function loadFileShares(storageKey: string): Record<string, FileShareSettings> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).flatMap(([fileName, value]) => {
      if (!value || typeof value !== 'object') return []
      const candidate = value as Partial<FileShareSettings>
      const members = Array.isArray(candidate.members) ? candidate.members.filter((member): member is ShareMember => Boolean(member && typeof member.id === 'string' && typeof member.name === 'string' && typeof member.email === 'string' && (member.role === 'Viewer' || member.role === 'Editor'))) : []
      const linkAccess = candidate.linkAccess === 'viewer' || candidate.linkAccess === 'editor' ? candidate.linkAccess : 'restricted'
      return [[fileName, { members, linkAccess, token: typeof candidate.token === 'string' ? candidate.token : '', demoSeedVersion: typeof candidate.demoSeedVersion === 'number' ? candidate.demoSeedVersion : 0 }]]
    }))
  } catch { return {} }
}

const initialFolderFiles: FolderFile[] = [
  { name: 'backup-prompt.md', kind: 'md', size: '869B', modified: '4 days ago' },
  { name: 'folder.md', kind: 'md', size: '869B', modified: '5 days ago' },
  { name: 'getting-started.md', kind: 'md', size: '278B', modified: '5 days ago' },
  { name: 'organize-thoughts-prompt.md', kind: 'md', size: '253B', modified: '6 days ago' },
]

const initialFolderContents: Record<string, FolderFile[]> = {
  'Folder 001': initialFolderFiles,
  'Product Resources': [
    { name: 'brand-guidelines.pdf', kind: 'pdf', size: '42MB', modified: '2 days ago' },
    { name: 'product-image.png', kind: 'png', size: '38MB', modified: '3 days ago' },
    { name: 'release-notes.md', kind: 'md', size: '56MB', modified: '5 days ago' },
  ],
  'Website Assets': [
    { name: 'homepage-hero.webp', kind: 'webp', size: '24MB', modified: '1 day ago' },
    { name: 'campaign-image.jpg', kind: 'jpg', size: '15MB', modified: '4 days ago' },
    { name: 'logo-mark.png', kind: 'png', size: '3MB', modified: '6 days ago' },
  ],
}

type WorkspaceContent = { folders: Folder[]; files: FileRow[]; folderContents: Record<string, FolderFile[]> }
type MutationNotice = { state: 'saving' | 'success' | 'error'; label: string } | null
const populatedWorkspaceContent = (): WorkspaceContent => ({
  folders: folders.map((folder) => ({ ...folder })),
  files: files.map((file) => ({ ...file })),
  folderContents: Object.fromEntries(Object.entries(initialFolderContents).map(([name, items]) => [name, items.map((item) => ({ ...item }))])),
})
const initialWorkspaceContent: Record<string, WorkspaceContent> = {
  personal: populatedWorkspaceContent(),
  'company-abc': { folders: [], files: [], folderContents: {} },
  'company-xyz': populatedWorkspaceContent(),
}

const readWorkspaceContent = (): Record<string, WorkspaceContent> => {
  try {
    const saved = JSON.parse(window.localStorage.getItem('beam-workspace-content-v1') ?? '{}') as Record<string, WorkspaceContent>
    const content = { ...initialWorkspaceContent, ...saved }
    const personal = content.personal ?? populatedWorkspaceContent()
    const hasStarterFolder = personal.folders.some((folder) => folder.name === 'Folder 001')
    if (!hasStarterFolder) {
      content.personal = {
        folders: [{ ...folders[0] }, ...personal.folders],
        files: [{ ...files[0] }, ...personal.files],
        folderContents: { ...personal.folderContents, 'Folder 001': initialFolderFiles.map((file) => ({ ...file })) },
      }
    }
    return content
  } catch { return initialWorkspaceContent }
}

const readWorkspaceBehavior = (workspaceId: string) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`beam-settings-v3-${workspaceId}`) ?? '{}') as { defaultView?: string; confirmDelete?: boolean; trashRetention?: string }
    return { defaultView: saved.defaultView === 'Grid' ? 'grid' as const : 'list' as const, confirmDelete: saved.confirmDelete ?? true, trashRetention: saved.trashRetention ?? '30 days' }
  } catch { return { defaultView: 'list' as const, confirmDelete: true, trashRetention: '30 days' } }
}

type WorkspaceRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer'
type Workspace = { id: string; name: string; icon: string; role: WorkspaceRole }

const initialWorkspaces: Workspace[] = [
  { id: 'personal', name: 'Personal', icon: icons.avatar, role: 'Owner' },
  { id: 'company-abc', name: 'Company ABC', icon: icons.companyAbc, role: 'Owner' },
  { id: 'company-xyz', name: 'Company XYZ', icon: icons.companyXyz, role: 'Viewer' },
]

const readWorkspaces = () => [...initialWorkspaces, ...(() => { try { return JSON.parse(window.localStorage.getItem('beam-created-workspaces-v1') ?? '[]') as Workspace[] } catch { return [] } })()].map((workspace) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`beam-settings-v3-${workspace.id}`) ?? '{}') as { workspaceName?: string }
    return saved.workspaceName ? { ...workspace, name: saved.workspaceName } : workspace
  } catch { return workspace }
})

function Icon({ src }: { src: string }) {
  return <img className="icon" src={src} alt="" aria-hidden="true" />
}

type SidebarProps = {
  workspaces: Workspace[]
  activeWorkspace: Workspace
  onWorkspaceChange: (workspaceId: string) => void
  onCreateWorkspace: () => void
  canEditWorkspace: boolean
  accountName: string
  folders: Folder[]
  activeFolderName: string
  isCollapsed: boolean
  isSearching: boolean
  searchQuery: string
  onToggle: () => void
  onStartSearch: () => void
  onSearchChange: (query: string) => void
  onOpenFolder: (name: string) => void
  onCreateFolder: (name: string) => void
  isApiKeysActive: boolean
  onOpenApiKeys: () => void
  isSettingsActive: boolean
  isFolderNavigationActive: boolean
  onOpenSettings: () => void
  onOpenAccount: () => void
  onOpenBilling: () => void
}

function Sidebar({ workspaces, activeWorkspace, onWorkspaceChange, onCreateWorkspace, canEditWorkspace, accountName, folders: sidebarFolders, activeFolderName, isCollapsed, isSearching, searchQuery, onToggle, onStartSearch, onSearchChange, onOpenFolder, onCreateFolder, isApiKeysActive, onOpenApiKeys, isSettingsActive, isFolderNavigationActive, onOpenSettings, onOpenAccount, onOpenBilling }: SidebarProps) {
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false)
  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(readAppearanceTheme)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderCreateError, setFolderCreateError] = useState('')
  const [folderCreateSuccess, setFolderCreateSuccess] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const newFolderRowRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null)
  const [focusedWorkspaceIndex, setFocusedWorkspaceIndex] = useState(() => Math.max(0, workspaces.findIndex((workspace) => workspace.id === activeWorkspace.id)))
  const folderSuccessTimer = useRef<number | null>(null)

  useEffect(() => {
    if (isNewFolderOpen) newFolderInputRef.current?.focus()
  }, [isNewFolderOpen])

  useEffect(() => {
    if (!isNewFolderOpen) return
    const closeEmptyEntry = (event: MouseEvent) => {
      if (!newFolderName.trim() && !newFolderRowRef.current?.contains(event.target as Node)) closeFolderEntry()
    }
    document.addEventListener('mousedown', closeEmptyEntry)
    return () => document.removeEventListener('mousedown', closeEmptyEntry)
  }, [isNewFolderOpen, newFolderName])

  useEffect(() => () => { if (folderSuccessTimer.current !== null) window.clearTimeout(folderSuccessTimer.current) }, [])

  const closeFolderEntry = () => { setIsNewFolderOpen(false); setNewFolderName(''); setFolderCreateError('') }
  const submitNewFolder = () => {
    const name = newFolderName.trim()
    if (!name) { setFolderCreateError('Enter a folder name'); return }
    if (sidebarFolders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) { setFolderCreateError('A folder with this name already exists'); return }
    onCreateFolder(name)
    closeFolderEntry()
    setFolderCreateSuccess(name)
    if (folderSuccessTimer.current !== null) window.clearTimeout(folderSuccessTimer.current)
    folderSuccessTimer.current = window.setTimeout(() => setFolderCreateSuccess(''), 3000)
  }

  useEffect(() => {
    if (!isOrgMenuOpen) return
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-org-menu]')) setIsOrgMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOrgMenuOpen(false)
        workspaceTriggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOrgMenuOpen])

  useEffect(() => {
    const activeIndex = workspaces.findIndex((workspace) => workspace.id === activeWorkspace.id)
    setFocusedWorkspaceIndex(Math.max(0, activeIndex))
  }, [activeWorkspace.id, workspaces])

  const focusWorkspaceOption = (index: number) => {
    const items = Array.from(workspaceMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], [role="menuitem"]') ?? [])
    if (!items.length) return
    const nextIndex = (index + items.length) % items.length
    setFocusedWorkspaceIndex(nextIndex)
    items[nextIndex].focus()
  }

  const handleWorkspaceMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const itemCount = workspaceMenuRef.current?.querySelectorAll('[role="menuitemradio"], [role="menuitem"]').length ?? 0
    if (!itemCount) return
    if (event.key === 'Home') focusWorkspaceOption(0)
    else if (event.key === 'End') focusWorkspaceOption(itemCount - 1)
    else focusWorkspaceOption(focusedWorkspaceIndex + (event.key === 'ArrowDown' ? 1 : -1))
  }

  const handleWorkspaceTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setIsAccountMenuOpen(false)
    setIsOrgMenuOpen(true)
    const activeIndex = Math.max(0, workspaces.findIndex((workspace) => workspace.id === activeWorkspace.id))
    requestAnimationFrame(() => focusWorkspaceOption(event.key === 'ArrowUp' ? workspaces.length : activeIndex))
  }

  useEffect(() => {
    if (!isAccountMenuOpen) return
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-account-menu]')) { setIsAccountMenuOpen(false); accountTriggerRef.current?.focus() }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isAppearanceMenuOpen) setIsAppearanceMenuOpen(false)
        else { setIsAccountMenuOpen(false); accountTriggerRef.current?.focus() }
      }
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAccountMenuOpen, isAppearanceMenuOpen])

  const handleAccountMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = Array.from(accountMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"], [role="menuitemradio"], .accountPlan') ?? []).filter((item) => !item.disabled)
    if (!items.length) return
    event.preventDefault()
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (currentIndex + 1) % items.length : (currentIndex - 1 + items.length) % items.length
    items[nextIndex].focus()
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncTheme = () => applyAppearanceTheme(appearanceTheme)
    syncTheme()
    window.localStorage.setItem('beam-appearance-theme', appearanceTheme)
    if (appearanceTheme !== 'system') return
    media.addEventListener('change', syncTheme)
    window.addEventListener('focus', syncTheme)
    window.addEventListener('pageshow', syncTheme)
    document.addEventListener('visibilitychange', syncTheme)
    return () => {
      media.removeEventListener('change', syncTheme)
      window.removeEventListener('focus', syncTheme)
      window.removeEventListener('pageshow', syncTheme)
      document.removeEventListener('visibilitychange', syncTheme)
    }
  }, [appearanceTheme])

  useEffect(() => {
    if (!isAccountMenuOpen) setIsAppearanceMenuOpen(false)
  }, [isAccountMenuOpen])

  return (
    <>
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      <div className="sidebarTop">
          <div className="workspaceRow">
            <div className="organizationControl" data-org-menu>
              <button ref={workspaceTriggerRef} className="workspaceName" onClick={() => { setIsAccountMenuOpen(false); setFocusedWorkspaceIndex(Math.max(0, workspaces.findIndex((workspace) => workspace.id === activeWorkspace.id))); setIsOrgMenuOpen((open) => !open) }} onKeyDown={handleWorkspaceTriggerKeyDown} aria-haspopup="menu" aria-expanded={isOrgMenuOpen}>
                {activeWorkspace.id === 'personal' ? <Icon src={icons.personal} /> : <span className="organizationAvatar"><Icon src={activeWorkspace.icon} /></span>}
                <span>{activeWorkspace.name}</span>
                <span className={`organizationChevron${isOrgMenuOpen ? ' open' : ''}`}><Icon src={icons.chevron} /></span>
              </button>
              <div ref={workspaceMenuRef} className={`organizationMenu${isOrgMenuOpen ? ' open' : ''}`} role="menu" aria-label="Organizations" aria-hidden={!isOrgMenuOpen} onKeyDown={handleWorkspaceMenuKeyDown}>
                  <div className="organizationGroup">
                    {workspaces.map((workspace, index) => {
                      const isActive = workspace.id === activeWorkspace.id
                      return (
                        <button
                          className={`organizationOption${isActive ? ' active' : ''}`}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isActive}
                          tabIndex={isOrgMenuOpen && focusedWorkspaceIndex === index ? 0 : -1}
                          key={workspace.id}
                          onFocus={() => setFocusedWorkspaceIndex(index)}
                          onClick={() => { onWorkspaceChange(workspace.id); setIsOrgMenuOpen(false) }}
                        >
                          {workspace.id === 'personal' ? <img className="avatar" src="/assets/workspace-menu-personal.png" alt="" /> : <span className="organizationAvatar"><img className="icon" src={workspace.id === 'company-xyz' ? '/assets/workspace-menu-xyz.svg' : '/assets/workspace-menu-abc.svg'} alt="" aria-hidden="true" /></span>}
                          <span>{workspace.name}</span>
                          {isActive && <img className="icon" src="/assets/workspace-menu-check.svg" alt="" aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                  <div className="accountGroup">
                    <button className="workspaceAddAction" type="button" role="menuitem" tabIndex={isOrgMenuOpen && focusedWorkspaceIndex === workspaces.length ? 0 : -1} onFocus={() => setFocusedWorkspaceIndex(workspaces.length)} onClick={() => { setIsOrgMenuOpen(false); onCreateWorkspace() }}><img src="/assets/workspace-menu-add.svg" alt="" aria-hidden="true" />Add new workspace</button>
                  </div>
                </div>
            </div>
            <button className="iconButton toggleButton" onClick={onToggle} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <Icon src={isCollapsed ? icons.panelExpand : icons.panel} />
            </button>
          </div>

        <div className="sidebarActions">
            <label className={`searchButton${isSearching ? ' searching' : ''}`} onClick={() => { if (isCollapsed) onStartSearch() }}>
              <Icon src={icons.search} />
              <input
                autoFocus={isSearching}
                value={searchQuery}
                spellCheck={false}
                autoCapitalize="none"
                placeholder="Search all files"
                aria-label="Search all files"
                onFocus={onStartSearch}
                onChange={(event) => {
                  if (event.target.value.trim()) closeFolderEntry()
                  onSearchChange(event.target.value)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !isSearching) return
                  event.preventDefault()
                  event.stopPropagation()
                  onSearchChange('')
                }}
              />
              {isSearching ? (
                <button type="button" className="clearSearch" aria-label="Clear search" onClick={() => onSearchChange('')}><Icon src={icons.searchClear} /></button>
              ) : null}
            </label>
          <button className="plainButton" aria-label={canEditWorkspace ? 'New folder' : 'New folder unavailable with Viewer access'} title={isCollapsed ? 'New folder' : undefined} disabled={isNewFolderOpen || !canEditWorkspace} onClick={() => { setIsOrgMenuOpen(false); setIsAccountMenuOpen(false); if (isCollapsed) onStartSearch(); if (isSearching) onSearchChange(''); setIsNewFolderOpen(true) }}>
            <Icon src={icons.folder} /><span className="sidebarLabel">New folder</span>
          </button>
        </div>

          <nav className={`folderList${isCollapsed || isSearching ? ' concealed' : ''}`} aria-label="Folders" aria-hidden={isCollapsed || isSearching}>
            {isNewFolderOpen && <div ref={newFolderRowRef} className={`folderCreateRow${folderCreateError ? ' invalid' : ''}`}><Icon src={icons.folderCreate} /><input ref={newFolderInputRef} value={newFolderName} maxLength={64} placeholder="Enter your folder name" spellCheck={false} autoCapitalize="none" aria-label="Folder name" aria-invalid={Boolean(folderCreateError)} aria-describedby={folderCreateError ? 'folder-create-error' : undefined} onChange={(event) => { setNewFolderName(event.target.value); setFolderCreateError('') }} onKeyDown={(event) => { if (event.key === 'Enter') submitNewFolder(); else if (event.key === 'Escape') closeFolderEntry() }} /><button type="button" aria-label="Create folder" onClick={submitNewFolder}><Icon src={icons.folderCreateEnter} /></button>{folderCreateError && <span id="folder-create-error" role="alert">{folderCreateError}</span>}</div>}
            {sidebarFolders.map((folder) => (
              <button className={`folderRow${isFolderNavigationActive && folder.name === activeFolderName ? ' active' : ''}`} key={folder.name} tabIndex={isCollapsed || isSearching ? -1 : 0} onClick={() => onOpenFolder(folder.name)}>
                <span>{folder.name}</span><span>{folder.count}</span>
              </button>
            ))}
          </nav>
      </div>

      <div className="sidebarBottom">
        <div className="utilityLinks">
          <button className={`plainButton${isApiKeysActive ? ' active' : ''}`} aria-label="API keys" title={isCollapsed ? 'API keys' : undefined} onClick={onOpenApiKeys}><Icon src={icons.key} /><span className="sidebarLabel">API keys</span></button>
          <button className={`plainButton${isSettingsActive ? ' active' : ''}`} aria-label="Settings" title={isCollapsed ? 'Settings' : undefined} onClick={onOpenSettings}><Icon src={icons.settings} /><span className="sidebarLabel">Settings</span></button>
        </div>
        <div className="accountControl" data-account-menu>
          {isAccountMenuOpen && (
            <div ref={accountMenuRef} className="accountMenu" role="menu" aria-label="Account menu" onKeyDown={handleAccountMenuKeyDown}>
              <header className="accountIdentity">
                <img src="/assets/account-menu-avatar.png" alt="" />
                <div><strong>{accountName}</strong><span>michele@beam.app</span></div>
              </header>
              <button className="accountPlan" type="button" role="menuitem" aria-label="Open Billing and usage, 1.2 GB of 5 GB used" onClick={() => { setIsAccountMenuOpen(false); onOpenBilling() }}>
                <div className="accountPlanHeading"><strong>Free plan</strong><span>24% used</span></div>
                <div className="accountUsageBody">
                  <div className="accountUsageTrack" aria-hidden="true"><span /></div>
                  <div className="accountUsageMeta"><span>1.2 GB of 5 GB</span><Icon src="/assets/account-menu-arrow.svg" /></div>
                </div>
              </button>
              <div className="accountMenuGroup">
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onOpenAccount() }}>Account settings</button>
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onOpenBilling() }}>Billing &amp; usage</button>
                <div className="appearanceMenuControl">
                  <button className={isAppearanceMenuOpen ? 'submenuOpen' : ''} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={isAppearanceMenuOpen} onClick={() => setIsAppearanceMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); setIsAppearanceMenuOpen(true); window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.appearanceSubmenu button')?.focus()) } }}>
                    <span className="appearanceMenuLabel">Appearance</span><span className="accountMenuValue">{appearanceTheme[0].toUpperCase() + appearanceTheme.slice(1)} <span aria-hidden="true">›</span></span>
                  </button>
                  {isAppearanceMenuOpen && <div className="appearanceSubmenu" role="menu" aria-label="Appearance theme">
                    {(['light', 'dark', 'system'] as const).map((theme) => <button className={appearanceTheme === theme ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={appearanceTheme === theme} key={theme} onClick={() => { applyAppearanceTheme(theme); setAppearanceTheme(theme); setIsAppearanceMenuOpen(false); setIsAccountMenuOpen(false); window.requestAnimationFrame(() => accountTriggerRef.current?.focus()) }}>
                      <img className="appearanceThemeIcon" src={`/assets/appearance-${theme}.svg`} alt="" aria-hidden="true" /><span>{theme[0].toUpperCase() + theme.slice(1)}</span>{appearanceTheme === theme && <span className="appearanceCheck" aria-hidden="true">✓</span>}
                    </button>)}
                  </div>}
                </div>
                <button type="button" role="menuitem" disabled title="Help and feedback is coming soon">Help &amp; feedback</button>
              </div>
              <div className="accountMenuGroup accountMenuFooter">
                <button type="button" role="menuitem" disabled title="Sign out is unavailable in this local prototype">Sign out</button>
              </div>
            </div>
          )}
          <button ref={accountTriggerRef} className={`accountRow${isAccountMenuOpen ? ' active' : ''}`} aria-label={`Open ${accountName} account menu`} aria-haspopup="menu" aria-expanded={isAccountMenuOpen} title={isCollapsed ? accountName : undefined} onClick={() => { setIsOrgMenuOpen(false); setIsAccountMenuOpen((open) => !open) }} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setIsAccountMenuOpen(true); window.requestAnimationFrame(() => { const items = accountMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'); items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus() }) } }}>
            <img className="avatar" src={icons.avatar} alt={accountName} />
            <span className="sidebarLabel">{accountName}</span>
            <span className={`accountChevronIcon${isAccountMenuOpen ? ' open' : ''}`}><Icon src={isCollapsed ? icons.accountChevronCollapsed : icons.accountChevron} /></span>
          </button>
        </div>
      </div>
    </aside>
    {folderCreateSuccess && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Folder created</strong><span>{folderCreateSuccess} was created successfully.</span></div></div>}
    </>
  )
}

function NewFolderModal({ existingNames, onCreate, onClose }: { existingNames: string[]; onCreate: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const submitFolder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (existingNames.some((existing) => existing.toLocaleLowerCase() === trimmedName.toLocaleLowerCase())) { setError('A folder with this name already exists.'); return }
    if (trimmedName) onCreate(trimmedName)
  }

  return (
    <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="newFolderModal" role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
        <header><h2 id="new-folder-title">Create new folder</h2><button type="button" aria-label="Close create folder dialog" onClick={onClose}><Icon src={icons.fileActivityClose} /></button></header>
        <form onSubmit={submitFolder}>
          <div className="folderLabelRow">
            <label htmlFor="new-folder-name">Folder name</label>
            <button className="addFolderButton" type="submit" disabled={!name.trim()}><Icon src={icons.folder} />Add folder</button>
          </div>
          <div className="folderNameField">
            <input id="new-folder-name" autoFocus aria-invalid={Boolean(error)} value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Untitled folder" />
            <span aria-hidden="true">Press Enter ↵</span>
          </div>
          {error && <p className="folderNameError" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  )
}

function RenameFolderModal({ currentName, existingNames, onRename, onClose }: { currentName: string; existingNames: string[]; onRename: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState('')
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="newFolderModal folderActionModal" role="dialog" aria-modal="true" aria-labelledby="rename-folder-title">
        <header><h2 id="rename-folder-title">Rename folder</h2><button type="button" aria-label="Close rename folder dialog" onClick={onClose}><Icon src={icons.fileActivityClose} /></button></header>
        <form onSubmit={(event) => { event.preventDefault(); const nextName = name.trim(); if (existingNames.some((existing) => existing !== currentName && existing.toLocaleLowerCase() === nextName.toLocaleLowerCase())) { setError('A folder with this name already exists.'); return }; if (nextName) onRename(nextName) }}>
          <div className="folderLabelRow">
            <label htmlFor="rename-folder-name">Folder name</label>
            <button className="addFolderButton renameFolderButton" type="submit" disabled={!name.trim() || name.trim() === currentName}><Icon src={icons.actionRename} />Rename</button>
          </div>
          <div className="folderNameField">
            <input id="rename-folder-name" autoFocus aria-invalid={Boolean(error)} value={name} onChange={(event) => { setName(event.target.value); setError('') }} />
            <span aria-hidden="true">Press Enter ↵</span>
          </div>
          {error && <p className="folderNameError" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  )
}

function DeleteItemModal({ itemName, itemType, retention = '30 days', onConfirm, onClose }: { itemName: string; itemType: 'file' | 'folder'; retention?: string; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  const message = itemType === 'folder'
    ? `‘${itemName}’ and all files inside it will be moved to Trash. Shared links to these files will stop working immediately. You can restore the folder from Trash for ${retention} before it is permanently deleted.`
    : `‘${itemName}’ will be moved to Trash. Its shared link will stop working immediately. You can restore the file from Trash for ${retention} before it is permanently deleted.`
  return (
    <div className="newFolderBackdrop deleteItemBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="deleteItemModal" role="alertdialog" aria-modal="true" aria-labelledby="delete-item-title">
        <header><div><img src="/assets/delete-modal-trash.svg" alt="" aria-hidden="true" /><h2 id="delete-item-title">Delete {itemType}</h2></div><button type="button" aria-label="Close delete dialog" onClick={onClose}><img src="/assets/delete-modal-close.svg" alt="" aria-hidden="true" /></button></header>
        <div className="deleteItemContent">
          <p>{message}</p>
          <footer><button type="button" onClick={onClose}>Cancel</button><button className="deleteItemConfirm" type="button" onClick={onConfirm}><img src="/assets/delete-modal-confirm.svg" alt="" aria-hidden="true" />Delete now</button></footer>
        </div>
      </section>
    </div>
  )
}

function FileTable({ rows = files, showHeader = true, onOpenFolder, onOpenFile, onRenameFolder, onDeleteFolder }: { rows?: FileRow[]; showHeader?: boolean; onOpenFolder?: (name: string) => void; onOpenFile?: (file: FileRow) => void; onRenameFolder?: (name: string) => void; onDeleteFolder?: (name: string) => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const openRow = (file: FileRow) => file.kind === 'folder' ? onOpenFolder?.(file.name) : onOpenFile?.(file)

  useEffect(() => {
    if (!openMenu) return

    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-row-menu]')) setOpenMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenu])

  return (
    <div className="fileTable">
      {showHeader && <div className="tableRow tableHead"><div>Name</div><div>Size</div><div>Modified</div><div /></div>}
      {rows.map((file, index) => (
        <div
          className={`tableRow clickable${!showHeader && index === 0 ? ' first' : ''}${index === rows.length - 1 ? ' last' : ''}`}
          key={file.path ?? file.name}
          tabIndex={0}
          aria-label={`Open ${file.name}`}
          onClick={(event) => { if (!(event.target as HTMLElement).closest('button')) openRow(file) }}
          onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openRow(file) } }}
        >
          <div className="fileName">
            {file.kind === 'folder' && onOpenFolder ? <button className="fileLink" onClick={() => onOpenFolder(file.name)}>{file.name}</button> : file.kind === 'file' && onOpenFile ? <button className="fileLink searchFileLink" onClick={() => onOpenFile(file)}><span>{file.name}</span>{file.path && <small>{file.path}</small>}</button> : <span>{file.name}</span>}
            {file.badge && <span className="badge">{file.badge}</span>}
          </div>
          <div className="sizeCell">{file.size}</div>
          <div>{file.modified}</div>
          <div className="moreCell" data-row-menu>
            <button
              className="moreButton"
              type="button"
              aria-label={`Actions for ${file.name}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === (file.path ?? file.name)}
              onClick={() => setOpenMenu((current) => current === (file.path ?? file.name) ? null : (file.path ?? file.name))}
            >
              <Icon src={icons.more} />
            </button>
            {openMenu === (file.path ?? file.name) && (
              <div className="rowMenu" role="menu" aria-label={`Actions for ${file.name}`}>
                <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); if (file.kind === 'file') onOpenFile?.(file); else onOpenFolder?.(file.name) }}><Icon src={icons.actionOpen} />Open</button>
                {file.kind === 'folder' && <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); onRenameFolder?.(file.name) }}><Icon src={icons.actionRename} />Rename</button>}
                {file.kind === 'folder' && <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); onDeleteFolder?.(file.name) }}><Icon src={icons.actionDelete} />Delete</button>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function fileSizeInBytes(size: string) {
  const value = Number.parseFloat(size)
  if (size.endsWith('GB')) return value * 1024 * 1024 * 1024
  if (size.endsWith('MB')) return value * 1024 * 1024
  if (size.endsWith('KB')) return value * 1024
  return value
}

function formatDisplayFileSize(size: string) {
  return size.replace(/\s*(B|KB|MB|GB)$/i, ' $1')
}

const supportedUploadExtensions = ['md', 'txt', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const supportedUploadAccept = supportedUploadExtensions.map((extension) => `.${extension}`).join(',')
const supportedUploadLabel = 'MD, TXT, PDF, JPG, JPEG, PNG, WEBP, or GIF'
const isSupportedUpload = (file: File) => supportedUploadExtensions.some((extension) => file.name.toLocaleLowerCase().endsWith(`.${extension}`))
const unsupportedUploadMessage = (files: File[]) => {
  const unsupportedNames = files.filter((file) => !isSupportedUpload(file)).map((file) => file.name)
  if (!unsupportedNames.length) return null
  const names = unsupportedNames.length > 2 ? `${unsupportedNames.slice(0, 2).join(', ')} and ${unsupportedNames.length - 2} more` : unsupportedNames.join(', ')
  return `${names} can’t be uploaded. Supported formats: ${supportedUploadLabel}.`
}

function FolderDetail({ workspaceId = window.localStorage.getItem('beam-active-workspace') || 'personal', accountName, folderName, initialItems, initialSelectedFileName, onItemsChange, onBack, readOnly = false, defaultView = 'list', confirmDelete = true, trashRetention = '30 days' }: { workspaceId?: string; accountName: string; folderName: string; initialItems: FolderFile[]; initialSelectedFileName?: string | null; onItemsChange: (items: FolderFile[], removedFile?: FolderFile) => void; onBack: () => void; readOnly?: boolean; defaultView?: 'list' | 'grid'; confirmDelete?: boolean; trashRetention?: string }) {
  const uploadRecoveryKey = `beam-pending-upload-v1-${workspaceId}-${folderName}`
  const activityStorageKey = `beam-folder-activity-v1-${workspaceId}-${folderName}`
  const shareStorageKey = `beam-file-sharing-v1-${workspaceId}-${folderName}`
  const [folderItems, setFolderItems] = useState<FolderFile[]>(initialItems)
  const [selectedFile, setSelectedFile] = useState<FolderFile | null>(() => {
    const requested = initialSelectedFileName ?? new URLSearchParams(window.location.search).get('file') ?? window.sessionStorage.getItem('beam-open-file')
    window.sessionStorage.removeItem('beam-open-file')
    return initialItems.find((file) => file.name === requested) ?? null
  })
  const [shareFileName, setShareFileName] = useState<string | null>(null)
  const [focusPreviewOnOpen, setFocusPreviewOnOpen] = useState(() => { const shouldFocus = Boolean(initialSelectedFileName || new URLSearchParams(window.location.search).get('file') || window.sessionStorage.getItem('beam-open-file-focus')); window.sessionStorage.removeItem('beam-open-file-focus'); return shouldFocus })
  const [infoFile, setInfoFile] = useState<FolderFile | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null)
  const [downloadFeedback, setDownloadFeedback] = useState<DownloadFeedback>(null)
  const [openFileMenu, setOpenFileMenu] = useState<number | null>(null)
  const [gridContextMenuPosition, setGridContextMenuPosition] = useState<{ left: number; top: number } | null>(null)
  const [fileToDelete, setFileToDelete] = useState<{ file: FolderFile; index: number } | null>(null)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<File[] | null>(null)
  const [uploadNotice, setUploadNotice] = useState<string | null>(() => window.sessionStorage.getItem(uploadRecoveryKey) ? 'The previous upload was interrupted. Select the same files again to retry.' : null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(defaultView)
  const [splitPercent, setSplitPercent] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const [activity, setActivity] = useState<FolderActivity[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(activityStorageKey) ?? '[]') as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((item): item is FolderActivity => Boolean(item && typeof item === 'object' && typeof (item as FolderActivity).id === 'string' && typeof (item as FolderActivity).fileName === 'string' && typeof (item as FolderActivity).actor === 'string' && typeof (item as FolderActivity).createdAt === 'number' && ['Viewed', 'Uploaded', 'Downloaded', 'Shared', 'Deleted'].includes((item as FolderActivity).action)))
    } catch { return [] }
  })
  const [fileShares, setFileShares] = useState<Record<string, FileShareSettings>>(() => loadFileShares(shareStorageKey))

  useEffect(() => setViewMode(defaultView), [defaultView])

  useEffect(() => {
    const showOfflineNotice = () => setUploadNotice('You’re offline. Reconnect before uploading files.')
    window.addEventListener('offline', showOfflineNotice)
    return () => window.removeEventListener('offline', showOfflineNotice)
  }, [])

  const recordActivity = (action: FolderActivityAction, fileName: string) => {
    setActivity((current) => {
      const next = [{ id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random()}`, action, fileName, actor: accountName, createdAt: Date.now() }, ...current].slice(0, 50)
      try { window.localStorage.setItem(activityStorageKey, JSON.stringify(next)) } catch { /* Activity still updates for this session if storage is unavailable. */ }
      return next
    })
  }

  const updateFileShare = (fileName: string, update: (current: FileShareSettings) => FileShareSettings) => {
    setFileShares((current) => {
      const nextSettings = update(current[fileName] ?? { members: [], linkAccess: 'restricted', token: '' })
      const next = { ...current, [fileName]: nextSettings }
      try { window.localStorage.setItem(shareStorageKey, JSON.stringify(next)) } catch { /* Keep sharing usable for this session. */ }
      return next
    })
  }

  const recordedInitialPreviewRef = useRef(false)
  useEffect(() => {
    if (recordedInitialPreviewRef.current || !initialSelectedFileName || !selectedFile) return
    recordedInitialPreviewRef.current = true
    recordActivity('Viewed', selectedFile.name)
  }, [initialSelectedFileName, selectedFile])

  useEffect(() => {
    if (!selectedFile || fileShares[selectedFile.name]?.demoSeedVersion === 1) return
    updateFileShare(selectedFile.name, (current) => ({ ...current, members: [...current.members, ...demoShareMembers.filter((demo) => !current.members.some((member) => member.id === demo.id))], demoSeedVersion: 1 }))
  }, [selectedFile?.name])

  const removeFile = (file: FolderFile, index: number) => {
    setFolderItems((items) => { const next = items.filter((_, itemIndex) => itemIndex !== index); onItemsChange(next, file); return next })
    if (selectedFile === file) setSelectedFile(null)
    recordActivity('Deleted', file.name)
  }
  const previewLayoutRef = useRef<HTMLDivElement>(null)
  const previewOriginRef = useRef<HTMLElement | null>(null)
  const previewOriginIndexRef = useRef<number | null>(null)
  const gridContextOriginRef = useRef<HTMLButtonElement | null>(null)
  const isResizingRef = useRef(false)
  const dragDepthRef = useRef(0)
  const copyFeedbackTimerRef = useRef<number | null>(null)
  const downloadFeedbackTimerRef = useRef<number | null>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const minimumDetailWidth = 350
  const minimumPreviewWidth = 513
  const openPreview = (file: FolderFile, origin: HTMLElement, keyboard: boolean, trackView = true) => { previewOriginRef.current = origin; previewOriginIndexRef.current = folderItems.indexOf(file); setFocusPreviewOnOpen(keyboard); setSelectedFile(file); if (trackView) recordActivity('Viewed', file.name) }
  const closePreview = (restoreFocus = false) => {
    setSelectedFile(null)
    setShareFileName(null)
    if (restoreFocus) window.requestAnimationFrame(() => {
      const restoredOrigin = previewOriginIndexRef.current === null ? null : document.querySelector<HTMLElement>(`[data-file-open-index="${previewOriginIndexRef.current}"]`)
      const restoredFileButton = restoredOrigin instanceof HTMLButtonElement ? restoredOrigin : restoredOrigin?.querySelector<HTMLButtonElement>('.fileGridOpen')
      if (restoredFileButton) restoredFileButton.focus()
      else if (previewOriginRef.current?.isConnected) previewOriginRef.current.focus()
      else document.querySelector<HTMLElement>('.detailTable, .fileGrid')?.focus()
    })
  }

  const constrainSplit = (desiredLeftWidth: number, totalWidth: number) => {
    const minimumLeft = Math.min(minimumDetailWidth, totalWidth / 2)
    const maximumLeft = Math.max(minimumLeft, totalWidth - minimumPreviewWidth)
    return Math.min(maximumLeft, Math.max(minimumLeft, desiredLeftWidth))
  }

  useEffect(() => () => {
    uploadAbortRef.current?.abort()
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current)
    if (downloadFeedbackTimerRef.current !== null) window.clearTimeout(downloadFeedbackTimerRef.current)
  }, [])

  useEffect(() => {
    if (openFileMenu === null) return
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-detail-row-menu]')) { setOpenFileMenu(null); setGridContextMenuPosition(null) }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const index = openFileMenu
        setOpenFileMenu(null)
        setGridContextMenuPosition(null)
        window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-file-menu-index="${index}"]`)?.focus())
      }
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openFileMenu])

  useEffect(() => { setOpenFileMenu(null); setGridContextMenuPosition(null) }, [viewMode])

  const openGridContextMenu = (index: number, origin: HTMLButtonElement, clientX: number, clientY: number) => {
    const menuWidth = 140
    const menuHeight = readOnly ? 84 : 110
    gridContextOriginRef.current = origin
    setOpenFileMenu(index)
    setGridContextMenuPosition({ left: Math.max(8, Math.min(clientX, window.innerWidth - menuWidth - 8)), top: Math.max(8, Math.min(clientY, window.innerHeight - menuHeight - 8)) })
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-grid-context-menu] [role="menuitem"]')?.focus())
  }

  const handleFileMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (event.key === 'ArrowDown') next = (current + 1) % items.length
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault(); items[next]?.focus()
  }

  const commitFiles = async (incomingFiles: FileList | File[]) => {
    if (readOnly) return
    const incoming = Array.from(incomingFiles)
    const unsupportedMessage = unsupportedUploadMessage(incoming)
    if (unsupportedMessage) throw new Error(unsupportedMessage)
    if (incoming.some((file) => file.size === 0)) throw new Error('Empty files cannot be uploaded.')
    if (incoming.some((file) => file.size > 100 * 1024 * 1024)) throw new Error('Files must be 100 MB or smaller.')
    const usedNames = new Set(folderItems.map((item) => item.name.toLocaleLowerCase()))
    const uniqueName = (name: string) => {
      const dot = name.lastIndexOf('.'); const stem = dot > 0 ? name.slice(0, dot) : name; const extension = dot > 0 ? name.slice(dot) : ''
      let candidate = name; let suffix = 2
      while (usedNames.has(candidate.toLocaleLowerCase())) candidate = `${stem} (${suffix++})${extension}`
      usedNames.add(candidate.toLocaleLowerCase()); return candidate
    }
    const records = incoming.map((file) => ({ file, name: uniqueName(file.name), storageId: createStorageId(workspaceId, folderName) }))
    const controller = new AbortController()
    uploadAbortRef.current = controller
    try {
      await Promise.all(records.map(({ file, name, storageId }) => storeFile({ id: storageId, workspaceId, folderName, name, type: file.type, size: file.size, lastModified: file.lastModified, blob: file }, controller.signal)))
    } catch (error) {
      await Promise.allSettled(records.map(({ storageId }) => deleteStoredFile(storageId)))
      throw error
    } finally {
      if (uploadAbortRef.current === controller) uploadAbortRef.current = null
    }
    const addedFiles = records.map(({ file, name, storageId }) => ({
      name,
      kind: file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'file',
      size: formatFileSize(file.size),
      modified: 'Just now',
      previewAvailable: true,
      storageId,
      mimeType: file.type,
    }))
    if (addedFiles.length) setFolderItems((current) => {
      const next = [...current, ...addedFiles]
      onItemsChange(next)
      return next
    })
    addedFiles.forEach((file) => recordActivity('Uploaded', file.name))
    return true
  }

  const queueFiles = (incomingFiles: FileList | File[]) => {
    if (readOnly) return
    const files = Array.from(incomingFiles)
    if (!files.length) return
    if (pendingUpload) { setUploadNotice('An upload is already in progress. Wait for it to finish before adding more files.'); return }
    if (!navigator.onLine) { setUploadNotice('You’re offline. Reconnect before uploading files.'); return }
    const unsupportedMessage = unsupportedUploadMessage(files)
    if (unsupportedMessage) { setUploadNotice(unsupportedMessage); return }
    if (files.some((file) => file.size === 0)) { setUploadNotice('Empty files cannot be uploaded. Choose a file containing data.'); return }
    if (files.some((file) => file.size > 100 * 1024 * 1024)) { setUploadNotice('Files must be 100 MB or smaller.'); return }
    window.sessionStorage.setItem(uploadRecoveryKey, JSON.stringify(files.map((file) => ({ name: file.name, size: file.size, lastModified: file.lastModified }))))
    setUploadNotice(null)
    setPendingUpload(files)
  }

  const downloadFile = async (file: FolderFile) => {
    try {
      const stored = file.storageId ? await getStoredFile(file.storageId) : undefined
      if (file.storageId && !stored) throw new Error('File unavailable')
      const blob = stored?.blob ?? new Blob([`# ${file.name}\n`], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setDownloadFeedback({ status: 'success', file })
      recordActivity('Downloaded', file.name)
      if (downloadFeedbackTimerRef.current !== null) window.clearTimeout(downloadFeedbackTimerRef.current)
      downloadFeedbackTimerRef.current = window.setTimeout(() => setDownloadFeedback(null), 3000)
    } catch {
      if (downloadFeedbackTimerRef.current !== null) window.clearTimeout(downloadFeedbackTimerRef.current)
      setDownloadFeedback({ status: 'failure', file })
    }
  }

  const copyFileLink = async (file: FolderFile) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      const currentSettings = fileShares[file.name] ?? { members: [], linkAccess: 'restricted', token: '' }
      const token = currentSettings.token || crypto.randomUUID()
      if (!currentSettings.token) updateFileShare(file.name, (current) => ({ ...current, token }))
      const shareUrl = new URL(window.location.origin)
      shareUrl.searchParams.set('share', token)
      await navigator.clipboard.writeText(shareUrl.toString())
      setCopyFeedback({ status: 'success', fileName: file.name })
      recordActivity('Shared', file.name)
    } catch {
      setCopyFeedback({ status: 'failure', fileName: file.name })
    }
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current)
    copyFeedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2200)
  }

  useEffect(() => {
    if (readOnly) return
    const containsFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
    const handleDragEnter = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepthRef.current += 1
      setIsDraggingFiles(true)
    }
    const handleDragOver = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }
    const handleDragLeave = (event: DragEvent) => {
      if (!containsFiles(event)) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDraggingFiles(false)
    }
    const handleDrop = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingFiles(false)
      if (event.dataTransfer?.files.length) queueFiles(event.dataTransfer.files)
    }
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [pendingUpload, readOnly])

  const updateSplitFromPointer = (clientX: number) => {
    const bounds = previewLayoutRef.current?.getBoundingClientRect()
    if (!bounds) return
    const constrainedWidth = constrainSplit(clientX - bounds.left, bounds.width)
    setSplitPercent((constrainedWidth / bounds.width) * 100)
  }

  useEffect(() => {
    const layout = previewLayoutRef.current
    if (!selectedFile || !layout) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (!width) return
      setSplitPercent((current) => (constrainSplit((current / 100) * width, width) / width) * 100)
    })
    observer.observe(layout)
    return () => observer.disconnect()
  }, [selectedFile])

  const startResizing = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    isResizingRef.current = true
    setIsResizing(true)
    updateSplitFromPointer(event.clientX)
  }

  const resizePanes = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isResizingRef.current) updateSplitFromPointer(event.clientX)
  }

  const stopResizing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    isResizingRef.current = false
    setIsResizing(false)
  }

  const detailHeader = (
    <div className="detailHeader">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button onClick={onBack}>My Beam</button><span>/</span><span>{folderName}</span>
      </nav>
      {!readOnly && <div className="uploadActions">
        <label className="uploadButton"><Icon src={icons.upload} /><span>Upload file</span><input type="file" accept={supportedUploadAccept} multiple onChange={(event) => { if (event.target.files) queueFiles(event.target.files); event.target.value = '' }} /></label>
        <span>or drag and drop</span>
      </div>}
    </div>
  )

  const detailTable = (
    <div className="detailTable" role="table" tabIndex={-1} aria-label={`${folderName} files`}>
      <div className="detailRow detailTableHead" role="row"><div role="columnheader">Name</div><div role="columnheader">Kind</div><div role="columnheader">Size</div><div role="columnheader">Modified</div><div role="columnheader"><span className="srOnly">Actions</span></div></div>
      {folderItems.map((file, index) => (
        <div
          className={`detailRow selectable${selectedFile?.name === file.name ? ' selected' : ''}${index === folderItems.length - 1 ? ' last' : ''}`}
          key={`${file.name}-${index}`}
          role="row"
        >
          <div role="cell"><button data-file-open-index={index} className="fileNameButton" type="button" title={file.name} onClick={(event) => openPreview(file, event.currentTarget, event.detail === 0)}>{file.name}</button></div><div role="cell">{file.kind}</div><div role="cell">{file.size}</div><div role="cell">{file.modified}</div>
          <div role="cell" className="detailMore" data-detail-row-menu>
            <button
              data-file-menu-index={index}
              className="moreButton"
              type="button"
              aria-label={`Actions for ${file.name}`}
              aria-haspopup="menu"
              aria-expanded={openFileMenu === index}
              onClick={() => { setGridContextMenuPosition(null); setOpenFileMenu((current) => current === index ? null : index) }}
              onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpenFileMenu(index); window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-menu-for="${index}"] [role="menuitem"]`)?.focus()) } }}
            ><Icon src={icons.more} /></button>
            {openFileMenu === index && (
              <div data-menu-for={index} className="rowMenu detailRowMenu" role="menu" aria-label={`Actions for ${file.name}`} onKeyDown={handleFileMenuKeyDown}>
                <button className="darkIcon" type="button" role="menuitem" onClick={() => { setInfoFile(file); setOpenFileMenu(null) }}><Icon src={icons.previewInfo} />Info</button>
                <button className="darkIcon" type="button" role="menuitem" onClick={() => { void copyFileLink(file); setOpenFileMenu(null) }}><Icon src={icons.previewCopy} />Copy link</button>
                <button className="darkIcon" type="button" role="menuitem" onClick={() => { downloadFile(file); setOpenFileMenu(null) }}><Icon src={icons.previewDownload} />Download</button>
                {!readOnly && <button type="button" role="menuitem" onClick={() => { if (confirmDelete) setFileToDelete({ file, index }); else removeFile(file, index); setOpenFileMenu(null) }}><Icon src={icons.actionDelete} />Delete</button>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const detailGridView = (
    <div className="fileGrid" role="list" tabIndex={-1} aria-label={`${folderName} files`}>
      {folderItems.map((file, index) => (
        <article
          data-file-open-index={index}
          className={`fileGridCard${selectedFile?.name === file.name || (gridContextMenuPosition && openFileMenu === index) ? ' selected' : ''}`}
          role="listitem"
          key={`${file.name}-${index}`}
        >
          <button data-file-menu-index={index} className="fileGridOpen" type="button" title={file.name} aria-label={`Open ${file.name}`} aria-haspopup="menu" aria-expanded={Boolean(gridContextMenuPosition && openFileMenu === index)} onClick={(event) => openPreview(file, event.currentTarget, event.detail === 0)} onContextMenu={(event) => { event.preventDefault(); openGridContextMenu(index, event.currentTarget, event.clientX, event.clientY) }} onKeyDown={(event) => { if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); openGridContextMenu(index, event.currentTarget, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2) } }}><span className="fileGridPreview"><Icon src={icons.fileDocument} /></span><span className="fileGridName">{file.name}</span></button>
        </article>
      ))}
      {gridContextMenuPosition && openFileMenu !== null && folderItems[openFileMenu] && (() => { const file = folderItems[openFileMenu]; const index = openFileMenu; return <div data-detail-row-menu data-grid-context-menu className="rowMenu detailRowMenu gridContextMenu" style={gridContextMenuPosition} role="menu" aria-label={`Actions for ${file.name}`} onKeyDown={handleFileMenuKeyDown}>
        <button className="darkIcon" type="button" role="menuitem" onClick={() => { setInfoFile(file); setOpenFileMenu(null); setGridContextMenuPosition(null) }}><Icon src={icons.previewInfo} />Info</button>
        <button className="darkIcon" type="button" role="menuitem" onClick={() => { const origin = gridContextOriginRef.current; setShareFileName(file.name); setOpenFileMenu(null); setGridContextMenuPosition(null); if (origin) openPreview(file, origin, true, false) }}><Icon src={icons.previewShare} />Share</button>
        <button className="darkIcon" type="button" role="menuitem" onClick={() => { void downloadFile(file); setOpenFileMenu(null); setGridContextMenuPosition(null) }}><Icon src={icons.previewDownload} />Download</button>
        {!readOnly && <button type="button" role="menuitem" onClick={() => { if (confirmDelete) setFileToDelete({ file, index }); else removeFile(file, index); setOpenFileMenu(null); setGridContextMenuPosition(null) }}><Icon src={icons.actionDelete} />Delete</button>}
      </div> })()}
    </div>
  )

  const viewTabs = (
    <div className="viewTabs" role="tablist" aria-label="Folder view">
      <button className={viewMode === 'list' ? 'active' : ''} type="button" role="tab" tabIndex={viewMode === 'list' ? 0 : -1} aria-selected={viewMode === 'list'} onKeyDown={(event) => { if (event.key === 'ArrowRight') { setViewMode('grid'); (event.currentTarget.nextElementSibling as HTMLButtonElement)?.focus() } }} onClick={() => setViewMode('list')}><Icon src={icons.viewList} />List</button>
      <button className={viewMode === 'grid' ? 'active' : ''} type="button" role="tab" tabIndex={viewMode === 'grid' ? 0 : -1} aria-selected={viewMode === 'grid'} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { setViewMode('list'); (event.currentTarget.previousElementSibling as HTMLButtonElement)?.focus() } }} onClick={() => setViewMode('grid')}><Icon src={icons.viewGrid} />Grid</button>
    </div>
  )

  return (
    <div className={`folderDetail${selectedFile ? ' previewing' : ''}`}>
      {selectedFile ? (
        <div className={`previewLayout${isResizing ? ' resizing' : ''}`} ref={previewLayoutRef}>
          <div className="detailMain" style={{ flexBasis: `${splitPercent}%` }}>{detailHeader}{viewMode === 'grid' ? detailGridView : detailTable}</div>
          <FilePreview file={selectedFile} accountName={accountName} shareSettings={fileShares[selectedFile.name] ?? { members: [], linkAccess: 'restricted', token: '' }} focusOnOpen={focusPreviewOnOpen} openShareInitially={shareFileName === selectedFile.name} copyFeedback={copyFeedback?.fileName === selectedFile.name ? copyFeedback : null} onCopyLink={() => copyFileLink(selectedFile)} onMemberRoleChange={(memberId, role) => { updateFileShare(selectedFile.name, (current) => ({ ...current, members: current.members.map((member) => member.id === memberId ? { ...member, role } : member) })); recordActivity('Shared', selectedFile.name) }} onRemoveMember={(memberId) => { updateFileShare(selectedFile.name, (current) => ({ ...current, members: current.members.filter((member) => member.id !== memberId) })); recordActivity('Shared', selectedFile.name) }} onLinkAccessChange={(linkAccess) => { updateFileShare(selectedFile.name, (current) => ({ ...current, linkAccess })); recordActivity('Shared', selectedFile.name) }} onDownload={() => downloadFile(selectedFile)} onInfo={() => setInfoFile(selectedFile)} onClose={closePreview} />
          <div
            className="paneHandle"
            style={{ left: `${splitPercent}%` }}
            role="separator"
            aria-label="Resize file preview"
            aria-orientation="vertical"
            aria-valuemin={29}
            aria-valuemax={58}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onPointerDown={startResizing}
            onPointerMove={resizePanes}
            onPointerUp={stopResizing}
            onPointerCancel={stopResizing}
            onKeyDown={(event) => {
              const bounds = previewLayoutRef.current?.getBoundingClientRect()
              if (!bounds) return
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault()
                const direction = event.key === 'ArrowLeft' ? -16 : 16
                setSplitPercent((value) => (constrainSplit((value / 100) * bounds.width + direction, bounds.width) / bounds.width) * 100)
              }
            }}
          ><Icon src={icons.paneHandle} /></div>
        </div>
      ) : folderItems.length === 0 ? (
        <>
          {detailHeader}
          <section className="detailEmptyState" aria-labelledby="detail-empty-title">
            <img className="detailEmptyIllustration detailEmptyIllustrationLight" src={icons.emptyFiles} alt="" aria-hidden="true" />
            <img className="detailEmptyIllustration detailEmptyIllustrationDark" src="/assets/empty-files-dark.svg" alt="" aria-hidden="true" />
            <div className="detailEmptyCopy">
              <h2 id="detail-empty-title">No files yet</h2>
              <p>This folder is empty. Upload a file to get started.</p>
            </div>
            {!readOnly && <label className="detailEmptyUpload"><Icon src={icons.upload} /><span>Upload file</span><input type="file" accept={supportedUploadAccept} multiple onChange={(event) => { if (event.target.files) queueFiles(event.target.files); event.target.value = '' }} /></label>}
          </section>
        </>
      ) : <>{detailHeader}<div className="detailGrid"><div className="detailListPane">{viewMode === 'grid' ? detailGridView : detailTable}<div className="viewTabsDock">{copyFeedback && <CopyTooltip feedback={copyFeedback} global />}{viewTabs}</div></div><RecentActivity activity={activity} folderName={folderName} /></div></>}
      {isDraggingFiles && (
        <div className="dropOverlay" role="status" aria-live="polite">
          <div className="dropZone">
            <div className="dropPrompt">
              <div className="dropMessage"><span>Drop files to upload to</span><span className="dropDestination"><Icon src={icons.dropFolder} />{folderName}</span></div>
            </div>
          </div>
        </div>
      )}
      {infoFile && <FileActivityModal file={infoFile} onClose={() => setInfoFile(null)} />}
      {downloadFeedback && <DownloadToast feedback={downloadFeedback} onRetry={() => downloadFile(downloadFeedback.file)} onClose={() => setDownloadFeedback(null)} />}
      {uploadNotice && <div className="downloadToast failure uploadRecoveryToast" role="alert" aria-live="polite"><Icon src={icons.previewClose} /><div className="downloadToastText"><strong>{!navigator.onLine ? 'You’re offline' : uploadNotice.startsWith('An upload is already') ? 'Upload already in progress' : 'Upload interrupted'}</strong><span>{uploadNotice}</span></div><button className="downloadToastClose" type="button" onClick={() => { setUploadNotice(null); window.sessionStorage.removeItem(uploadRecoveryKey) }} aria-label="Dismiss upload notice" /></div>}
      {fileToDelete && <DeleteItemModal itemName={fileToDelete.file.name} itemType="file" retention={trashRetention} onClose={() => setFileToDelete(null)} onConfirm={() => { removeFile(fileToDelete.file, fileToDelete.index); setFileToDelete(null) }} />}
      {pendingUpload && <UploadDemoOverlay
        files={pendingUpload.map((file) => ({
          name: file.name,
          size: formatDisplayFileSize(formatFileSize(file.size)),
          bytes: file.size,
          icon: /\.(?:jpe?g|png|gif|webp)$/i.test(file.name)
            ? '/assets/upload-image-file.svg'
            : /\.pdf$/i.test(file.name) ? '/assets/drop-file-type.svg' : '/assets/upload-file.svg',
        }))}
        autoCloseOnComplete
        onClose={() => { uploadAbortRef.current?.abort(); setPendingUpload(null); window.sessionStorage.removeItem(uploadRecoveryKey) }}
        onComplete={async () => { const saved = await commitFiles(pendingUpload); if (saved) window.sessionStorage.removeItem(uploadRecoveryKey); return saved }}
      />}
    </div>
  )
}

function FileActivityModal({ file, onClose }: { file: FolderFile; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="activityModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="activityModal" role="dialog" aria-modal="true" aria-labelledby="file-activity-title">
        <header className="activityModalHeader">
          <h2 id="file-activity-title"><Icon src={icons.fileActivityInfo} />File Activity</h2>
          <button type="button" onClick={onClose} aria-label="Close file activity"><Icon src={icons.fileActivityClose} /></button>
        </header>
        <div className="activityModalBody">
          <div className="activityMetrics">
            <div><span>Views</span><span>16</span></div>
            <div><span>Download</span><span>2</span></div>
            <div><span>Updates</span><span>0</span></div>
            <div><span>Last seen</span><span>20:12, Nov 12, 2026</span></div>
          </div>
          <div className="activityHistory">
            <h3>Recent history</h3>
            <div className="modalActivityList">
              {[0, 1, 2].map((item) => (
                <div className="modalActivityItem" key={item}>
                  <div className="modalActivityTrack"><span />{item < 2 && <i />}</div>
                  <div className="modalActivityContent">
                    <div><span>Michele J.</span><span className="activityBadge">Viewed</span></div>
                    <p>{file.name} · /{file.name}</p>
                  </div>
                  <time>2h ago</time>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function CopyTooltip({ feedback, global = false }: { feedback: NonNullable<CopyFeedback>; global?: boolean }) {
  return <span className={`copyTooltip ${feedback.status}${global ? ' global' : ''}`} role="status" aria-live="polite">{feedback.status === 'success' ? 'Link copied' : 'Copy link failed'}</span>
}

function DownloadToast({ feedback, onRetry, onClose }: { feedback: NonNullable<DownloadFeedback>; onRetry: () => void; onClose: () => void }) {
  if (feedback.status === 'success') return (
    <div className="apiCreatedToast" role="status" aria-live="polite">
      <span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span>
      <div><strong>Download complete</strong><span>{feedback.file.name} was downloaded successfully.</span></div>
    </div>
  )
  return (
    <div className="downloadToast failure" role="alert" aria-live="polite">
      <Icon src={icons.previewClose} />
      <div className="downloadToastText">
        <strong>Download failed</strong>
        <span>Couldn’t download {feedback.file.name}.</span>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
      <button className="downloadToastClose" type="button" onClick={onClose} aria-label="Dismiss notification" />
    </div>
  )
}

type EditorToolbarPosition = { left: number; top: number }
type EditorPanelPosition = { left: number; top: number; width: number; placement: 'above' | 'below' }

const editorIcons = {
  chevron: '/assets/editor-chevron.svg', bold: '/assets/editor-bold.svg', italic: '/assets/editor-italic.svg',
  underline: '/assets/editor-underline.svg', divider: '/assets/editor-divider.svg',
  list: '/assets/editor-list.svg', link: '/assets/editor-link.svg', image: '/assets/editor-image.svg',
} as const

function TextEditorToolbar({ position, blockStyle, isBulleted, onFormat }: { position: EditorToolbarPosition; blockStyle: 'Header 1' | 'Body'; isBulleted: boolean; onFormat: (command: string, value?: string) => void }) {
  const [openEditorPanel, setOpenEditorPanel] = useState<'heading' | 'color' | 'link' | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [nextAlignment, setNextAlignment] = useState<'center' | 'right' | 'left'>('center')
  const [panelPosition, setPanelPosition] = useState<EditorPanelPosition>({ left: 8, top: 8, width: 98, placement: 'below' })
  const toolbarRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const closePanel = (restoreFocus = false) => {
    const panel = openEditorPanel
    setOpenEditorPanel(null)
    if (restoreFocus && panel) window.requestAnimationFrame(() => triggerRefs.current[panel]?.focus())
  }
  useEffect(() => {
    if (!openEditorPanel) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!toolbarRef.current?.contains(target) && !panelRef.current?.contains(target)) closePanel()
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closePanel(true) } }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [openEditorPanel])
  useEffect(() => {
    if (!openEditorPanel) return
    const positionPanel = () => {
      const trigger = triggerRefs.current[openEditorPanel]
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportGap = 8
      const panelGap = 4
      const dimensions = openEditorPanel === 'heading' ? { width: 98, height: 56 } : openEditorPanel === 'color' ? { width: 108, height: 30 } : { width: 244, height: linkError ? 54 : 34 }
      const preferredLeft = openEditorPanel === 'link' ? rect.right - dimensions.width : rect.left
      const left = Math.min(Math.max(viewportGap, preferredLeft), window.innerWidth - dimensions.width - viewportGap)
      const fitsBelow = rect.bottom + panelGap + dimensions.height <= window.innerHeight - viewportGap
      const top = fitsBelow ? rect.bottom + panelGap : Math.max(viewportGap, rect.top - panelGap - dimensions.height)
      setPanelPosition({ left, top, width: dimensions.width, placement: fitsBelow ? 'below' : 'above' })
    }
    positionPanel()
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [linkError, openEditorPanel])
  const menuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % items.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault(); items[next]?.focus()
  }
  const applyBlockStyle = (style: 'Header 1' | 'Body') => {
    closePanel(true)
    onFormat('inlineTextStyle', style)
  }
  const applyLink = () => {
    const input = linkUrl.trim()
    if (!input) return
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`
    let normalizedUrl = ''
    try {
      const parsedUrl = new URL(candidate)
      const domainPattern = /^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i
      const isValidIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(parsedUrl.hostname)
        && parsedUrl.hostname.split('.').every((part) => Number(part) <= 255)
      const hasValidHost = domainPattern.test(parsedUrl.hostname) || parsedUrl.hostname === 'localhost' || isValidIp
      if (!['http:', 'https:'].includes(parsedUrl.protocol) || !hasValidHost) throw new Error('Unsupported URL')
      normalizedUrl = parsedUrl.href
    } catch {
      setLinkError('Enter a valid web address')
      return
    }
    onFormat('createLink', normalizedUrl)
    setLinkUrl('')
    setLinkError('')
    setOpenEditorPanel(null)
  }
  const insertImage = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') onFormat('insertImage', reader.result)
    })
    reader.readAsDataURL(file)
  }
  const iconButton = (label: string, icon: string, command: string, className = '') => (
    <button className={className} type="button" aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(command)}><img src={icon} alt="" /></button>
  )
  const cycleAlignment = () => {
    onFormat(nextAlignment === 'center' ? 'justifyCenter' : nextAlignment === 'right' ? 'justifyRight' : 'justifyLeft')
    setNextAlignment(nextAlignment === 'center' ? 'right' : nextAlignment === 'right' ? 'left' : 'center')
  }
  return (
    <div ref={toolbarRef} className="textEditorToolbar" style={position} role="toolbar" aria-label="Text formatting" onMouseDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <div className="editorGroup editorHeadingGroup">
        <button ref={(node) => { triggerRefs.current.heading = node }} className="editorHeadingTrigger" type="button" aria-haspopup="menu" aria-expanded={openEditorPanel === 'heading'} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenEditorPanel((panel) => panel === 'heading' ? null : 'heading')}><span>{blockStyle}</span><img className={openEditorPanel === 'heading' ? 'open' : ''} src={editorIcons.chevron} alt="" /></button>
        {openEditorPanel === 'heading' && createPortal(
          <div ref={(node) => { panelRef.current = node }} className="editorHeadingMenu editorFloatingPanel" style={{ left: panelPosition.left, top: panelPosition.top, width: panelPosition.width }} data-placement={panelPosition.placement} role="menu" aria-label="Text style" onKeyDown={menuKeyDown}>
            <button className={blockStyle === 'Header 1' ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={blockStyle === 'Header 1'} onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockStyle('Header 1')}><span>Header 1</span>{blockStyle === 'Header 1' && <img src={icons.downloadSuccess} alt="" />}</button>
            <button className={blockStyle === 'Body' ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={blockStyle === 'Body'} onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockStyle('Body')}><span>Body</span>{blockStyle === 'Body' && <img src={icons.downloadSuccess} alt="" />}</button>
          </div>, document.body
        )}
      </div>
      <div className="editorGroup editorFormattingGroup">
        {iconButton('Bold', editorIcons.bold, 'inlineBold', 'editorHoverPreview')}
        {iconButton('Italic', editorIcons.italic, 'inlineItalic')}
        {iconButton('Underline', editorIcons.underline, 'inlineUnderline')}
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button ref={(node) => { triggerRefs.current.color = node }} className="editorColor" type="button" aria-haspopup="menu" aria-label="Text color" aria-expanded={openEditorPanel === 'color'} title="Text color" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenEditorPanel((panel) => panel === 'color' ? null : 'color')}><span /></button>
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button type="button" aria-label={`Align ${nextAlignment}`} title={`Align ${nextAlignment}`} onMouseDown={(event) => event.preventDefault()} onClick={cycleAlignment}><span className={`editorAlignIcon ${nextAlignment}`} aria-hidden="true"><i /><i /><i /><i /></span></button>
        <button className={isBulleted ? 'active' : ''} type="button" aria-label={isBulleted ? 'Remove bulleted list' : 'Bulleted list'} aria-pressed={isBulleted} title={isBulleted ? 'Remove bulleted list' : 'Bulleted list'} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat('insertUnorderedList')}><img src={editorIcons.list} alt="" /></button>
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button ref={(node) => { triggerRefs.current.link = node }} type="button" aria-haspopup="dialog" aria-label="Add link" aria-expanded={openEditorPanel === 'link'} title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenEditorPanel((panel) => panel === 'link' ? null : 'link')}><img src={editorIcons.link} alt="" /></button>
        <label className="editorImageButton" title="Add image"><img src={editorIcons.image} alt="" /><input type="file" accept="image/*" onChange={(event) => { insertImage(event.target.files?.[0]); event.target.value = '' }} /></label>
        {openEditorPanel === 'color' && createPortal(<div ref={(node) => { panelRef.current = node }} className="editorColorMenu editorFloatingPanel" style={{ left: panelPosition.left, top: panelPosition.top, width: panelPosition.width }} data-placement={panelPosition.placement} role="menu" aria-label="Text colors" onKeyDown={menuKeyDown}>{['#0a0a0a', '#29323d', '#0d76f2', '#f24b0d', '#810718'].map((color) => <button type="button" role="menuitem" key={color} aria-label={`Use ${color}`} style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => { onFormat('foreColor', color); closePanel(true) }} />)}</div>, document.body)}
        {openEditorPanel === 'link' && createPortal(<form ref={(node) => { panelRef.current = node }} className="editorLinkMenu editorFloatingPanel" style={{ left: panelPosition.left, top: panelPosition.top, width: panelPosition.width }} data-placement={panelPosition.placement} role="dialog" aria-label="Add link" onSubmit={(event) => { event.preventDefault(); applyLink() }}><div className="editorLinkFields"><div><input autoFocus value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError('') }} placeholder="https://example.com" aria-label="Link URL" aria-invalid={Boolean(linkError)} aria-describedby={linkError ? 'editor-link-error' : undefined} /><button type="submit" disabled={!linkUrl.trim()}>Apply</button></div>{linkError && <span id="editor-link-error" role="alert">{linkError}</span>}</div></form>, document.body)}
      </div>
    </div>
  )
}

function ShareRoleControl({ member, onChange }: { member: ShareMember; onChange: (role: ShareRole) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const controlRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const close = (event: MouseEvent) => { if (!controlRef.current?.contains(event.target as Node)) setIsOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setIsOpen(false) } }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', closeOnEscape) }
  }, [isOpen])
  return <div className="shareMemberRoleControl" ref={controlRef}>
    <button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>{member.role}<img src="/assets/share-extra-1.svg" alt="" aria-hidden="true" /></button>
    {isOpen && <div className="shareMemberRoleMenu" role="listbox" aria-label={`Role for ${member.email}`}>{(['Viewer', 'Editor'] as const).map((role) => <button type="button" role="option" aria-selected={member.role === role} key={role} onClick={() => { onChange(role); setIsOpen(false) }}><span>{role}</span>{member.role === role && <img src="/assets/workspace-menu-check.svg" alt="" aria-hidden="true" />}</button>)}</div>}
  </div>
}

function FilePreview({ file, accountName, shareSettings, focusOnOpen = false, openShareInitially = false, copyFeedback, onCopyLink, onMemberRoleChange, onRemoveMember, onLinkAccessChange, onDownload, onInfo, onClose }: { file: FolderFile; accountName: string; shareSettings: FileShareSettings; focusOnOpen?: boolean; openShareInitially?: boolean; copyFeedback: CopyFeedback; onCopyLink: () => void; onMemberRoleChange: (memberId: string, role: ShareRole) => void; onRemoveMember: (memberId: string) => void; onLinkAccessChange: (access: ShareLinkAccess) => void; onDownload: () => void; onInfo: () => void; onClose: (restoreFocus?: boolean) => void }) {
  const [loadState, setLoadState] = useState<'loaded' | 'loading' | 'unsupported' | 'error'>(file.storageId ? 'loading' : file.previewAvailable === false ? 'error' : 'loaded')
  const [storedPreview, setStoredPreview] = useState<{ kind: 'text'; content: string } | { kind: 'url'; url: string; mimeType: string } | null>(null)
  const [isShareOpen, setIsShareOpen] = useState(openShareInitially)
  const [isLinkAccessOpen, setIsLinkAccessOpen] = useState(false)
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<string | null>(null)
  const [accessToast, setAccessToast] = useState('')
  const [editorToolbarPosition, setEditorToolbarPosition] = useState<EditorToolbarPosition | null>(null)
  const [editorBlockStyle, setEditorBlockStyle] = useState<'Header 1' | 'Body'>('Body')
  const [isEditorBulleted, setIsEditorBulleted] = useState(false)
  const retryTimerRef = useRef<number | null>(null)
  const previewDocumentRef = useRef<HTMLElement>(null)
  const editorSelectionRef = useRef<Range | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const shareTriggerRef = useRef<HTMLButtonElement>(null)
  const removeAccessCancelRef = useRef<HTMLButtonElement>(null)
  const accessToastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let disposed = false
    let objectUrl = ''
    const load = async () => {
      if (!file.storageId) { setLoadState(file.previewAvailable === false ? 'error' : 'loaded'); setStoredPreview(null); return }
      setLoadState('loading')
      try {
        const stored = await getStoredFile(file.storageId)
        if (!stored) throw new Error('Missing stored file')
        const mime = stored.type || file.mimeType || ''
        if (mime.startsWith('text/') || /\.(md|txt|json|csv|html|css|js|ts)$/i.test(file.name)) {
          const content = await stored.blob.text()
          if (!disposed) { setStoredPreview({ kind: 'text', content }); setLoadState('loaded') }
        } else if (mime.startsWith('image/') || mime === 'application/pdf' || /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(file.name)) {
          objectUrl = URL.createObjectURL(stored.blob)
          if (!disposed) { setStoredPreview({ kind: 'url', url: objectUrl, mimeType: mime }); setLoadState('loaded') }
        } else if (!disposed) { setStoredPreview(null); setLoadState('unsupported') }
      } catch { if (!disposed) setLoadState('error') }
    }
    void load()
    setIsShareOpen(openShareInitially)
    if (focusOnOpen) window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
      if (accessToastTimerRef.current !== null) window.clearTimeout(accessToastTimerRef.current)
    }
  }, [file, focusOnOpen, openShareInitially])

  useEffect(() => {
    const closeEditor = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.textEditorToolbar') && !target.closest('.editorFloatingPanel') && !target.closest('.previewDocument')) setEditorToolbarPosition(null)
    }
    document.addEventListener('mousedown', closeEditor)
    return () => document.removeEventListener('mousedown', closeEditor)
  }, [])

  useEffect(() => {
    if (!isShareOpen) return
    const closeShare = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.sharePermissionControl')) setIsLinkAccessOpen(false)
      if (!target.closest('[data-share-control]')) { setIsShareOpen(false); window.requestAnimationFrame(() => shareTriggerRef.current?.focus()) }
    }
    document.addEventListener('mousedown', closeShare)
    return () => {
      document.removeEventListener('mousedown', closeShare)
    }
  }, [isShareOpen])

  useEffect(() => { if (memberPendingRemoval) window.requestAnimationFrame(() => removeAccessCancelRef.current?.focus()) }, [memberPendingRemoval])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (editorToolbarPosition) setEditorToolbarPosition(null)
      else if (memberPendingRemoval) setMemberPendingRemoval(null)
      else if (isLinkAccessOpen) setIsLinkAccessOpen(false)
      else if (isShareOpen) { setIsShareOpen(false); window.requestAnimationFrame(() => shareTriggerRef.current?.focus()) }
      else onClose(focusOnOpen)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [editorToolbarPosition, focusOnOpen, isLinkAccessOpen, isShareOpen, memberPendingRemoval, onClose])

  const retryLoading = () => {
    setLoadState('loading')
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
    retryTimerRef.current = window.setTimeout(() => setLoadState(file.previewAvailable === false ? 'error' : 'loaded'), 600)
  }

  const showEditorForSelection = () => {
    const selection = window.getSelection()
    const documentElement = previewDocumentRef.current
    if (!selection || selection.isCollapsed || !selection.rangeCount || !documentElement || !documentElement.contains(selection.anchorNode)) {
      setEditorToolbarPosition(null)
      return
    }
    const selectionBounds = selection.getRangeAt(0).getBoundingClientRect()
    const selectionRange = selection.getRangeAt(0)
    editorSelectionRef.current = selectionRange.cloneRange()
    const selectionElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode as Element : selection.anchorNode?.parentElement
    setEditorBlockStyle(selectionElement?.closest('h1, h2') ? 'Header 1' : 'Body')
    setIsEditorBulleted(Boolean(selectionElement?.closest('li')) || document.queryCommandState('insertUnorderedList'))
    const toolbarWidth = 306
    setEditorToolbarPosition({
      left: Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, selectionBounds.left - 6)),
      top: Math.min(window.innerHeight - 34, selectionBounds.bottom + 8),
    })
  }

  const applyEditorFormat = (command: string, value?: string) => {
    const selection = window.getSelection()
    const savedRange = editorSelectionRef.current
    if (!selection || !savedRange) return
    previewDocumentRef.current?.focus({ preventScroll: true })
    selection.removeAllRanges()
    selection.addRange(savedRange)
    const wrapSelection = (styles: Partial<CSSStyleDeclaration>, format?: string) => {
      const wrapper = document.createElement('span')
      if (format) wrapper.dataset.editorFormat = format
      Object.assign(wrapper.style, styles)
      wrapper.append(savedRange.extractContents())
      savedRange.insertNode(wrapper)
      const nextSelection = document.createRange()
      nextSelection.selectNodeContents(wrapper)
      selection.removeAllRanges()
      selection.addRange(nextSelection)
      editorSelectionRef.current = nextSelection.cloneRange()
    }
    if (command === 'inlineTextStyle') {
      const wrapper = document.createElement('span')
      if (value === 'Header 1') {
        wrapper.style.fontSize = '16px'
        wrapper.style.lineHeight = '16px'
        wrapper.style.fontWeight = '500'
      } else {
        wrapper.style.fontSize = '12px'
        wrapper.style.lineHeight = '1.4'
        wrapper.style.fontWeight = '400'
      }
      wrapper.append(savedRange.extractContents())
      savedRange.insertNode(wrapper)
      const nextSelection = document.createRange()
      nextSelection.selectNodeContents(wrapper)
      selection.removeAllRanges()
      selection.addRange(nextSelection)
      editorSelectionRef.current = nextSelection.cloneRange()
      setEditorBlockStyle(value === 'Header 1' ? 'Header 1' : 'Body')
    } else if (command === 'inlineBold' || command === 'inlineItalic' || command === 'inlineUnderline') {
      const format = command.replace('inline', '').toLowerCase()
      const selectionElement = savedRange.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? savedRange.commonAncestorContainer as Element
        : savedRange.commonAncestorContainer.parentElement
      const semanticSelector = format === 'bold' ? 'strong, b' : format === 'italic' ? 'i, em' : 'u'
      const isAlreadyFormatted = Boolean(selectionElement?.closest(`[data-editor-format="${format}"], ${semanticSelector}`))
      const styles = format === 'bold'
        ? { fontWeight: isAlreadyFormatted ? '400' : '500' }
        : format === 'italic'
          ? { fontStyle: isAlreadyFormatted ? 'normal' : 'italic' }
          : { textDecoration: isAlreadyFormatted ? 'none' : 'underline' }
      wrapSelection(styles, format)
    } else if (command === 'foreColor' && value) {
      wrapSelection({ color: value }, 'color')
    } else if (command === 'createLink' && value) {
      const link = document.createElement('a')
      link.href = value
      link.rel = 'noopener noreferrer'
      link.append(savedRange.extractContents())
      savedRange.insertNode(link)
      const nextSelection = document.createRange()
      nextSelection.selectNodeContents(link)
      selection.removeAllRanges()
      selection.addRange(nextSelection)
      editorSelectionRef.current = nextSelection.cloneRange()
    } else if (command === 'insertImage' && value) {
      const image = document.createElement('img')
      image.src = value
      image.alt = ''
      savedRange.deleteContents()
      savedRange.insertNode(image)
      const nextSelection = document.createRange()
      nextSelection.setStartAfter(image)
      nextSelection.collapse(true)
      selection.removeAllRanges()
      selection.addRange(nextSelection)
      editorSelectionRef.current = nextSelection.cloneRange()
    } else document.execCommand(command, false, value)
    setIsEditorBulleted(document.queryCommandState('insertUnorderedList'))
    if (selection.rangeCount) {
      const nextRange = selection.getRangeAt(0)
      editorSelectionRef.current = nextRange.cloneRange()
      const bounds = nextRange.getBoundingClientRect()
      if (bounds.width || bounds.height) {
        const toolbarWidth = 306
        setEditorToolbarPosition({ left: Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, bounds.left - 6)), top: Math.min(window.innerHeight - 34, bounds.bottom + 8) })
      }
    }
  }

  const memberToRemove = shareSettings.members.find((member) => member.id === memberPendingRemoval) ?? null

  return (
    <>
    <aside className="filePreview" aria-label={`Preview of ${file.name}`}>
      <div className="previewTitle"><span>{file.name}</span><button ref={closeButtonRef} type="button" onClick={(event) => onClose(event.detail === 0)}><Icon src={icons.previewClose} />Close</button></div>
      <div className="previewCard">
        <div className="previewToolbar">
          <div className="fileMetadata">
            <span>{file.kind}</span><Icon src={icons.metadataDivider} /><span>{formatDisplayFileSize(file.size)}</span><Icon src={icons.metadataDivider} /><span>Aug 3</span>
          </div>
          <div className="previewActions">
            <button onClick={onInfo}><Icon src={icons.previewInfo} />Info</button>
            <div className="shareControl" data-share-control>
              <button ref={shareTriggerRef} className="shareButton" type="button" aria-haspopup="dialog" aria-expanded={isShareOpen} onClick={() => setIsShareOpen((open) => !open)}><Icon src={icons.previewShare} />Share</button>
              {isShareOpen && (
                <section className="sharePopover" role="dialog" aria-label={`Share ${file.name}`}>
                  <img className="sharePopoverPointer" src="/assets/share-tooltip.svg" alt="" aria-hidden="true" />
                  <div className="sharePopoverBody">
                    <div className="sharePeople">
                      <div className="shareHeadingRow">
                        <div className="shareHeading"><span>People with access to</span><img src="/assets/share-document.svg" alt="" aria-hidden="true" /><span>{file.name}</span></div>
                        <div className="sharePeopleCount" aria-label={`${shareSettings.members.length + 1} people have access`}><img src="/assets/share-people.svg" alt="" aria-hidden="true" /><span>{shareSettings.members.length + 1}</span></div>
                      </div>
                      <div className="shareMemberRow">
                        <div className="shareMember"><img className="shareAvatar" src="/assets/account-menu-avatar.png" alt="" /><span>{accountName}</span><span className="shareBadge">You</span></div>
                        <span className="shareOwnerRole">Owner</span>
                      </div>
                      {shareSettings.members.map((member, index) => <div className="shareMemberRow" key={member.id}>
                        <div className="shareMember"><WorkspaceAvatar name={member.name} email={member.email} variant={index + 1} /><span title={member.email}>{member.name}</span><ShareRoleControl member={member} onChange={(role) => onMemberRoleChange(member.id, role)} /></div>
                        <button type="button" onClick={() => { setMemberPendingRemoval(member.id); setIsShareOpen(false) }}>Remove</button>
                      </div>)}
                    </div>
                    <div className="shareFooter">
                      <div className="sharePermissionControl">
                        <button className="sharePermission" type="button" aria-haspopup="listbox" aria-expanded={isLinkAccessOpen} onClick={() => setIsLinkAccessOpen((open) => !open)}>{shareSettings.linkAccess === 'restricted' ? 'Restricted' : shareSettings.linkAccess === 'viewer' ? 'Anyone with link · Viewer' : 'Anyone with link · Editor'}<img src="/assets/share-extra-1.svg" alt="" aria-hidden="true" /></button>
                        {isLinkAccessOpen && <div className="sharePermissionMenu" role="listbox" aria-label="Link access">
                          {([['restricted', 'Restricted'], ['viewer', 'Anyone with link · Viewer'], ['editor', 'Anyone with link · Editor']] as const).map(([value, label]) => <button type="button" role="option" aria-selected={shareSettings.linkAccess === value} key={value} onClick={() => { onLinkAccessChange(value); setIsLinkAccessOpen(false) }}><span>{label}</span>{shareSettings.linkAccess === value && <img src="/assets/workspace-menu-check.svg" alt="" aria-hidden="true" />}</button>)}
                        </div>}
                      </div>
                      <button className="shareCopyLink" type="button" onClick={onCopyLink}><img src={copyFeedback?.status === 'success' ? icons.downloadSuccess : copyFeedback?.status === 'failure' ? icons.previewClose : '/assets/share-chevron.svg'} alt="" />{copyFeedback?.status === 'success' ? 'Link copied' : copyFeedback?.status === 'failure' ? 'Copy failed' : 'Copy link'}</button>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <button onClick={onDownload}><Icon src={icons.previewDownload} />Download</button>
          </div>
        </div>
        {loadState === 'error' || loadState === 'loading' || loadState === 'unsupported' ? (
          <div className="previewLoadState" role={loadState === 'error' ? 'alert' : 'status'}>
            <strong>{loadState === 'loading' ? 'Loading file…' : loadState === 'unsupported' ? 'Preview isn’t available for this file type' : 'Couldn’t load this file'}</strong>
            {loadState === 'unsupported' && <span>The file is stored safely and can still be downloaded.</span>}
            {loadState === 'error' && <button type="button" onClick={retryLoading}><Icon src={icons.previewRetry} />Try again</button>}
          </div>
        ) : storedPreview?.kind === 'url' ? (storedPreview.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name) ? <iframe className="storedFilePreview" src={storedPreview.url} title={file.name} /> : <img className="storedFileImage" src={storedPreview.url} alt={file.name} />) : storedPreview?.kind === 'text' ? <article className="previewDocument storedTextPreview"><pre>{storedPreview.content}</pre></article> : <article className="previewDocument" ref={previewDocumentRef} contentEditable suppressContentEditableWarning onClick={(event) => { const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]'); if (link && window.getSelection()?.isCollapsed) { event.preventDefault(); window.open(link.href, '_blank', 'noopener,noreferrer') } }} onMouseUp={showEditorForSelection} onKeyUp={showEditorForSelection} onContextMenu={(event) => { if (editorToolbarPosition) event.preventDefault() }}>
          <h2>{file.name}</h2>
          <p><strong>Your Folder is ready to go the moment you sign up.</strong><br />It ships with three things: `folder.md` as the root operating file, a set of reusable prompt files for common agent tasks, and a live API key created during signup.</p>
          <p><strong>The core idea</strong><br />Everything lives in one place, and `folder.md` is the entry point. Whenever an agent starts a task, it reads `folder.md` first — that&apos;s how it learns the context, the conventions, and where things belong.</p>
          <p><strong>Your first three moves</strong><br />Start by editing `folder.md` so it reflects how you actually work. Then upload your source material — notes, screenshots, drafts, whatever the task needs. Finally, hand it to an agent with one instruction: read `folder.md` first, and keep the structure tidy as you go.</p>
          <p><strong>What this is good for</strong><br />A Folder shines when you need to turn loose notes into clean docs without losing the meaning, or when you want to drop in a pile of assets and let an agent sort them into a sane structure. It&apos;s also the natural home for project context, so a fresh agent can onboard in a single read. The rule of thumb: one Folder per project, client, or workstream.</p>
          <p><strong>Handing off to an agent — what to say</strong><br />&gt; Use my Folder as the working space for this task. Read `folder.md` first, keep the file structure tidy, and explain what you saved when you&apos;re done.<br />That&apos;s it. The agent takes it from there.</p>
        </article>}
      </div>
      {editorToolbarPosition && createPortal(<TextEditorToolbar position={editorToolbarPosition} blockStyle={editorBlockStyle} isBulleted={isEditorBulleted} onFormat={applyEditorFormat} />, document.body)}
    </aside>
    {memberToRemove && <div className="newFolderBackdrop deleteItemBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMemberPendingRemoval(null) }}>
      <section className="deleteItemModal removeAccessModal" role="alertdialog" aria-modal="true" aria-labelledby="remove-access-title">
        <header><div><img src="/assets/delete-modal-trash.svg" alt="" aria-hidden="true" /><h2 id="remove-access-title">Remove access</h2></div><button type="button" aria-label="Close remove access dialog" onClick={() => setMemberPendingRemoval(null)}><img src="/assets/delete-modal-close.svg" alt="" aria-hidden="true" /></button></header>
        <div className="deleteItemContent">
          <div className="removeAccessSummary"><div><span>Person</span><strong>{memberToRemove.name}</strong></div><div><span>File</span><strong>{file.name}</strong></div></div>
          <p>They will immediately lose access to this file.</p>
          <footer><button ref={removeAccessCancelRef} type="button" onClick={() => setMemberPendingRemoval(null)}>Cancel</button><button className="deleteItemConfirm" type="button" onClick={() => { const removedName = memberToRemove.name; onRemoveMember(memberToRemove.id); setMemberPendingRemoval(null); setAccessToast(`${removedName} no longer has access.`); if (accessToastTimerRef.current !== null) window.clearTimeout(accessToastTimerRef.current); accessToastTimerRef.current = window.setTimeout(() => setAccessToast(''), 3000) }}><img src="/assets/member-trash.svg" alt="" aria-hidden="true" />Remove access</button></footer>
        </div>
      </section>
    </div>}
    {accessToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Access removed</strong><span>{accessToast}</span></div></div>}
    </>
  )
}

function formatActivityTime(createdAt: number, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000))
  if (elapsedSeconds < 60) return 'Just now'
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function RecentActivity({ activity, folderName }: { activity: FolderActivity[]; folderName: string }) {
  const [now, setNow] = useState(Date.now())
  const [pageSize, setPageSize] = useState(() => Math.max(1, Math.floor((window.innerHeight - 98) / 78)))
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    const updatePageSize = () => setPageSize(Math.max(1, Math.floor((window.innerHeight - 98) / 78)))
    window.addEventListener('resize', updatePageSize)
    return () => window.removeEventListener('resize', updatePageSize)
  }, [])
  useEffect(() => setShowAll(false), [folderName])
  const visibleCount = showAll ? activity.length : pageSize
  return (
    <section className="recentActivity">
      <h2>Recent Activity</h2>
      {activity.length ? <div className={`activityList${showAll ? ' expanded' : ''}`}>
        {activity.slice(0, visibleCount).map((item, index) => (
          <div className="activityItem" key={item.id}>
            <div className="activityTrack">
              <span className="activityDot" />
              {index < activity.length - 1 && <img src={icons.activityLine} alt="" aria-hidden="true" />}
            </div>
            <div className="activityBody">
              <div className="activityTop"><span>{item.actor}</span><span className="activityBadge">{item.action}</span><time dateTime={new Date(item.createdAt).toISOString()}>{formatActivityTime(item.createdAt, now)}</time></div>
              <p title={`${folderName} / ${item.fileName}`}>
                <span className="activityFilePath">{folderName} /</span>
                <span className="activityFileName">{item.fileName}</span>
              </p>
            </div>
          </div>
        ))}
        {!showAll && visibleCount < activity.length && <button className="activitySeeMore" type="button" onClick={() => setShowAll(true)}>See more<Icon src={icons.chevron} /></button>}
      </div> : <p className="activityEmpty">No file activity yet.</p>}
    </section>
  )
}

function Stats({ folderCount, fileCount, storageUsed }: { folderCount: number; fileCount: number; storageUsed: string }) {
  return (
    <dl className="stats">
      <div><dt>Folders</dt><dd>{folderCount}</dd></div>
      <div><dt>Files</dt><dd>{fileCount}</dd></div>
      <div><dt>Storage used</dt><dd>{storageUsed}</dd></div>
    </dl>
  )
}

function ModalFocusManager() {
  useEffect(() => {
    let activeModal: HTMLElement | null = null
    let modalStack: HTMLElement[] = []
    let lastInteractionTarget: HTMLElement | null = null
    const returnFocusByModal = new Map<HTMLElement, HTMLElement | null>()
    const inertedElements = new Map<HTMLElement, boolean>()
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'

    const restoreInertState = () => {
      inertedElements.forEach((wasInert, element) => { element.inert = wasInert })
      inertedElements.clear()
    }

    const makeBackgroundInert = (modal: HTMLElement) => {
      restoreInertState()
      let branch: HTMLElement = modal
      while (branch.parentElement && branch.parentElement !== document.body) {
        Array.from(branch.parentElement.children).forEach((sibling) => {
          if (!(sibling instanceof HTMLElement) || sibling === branch) return
          inertedElements.set(sibling, sibling.inert)
          sibling.inert = true
        })
        branch = branch.parentElement
      }
    }

    const syncModal = () => {
      const modals = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'))
      const topModal = modals.at(-1) ?? null
      if (topModal === activeModal) return
      const previousTop = activeModal
      const previousFocusTarget = previousTop ? returnFocusByModal.get(previousTop) : null

      if (topModal) {
        if (!returnFocusByModal.has(topModal)) {
          const focusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
          const focusTarget = focusedElement && !topModal.contains(focusedElement) ? focusedElement : lastInteractionTarget
          returnFocusByModal.set(topModal, focusTarget?.isConnected && !topModal.contains(focusTarget) ? focusTarget : null)
        }
        activeModal = topModal
        modalStack = modals
        document.body.style.overflow = 'hidden'
        makeBackgroundInert(topModal)
        window.requestAnimationFrame(() => {
          if (previousTop && !modals.includes(previousTop) && previousFocusTarget?.isConnected && topModal.contains(previousFocusTarget)) {
            previousFocusTarget.focus({ preventScroll: true })
            return
          }
          topModal.querySelector<HTMLElement>('[autofocus], button:not(:disabled), input:not(:disabled), [tabindex="0"]')?.focus({ preventScroll: true })
        })
      } else {
        const firstModal = modalStack[0]
        const target = firstModal ? returnFocusByModal.get(firstModal) : previousFocusTarget
        activeModal = null
        modalStack = []
        document.body.style.overflow = ''
        restoreInertState()
        if (target?.isConnected) window.requestAnimationFrame(() => target.focus({ preventScroll: true }))
      }

      Array.from(returnFocusByModal.keys()).forEach((modal) => { if (!modals.includes(modal)) returnFocusByModal.delete(modal) })
    }

    const rememberPointerTarget = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('button, [href], input, select, textarea, [tabindex]') : null
      if (target) lastInteractionTarget = target
    }

    const rememberKeyboardTarget = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (document.activeElement instanceof HTMLElement) lastInteractionTarget = document.activeElement
    }

    const handleModalKeys = (event: KeyboardEvent) => {
      if (!activeModal) return
      if (event.key === 'Escape') {
        const hasOpenControl = Array.from(document.querySelectorAll<HTMLElement>('[aria-expanded="true"]')).some((control) => !control.closest('[inert]'))
        if (hasOpenControl) return
        const dismissButton = activeModal.querySelector<HTMLButtonElement>('[data-modal-close], button[aria-label*="close" i], button[aria-label="Cancel upload"]')
        if (!dismissButton || dismissButton.disabled) return
        event.preventDefault()
        event.stopImmediatePropagation()
        dismissButton.click()
        return
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(activeModal.querySelectorAll<HTMLElement>(focusableSelector)).filter((control) => control.getClientRects().length > 0)
      if (!controls.length) { event.preventDefault(); activeModal.focus(); return }
      const first = controls[0]; const last = controls.at(-1)!
      if (!activeModal.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const observer = new MutationObserver(syncModal)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('pointerdown', rememberPointerTarget, true)
    document.addEventListener('keydown', rememberKeyboardTarget, true)
    document.addEventListener('keydown', handleModalKeys, true)
    syncModal()
    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', rememberPointerTarget, true)
      document.removeEventListener('keydown', rememberKeyboardTarget, true)
      document.removeEventListener('keydown', handleModalKeys, true)
      document.body.style.overflow = ''
      restoreInertState()
    }
  }, [])
  return null
}

export default function App() {
  const [showUploadDemo, setShowUploadDemo] = useState(() => new URLSearchParams(window.location.search).get('upload-demo') === '1')
  const [workspaces, setWorkspaces] = useState<Workspace[]>(readWorkspaces)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => window.localStorage.getItem('beam-active-workspace') || 'personal')
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]
  const [workspaceContent, setWorkspaceContent] = useState<Record<string, WorkspaceContent>>(readWorkspaceContent)
  const workspaceContentRef = useRef(workspaceContent)
  const activeContent = workspaceContent[activeWorkspace.id] ?? { folders: [], files: [], folderContents: {} }
  const folderRows = activeContent.folders
  const homeFiles = activeContent.files
  const folderContents = activeContent.folderContents
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSearching, setIsSearching] = useState(() => Boolean(new URLSearchParams(window.location.search).get('search')?.trim()))
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('search') ?? '')
  const [searchFilter, setSearchFilter] = useState<'all' | FileKind>(() => { const filter = new URLSearchParams(window.location.search).get('filter'); return filter === 'folder' || filter === 'file' ? filter : 'all' })
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const requestedView = searchParams.get('view')
    if (searchParams.get('upload-demo') === '1') return 'folder'
    if (searchParams.get('folder')) return 'folder'
    return requestedView === 'settings' || requestedView === 'apiKeys' || requestedView === 'account' || requestedView === 'billing' ? requestedView : 'home'
  })
  const [selectedFolderName, setSelectedFolderName] = useState(() => new URLSearchParams(window.location.search).get('folder') || 'Folder 001')
  const [selectedSearchFileName, setSelectedSearchFileName] = useState<string | null>(null)
  const [folderToRename, setFolderToRename] = useState<string | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [isEmptyCreateOpen, setIsEmptyCreateOpen] = useState(false)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [settingsLeaveRequest, setSettingsLeaveRequest] = useState(0)
  const pendingNavigationRef = useRef<(() => void) | null>(null)
  const historyIndexRef = useRef(0)
  const bypassHistoryGuardRef = useRef(false)
  const [settingsSaveToast, setSettingsSaveToast] = useState('')
  const [accountName, setAccountName] = useState(readAccountName)
  const [accountSaveToast, setAccountSaveToast] = useState('')
  const [workspaceCreateToast, setWorkspaceCreateToast] = useState('')
  const [workspaceDeleteToast, setWorkspaceDeleteToast] = useState('')
  const [mutationNotice, setMutationNotice] = useState<MutationNotice>(null)
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(() => new URLSearchParams(window.location.search).get('create-workspace') === '1')
  const settingsSaveToastTimer = useRef<number | null>(null)
  const accountSaveToastTimer = useRef<number | null>(null)
  const workspaceCreateToastTimer = useRef<number | null>(null)
  const workspaceDeleteToastTimer = useRef<number | null>(null)
  const mutationNoticeTimer = useRef<number | null>(null)
  const workspaceBehavior = readWorkspaceBehavior(activeWorkspace.id)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const nestedSearchFiles: FileRow[] = Object.entries(folderContents).flatMap(([folderName, nestedFiles]) => nestedFiles.map((file) => ({ ...file, kind: 'file' as const, folderName, path: `${folderName} / ${file.name}` })))
  const searchResults = [...homeFiles, ...nestedSearchFiles].filter((file) =>
    (searchFilter === 'all' || file.kind === searchFilter) &&
    (!normalizedQuery || file.name.toLowerCase().includes(normalizedQuery)),
  )
  const totalFileCount = Object.values(folderContents).reduce((total, items) => total + items.length, 0)
  const totalStorageBytes = Object.values(folderContents).flat().reduce((total, file) => total + fileSizeInBytes(file.size), 0)
  const storageSummary = `${Math.round(totalStorageBytes / (1024 * 1024)).toLocaleString('en-US')} MB`

  useEffect(() => {
    if (typeof window.history.state?.beamIndex !== 'number') window.history.replaceState({ ...window.history.state, beamIndex: 0 }, '', window.location.href)
    historyIndexRef.current = window.history.state?.beamIndex ?? 0
    const restoreViewFromUrl = () => {
      const parameters = new URLSearchParams(window.location.search)
      const requestedView = parameters.get('view')
      const destination = requestedView === 'settings' || requestedView === 'apiKeys' || requestedView === 'account' || requestedView === 'billing' ? requestedView : 'home'
      const destinationIndex = typeof window.history.state?.beamIndex === 'number' ? window.history.state.beamIndex : historyIndexRef.current - 1
      const historyDelta = destinationIndex - historyIndexRef.current
      if (!bypassHistoryGuardRef.current && currentView === 'settings' && settingsDirty && destination !== 'settings') {
        if (historyDelta) window.history.go(-historyDelta)
        if (!pendingNavigationRef.current) {
          pendingNavigationRef.current = () => { bypassHistoryGuardRef.current = true; window.history.go(historyDelta || -1) }
          setSettingsLeaveRequest((request) => request + 1)
        }
      } else {
        bypassHistoryGuardRef.current = false
        historyIndexRef.current = destinationIndex
        setCurrentView(parameters.get('folder') ? 'folder' : destination)
        setSearchQuery(parameters.get('search') ?? '')
        setIsSearching(Boolean(parameters.get('search')?.trim()))
        if (parameters.get('folder')) setSelectedFolderName(parameters.get('folder')!)
      }
    }
    window.addEventListener('popstate', restoreViewFromUrl)
    return () => window.removeEventListener('popstate', restoreViewFromUrl)
  }, [currentView, settingsDirty])

  useEffect(() => () => {
    [settingsSaveToastTimer, accountSaveToastTimer, workspaceCreateToastTimer, workspaceDeleteToastTimer, mutationNoticeTimer].forEach((timer) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    })
  }, [])

  useEffect(() => {
    const syncWorkspaceContent = (event: StorageEvent) => {
      if (event.key !== 'beam-workspace-content-v1' || !event.newValue) return
      try {
        const nextContent = JSON.parse(event.newValue) as Record<string, WorkspaceContent>
        workspaceContentRef.current = nextContent
        setWorkspaceContent(nextContent)
      } catch { /* Ignore incomplete data from another tab. */ }
    }
    window.addEventListener('storage', syncWorkspaceContent)
    return () => window.removeEventListener('storage', syncWorkspaceContent)
  }, [])

  const mutateWorkspaceContent = (workspaceId: string, label: string, update: (content: WorkspaceContent) => WorkspaceContent, onConfirmed?: () => void) => {
    if (mutationNoticeTimer.current !== null) window.clearTimeout(mutationNoticeTimer.current)
    setMutationNotice({ state: 'saving', label })
    const previous = workspaceContentRef.current
    const content = previous[workspaceId] ?? { folders: [], files: [], folderContents: {} }
    const next = { ...previous, [workspaceId]: update(content) }
    workspaceContentRef.current = next
    setWorkspaceContent(next)
    try {
      window.localStorage.setItem('beam-workspace-content-v1', JSON.stringify(next))
      setMutationNotice({ state: 'success', label })
      onConfirmed?.()
      mutationNoticeTimer.current = window.setTimeout(() => setMutationNotice(null), 2400)
    } catch {
      workspaceContentRef.current = previous
      setWorkspaceContent(previous)
      setMutationNotice({ state: 'error', label })
    }
  }

  const requestSettingsLeave = (action: () => void, replacePending = false) => {
    if (currentView !== 'settings' || !settingsDirty) { action(); return false }
    const hadPendingNavigation = Boolean(pendingNavigationRef.current)
    if (!hadPendingNavigation || replacePending) pendingNavigationRef.current = action
    if (!hadPendingNavigation) setSettingsLeaveRequest((request) => request + 1)
    return true
  }

  const commitView = (view: AppView) => {
    setCurrentView(view)
    const url = new URL(window.location.href)
    if (view === 'home' || view === 'folder') url.searchParams.delete('view')
    else url.searchParams.set('view', view)
    url.hash = ''
    historyIndexRef.current += 1
    window.history.pushState({ beamIndex: historyIndexRef.current }, '', url)
  }

  const openView = (view: AppView) => {
    requestSettingsLeave(() => commitView(view))
  }

  const startSearch = () => {
    requestSettingsLeave(() => setIsSidebarCollapsed(false))
  }

  const updateSearchQuery = (query: string) => {
    requestSettingsLeave(() => {
      setSearchQuery(query)
      setIsSearching(query.trim().length > 0)
      if (query.trim().length === 0) { setSearchFilter('all'); commitView('home') }
    }, true)
  }

  const openFolder = (name: string) => {
    requestSettingsLeave(() => {
      setSelectedFolderName(name); setSelectedSearchFileName(null); commitView('folder')
      setSearchQuery(''); setIsSearching(false); setSearchFilter('all')
    })
  }

  const openSearchFile = (file: FileRow) => {
    if (!file.folderName) return
    setSelectedFolderName(file.folderName)
    setSelectedSearchFileName(file.name)
    window.sessionStorage.setItem('beam-open-file', file.name)
    window.sessionStorage.setItem('beam-open-file-focus', '1')
    setCurrentView('folder')
    setSearchQuery('')
    setIsSearching(false)
    setSearchFilter('all')
  }

  const createFolder = (name: string) => {
    if (activeContent.folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    mutateWorkspaceContent(activeWorkspace.id, `Creating ${name}`, (content) => ({
      folders: [...content.folders, { name, count: 0 }], files: [...content.files, { name, size: '0B', modified: 'Just now', kind: 'folder' }], folderContents: { ...content.folderContents, [name]: [] },
    }))
    openView('home')
    setSearchQuery('')
    setIsSearching(false)
  }

  const renameFolder = (newName: string) => {
    if (!folderToRename) return
    if (activeContent.folders.some((folder) => folder.name !== folderToRename && folder.name.toLocaleLowerCase() === newName.toLocaleLowerCase())) return
    const previousName = folderToRename
    mutateWorkspaceContent(activeWorkspace.id, `Renaming ${previousName}`, (content) => {
      const { [previousName]: renamedItems = [], ...remainingContents } = content.folderContents
      return {
      folders: content.folders.map((folder) => folder.name === previousName ? { ...folder, name: newName } : folder),
      files: content.files.map((file) => file.name === previousName ? { ...file, name: newName } : file),
      folderContents: { ...remainingContents, [newName]: renamedItems },
    } })
    if (selectedFolderName === folderToRename) setSelectedFolderName(newName)
    setFolderToRename(null)
  }

  const removeFolder = (folderName: string) => {
    let storedFilesToDelete: FolderFile[] = []
    mutateWorkspaceContent(activeWorkspace.id, `Deleting ${folderName}`, (content) => { const { [folderName]: deletedItems = [], ...remainingContents } = content.folderContents; storedFilesToDelete = deletedItems; return {
      folders: content.folders.filter((folder) => folder.name !== folderName), files: content.files.filter((file) => file.name !== folderName), folderContents: remainingContents,
    } }, () => storedFilesToDelete.forEach((file) => { if (file.storageId) void deleteStoredFile(file.storageId) }))
    if (selectedFolderName === folderName) openView('home')
    setFolderToDelete(null)
  }

  const requestFolderDelete = (folderName: string) => {
    if (workspaceBehavior.confirmDelete) setFolderToDelete(folderName)
    else removeFolder(folderName)
  }

  const showSettingsSaveToast = (changeCount: number) => {
    if (settingsSaveToastTimer.current !== null) window.clearTimeout(settingsSaveToastTimer.current)
    setSettingsSaveToast(`${changeCount} ${changeCount === 1 ? 'change' : 'changes'} saved.`)
    settingsSaveToastTimer.current = window.setTimeout(() => setSettingsSaveToast(''), 3000)
  }

  const commitWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId)
    window.localStorage.setItem('beam-active-workspace', workspaceId)
    setSettingsDirty(false)
    setSearchQuery('')
    setIsSearching(false)
    setSearchFilter('all')
    setSelectedSearchFileName(null)
    setSelectedFolderName('')
    setFolderToRename(null)
    setFolderToDelete(null)
    setIsEmptyCreateOpen(false)
    setIsCreateWorkspaceOpen(false)
    setShowUploadDemo(false)
    window.sessionStorage.removeItem('beam-open-file')
    window.sessionStorage.removeItem('beam-open-file-focus')
  }

  const commitWorkspaceHome = (workspaceId: string) => {
    commitWorkspaceChange(workspaceId)
    setCurrentView('home')
    const url = new URL(window.location.href)
    ;['view', 'folder', 'file', 'search', 'filter', 'section', 'upload-demo', 'create-workspace'].forEach((parameter) => url.searchParams.delete(parameter))
    url.hash = ''
    historyIndexRef.current += 1
    window.history.pushState({ beamIndex: historyIndexRef.current }, '', url)
  }

  const changeWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspace.id) return
    requestSettingsLeave(() => commitWorkspaceHome(workspaceId))
  }

  const renameWorkspace = (workspaceId: string, name: string) => {
    setWorkspaces((current) => current.map((workspace) => workspace.id === workspaceId ? { ...workspace, name } : workspace))
  }

  const saveAccountName = (name: string) => {
    window.localStorage.setItem('beam-account-display-name', name)
    for (const workspace of workspaces) {
      try {
        const key = `beam-members-v1-${workspace.id}`
        const stored = window.localStorage.getItem(key)
        if (!stored) continue
        const members = JSON.parse(stored) as Array<{ id: string; name: string; email: string; role: WorkspaceRole; status: string }>
        window.localStorage.setItem(key, JSON.stringify(members.map((member) => member.email.toLocaleLowerCase() === accountEmail ? { ...member, name } : member)))
      } catch { /* Keep the account save available if prototype member data is invalid. */ }
    }
    setAccountName(name)
    if (accountSaveToastTimer.current !== null) window.clearTimeout(accountSaveToastTimer.current)
    setAccountSaveToast(`${name} is now your display name.`)
    accountSaveToastTimer.current = window.setTimeout(() => setAccountSaveToast(''), 3000)
  }
  const showPasswordUpdateToast = () => {
    if (accountSaveToastTimer.current !== null) window.clearTimeout(accountSaveToastTimer.current)
    setAccountSaveToast('Your password was updated successfully.')
    accountSaveToastTimer.current = window.setTimeout(() => setAccountSaveToast(''), 3000)
  }

  const createWorkspace = ({ name, invitations }: { name: string; invitations: Array<{ email: string; role: 'Admin' | 'Editor' | 'Viewer' }> }) => {
    const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
    let workspaceId = baseId
    let suffix = 2
    while (workspaces.some((workspace) => workspace.id === workspaceId)) { workspaceId = `${baseId}-${suffix}`; suffix += 1 }
    const workspace: Workspace = { id: workspaceId, name, icon: icons.companyAbc, role: 'Owner' }
    const nextWorkspaces = [...workspaces, workspace]
    setWorkspaces(nextWorkspaces)
    window.localStorage.setItem('beam-created-workspaces-v1', JSON.stringify(nextWorkspaces.filter((candidate) => !initialWorkspaces.some((initial) => initial.id === candidate.id))))
    window.localStorage.setItem(`beam-api-keys-v1-${workspaceId}`, '[]')
    window.localStorage.setItem(`beam-members-v1-${workspaceId}`, JSON.stringify([
      { id: 'michele', name: accountName, email: accountEmail, role: 'Owner', status: 'Active' },
      ...invitations.map((invitation, index) => ({ id: `invite-${Date.now()}-${index}`, name: invitation.email.split('@')[0], email: invitation.email, role: invitation.role, status: 'Pending' })),
    ]))
    mutateWorkspaceContent(workspaceId, `Creating ${name}`, () => ({ folders: [], files: [], folderContents: {} }))
    setIsCreateWorkspaceOpen(false)
    commitWorkspaceHome(workspaceId)
    setWorkspaceCreateToast(`${name} is ready to use.`)
    if (workspaceCreateToastTimer.current !== null) window.clearTimeout(workspaceCreateToastTimer.current)
    workspaceCreateToastTimer.current = window.setTimeout(() => setWorkspaceCreateToast(''), 3000)
  }

  const deleteWorkspace = (workspaceId: string) => {
    if (initialWorkspaces.some((workspace) => workspace.id === workspaceId)) return
    const workspaceToDelete = workspaces.find((workspace) => workspace.id === workspaceId)
    const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId)
    const { [workspaceId]: _deletedContent, ...nextWorkspaceContent } = workspaceContent
    setMutationNotice({ state: 'saving', label: `Deleting ${workspaceToDelete?.name ?? 'workspace'}` })
    try { window.localStorage.setItem('beam-workspace-content-v1', JSON.stringify(nextWorkspaceContent)) }
    catch { setMutationNotice({ state: 'error', label: `Deleting ${workspaceToDelete?.name ?? 'workspace'}` }); return }
    setWorkspaces(nextWorkspaces)
    window.localStorage.setItem('beam-created-workspaces-v1', JSON.stringify(nextWorkspaces.filter((workspace) => !initialWorkspaces.some((initial) => initial.id === workspace.id))))
    workspaceContentRef.current = nextWorkspaceContent
    setWorkspaceContent(nextWorkspaceContent)
    ;[`beam-settings-v3-${workspaceId}`, `beam-members-v1-${workspaceId}`, `beam-api-keys-v1-${workspaceId}`, `beam-billing-v1-${workspaceId}`].forEach((key) => window.localStorage.removeItem(key))
    setSettingsDirty(false)
    commitWorkspaceHome('personal')
    setWorkspaceDeleteToast(`${workspaceToDelete?.name ?? 'Workspace'} was permanently deleted.`)
    setMutationNotice({ state: 'success', label: `Deleted ${workspaceToDelete?.name ?? 'workspace'}` })
    if (workspaceDeleteToastTimer.current !== null) window.clearTimeout(workspaceDeleteToastTimer.current)
    workspaceDeleteToastTimer.current = window.setTimeout(() => setWorkspaceDeleteToast(''), 3000)
  }

  return (
    <main className={`appShell${isSidebarCollapsed ? ' sidebarCollapsed' : ''}`}>
      <ModalFocusManager />
      <Sidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={changeWorkspace}
        onCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
        canEditWorkspace={activeWorkspace.role !== 'Viewer'}
        accountName={accountName}
        folders={folderRows}
        activeFolderName={selectedFolderName}
        isCollapsed={isSidebarCollapsed}
        isSearching={isSearching}
        searchQuery={searchQuery}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
        onStartSearch={startSearch}
        onSearchChange={updateSearchQuery}
        onOpenFolder={openFolder}
        onCreateFolder={createFolder}
        isApiKeysActive={currentView === 'apiKeys'}
        onOpenApiKeys={() => { openView('apiKeys'); setSearchQuery(''); setIsSearching(false) }}
        isSettingsActive={currentView === 'settings'}
        isFolderNavigationActive={currentView === 'home' || currentView === 'folder'}
        onOpenSettings={() => { openView('settings'); setSearchQuery(''); setIsSearching(false) }}
        onOpenAccount={() => { openView('account'); setSearchQuery(''); setIsSearching(false) }}
        onOpenBilling={() => { openView('billing'); setSearchQuery(''); setIsSearching(false) }}
      />
      <section className="content">
        {currentView === 'billing' && !isSearching ? <BillingUsagePage key={activeWorkspace.id} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} storageUsedMb={Math.round(totalStorageBytes / (1024 * 1024))} /> : currentView === 'account' && !isSearching ? <AccountProfilePage displayName={accountName} onDisplayNameSave={saveAccountName} onPasswordUpdateSuccess={showPasswordUpdateToast} /> : currentView === 'settings' && !isSearching ? <SettingsPage key={activeWorkspace.id} workspace={activeWorkspace} storageUsedMb={Math.round(totalStorageBytes / (1024 * 1024))} onOpenApiKeys={() => openView('apiKeys')} onWorkspaceNameChange={renameWorkspace} canDeleteWorkspace={!initialWorkspaces.some((workspace) => workspace.id === activeWorkspace.id)} onDeleteWorkspace={deleteWorkspace} onDirtyChange={setSettingsDirty} onSaveSuccess={showSettingsSaveToast} leaveRequest={settingsLeaveRequest} onLeaveResolved={(proceed) => {
          if (!proceed) { pendingNavigationRef.current = null; return }
          setSettingsDirty(false)
          const action = pendingNavigationRef.current; pendingNavigationRef.current = null; action?.()
        }} /> : currentView === 'apiKeys' && !isSearching ? <ApiKeysPage key={activeWorkspace.id} workspaceId={activeWorkspace.id} readOnly={activeWorkspace.role === 'Viewer'} /> : currentView === 'folder' && !isSearching ? <FolderDetail key={`${activeWorkspace.id}-${selectedFolderName}`} workspaceId={activeWorkspace.id} accountName={accountName} folderName={selectedFolderName} initialItems={folderContents[selectedFolderName] ?? []} initialSelectedFileName={selectedSearchFileName} readOnly={activeWorkspace.role === 'Viewer'} defaultView={workspaceBehavior.defaultView} confirmDelete={workspaceBehavior.confirmDelete} trashRetention={workspaceBehavior.trashRetention} onItemsChange={(items, removedFile) => {
          mutateWorkspaceContent(activeWorkspace.id, `Saving ${selectedFolderName}`, (content) => ({
            folders: content.folders.map((folder) => folder.name === selectedFolderName ? { ...folder, count: items.length } : folder), files: content.files.map((file) => file.name === selectedFolderName ? { ...file, size: formatFileSize(items.reduce((total, item) => total + fileSizeInBytes(item.size), 0)), modified: 'Just now' } : file), folderContents: { ...content.folderContents, [selectedFolderName]: items },
          }), () => { if (removedFile?.storageId) void deleteStoredFile(removedFile.storageId) })
        }} onBack={() => setCurrentView('home')} /> : isSearching ? (
          <>
            <div className="searchFilters" aria-label="Search filters">
              {(['all', 'folder', 'file'] as const).map((filter) => (
                <button className={searchFilter === filter ? 'active' : ''} type="button" aria-pressed={searchFilter === filter} key={filter} onClick={() => setSearchFilter(filter)}>
                  {filter[0].toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="contentGrid searchGrid">{searchResults.length ? <><FileTable rows={searchResults} showHeader={false} onOpenFolder={openFolder} onOpenFile={openSearchFile} onRenameFolder={activeWorkspace.role === 'Viewer' ? undefined : setFolderToRename} onDeleteFolder={activeWorkspace.role === 'Viewer' ? undefined : requestFolderDelete} /><Stats folderCount={folderRows.length} fileCount={totalFileCount} storageUsed={storageSummary} /></> : <section className="searchEmptyState" role="status"><h2>No results found</h2><p>Try a different search or filter.</p></section>}</div>
          </>
        ) : (
          <>
            <h1>My Beam</h1>
            {folderRows.length === 0 ? (
              <section className="emptyBeamState" aria-labelledby="empty-beam-title">
                <img className="emptyBeamIllustration emptyBeamIllustrationLight" src={icons.emptyFolders} alt="" aria-hidden="true" />
                <img className="emptyBeamIllustration emptyBeamIllustrationDark" src="/assets/empty-folder-dark.svg" alt="" aria-hidden="true" />
                <div className="emptyBeamCopy">
                  <h2 id="empty-beam-title">No folders yet</h2>
                  <p>Create a folder to get started.</p>
                </div>
                {activeWorkspace.role !== 'Viewer' && <button className="emptyBeamCreate" type="button" onClick={() => setIsEmptyCreateOpen(true)}><Icon src={icons.folder} />Create Folder</button>}
              </section>
            ) : (
              <div className="contentGrid"><FileTable rows={homeFiles} onOpenFolder={openFolder} onRenameFolder={activeWorkspace.role === 'Viewer' ? undefined : setFolderToRename} onDeleteFolder={activeWorkspace.role === 'Viewer' ? undefined : requestFolderDelete} /><Stats folderCount={folderRows.length} fileCount={totalFileCount} storageUsed={storageSummary} /></div>
            )}
          </>
        )}
      </section>
      {isCreateWorkspaceOpen && <div className="createWorkspaceOverlay"><CreateWorkspacePage existingNames={workspaces.map((workspace) => workspace.name)} onCancel={() => setIsCreateWorkspaceOpen(false)} onCreate={createWorkspace} /></div>}
      {mutationNotice && <div className={`apiCreatedToast mutationToast ${mutationNotice.state}`} role={mutationNotice.state === 'error' ? 'alert' : 'status'} aria-live="polite"><span className="apiCreatedToastIcon"><img src={mutationNotice.state === 'error' ? icons.previewClose : mutationNotice.state === 'success' ? '/assets/toast-success.svg' : '/assets/upload-progress-title.svg'} alt="" aria-hidden="true" /></span><div><strong>{mutationNotice.state === 'saving' ? 'Saving changes…' : mutationNotice.state === 'success' ? 'Changes saved' : 'Couldn’t save changes'}</strong><span>{mutationNotice.state === 'error' ? `${mutationNotice.label} was rolled back. Please try again.` : mutationNotice.label}</span></div></div>}
      {settingsSaveToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Settings saved</strong><span>{settingsSaveToast}</span></div></div>}
      {accountSaveToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Account updated</strong><span>{accountSaveToast}</span></div></div>}
      {workspaceCreateToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Workspace created</strong><span>{workspaceCreateToast}</span></div></div>}
      {workspaceDeleteToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Workspace deleted</strong><span>{workspaceDeleteToast}</span></div></div>}
      {folderToRename && <RenameFolderModal currentName={folderToRename} existingNames={folderRows.map((folder) => folder.name)} onRename={renameFolder} onClose={() => setFolderToRename(null)} />}
      {folderToDelete && <DeleteItemModal itemName={folderToDelete} itemType="folder" retention={workspaceBehavior.trashRetention} onConfirm={() => removeFolder(folderToDelete)} onClose={() => setFolderToDelete(null)} />}
      {isEmptyCreateOpen && <NewFolderModal existingNames={folderRows.map((folder) => folder.name)} onCreate={(name) => { createFolder(name); setIsEmptyCreateOpen(false) }} onClose={() => setIsEmptyCreateOpen(false)} />}
      {showUploadDemo && <UploadDemoOverlay onClose={() => { setShowUploadDemo(false); const url = new URL(window.location.href); url.searchParams.delete('upload-demo'); window.history.replaceState({}, '', url) }} />}
    </main>
  )
}
