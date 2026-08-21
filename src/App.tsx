import { useEffect, useRef, useState } from 'react'
import ApiKeysPage from './components/ApiKeysPage'
import SettingsPage from './components/SettingsPage'
import AccountProfilePage from './components/AccountProfilePage'
import BillingUsagePage from './components/BillingUsagePage'
import CreateWorkspacePage from './components/CreateWorkspacePage'

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
type FileRow = { name: string; size: string; modified: string; badge?: string; kind: FileKind }
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

type FolderFile = { name: string; kind: string; size: string; modified: string; previewAvailable?: boolean }
type CopyFeedback = { status: 'success' | 'failure'; fileName: string } | null
type DownloadFeedback = { status: 'success' | 'failure'; file: FolderFile } | null

const initialFolderFiles: FolderFile[] = [
  { name: 'backup-prompt.md', kind: 'md', size: '869B', modified: '4 days ago' },
  { name: 'folder.md', kind: 'md', size: '869B', modified: '5 days ago' },
  { name: 'getting-started.md', kind: 'md', size: '278B', modified: '5 days ago' },
  { name: 'organize-thoughts-prompt.md', kind: 'md', size: '253B', modified: '6 days ago' },
]

const initialFolderContents: Record<string, FolderFile[]> = {
  'Folder 001': initialFolderFiles,
  'Product Resources': [
    { name: 'brand-guidelines.pdf', kind: 'pdf', size: '420MB', modified: '2 days ago' },
    { name: 'product-images.zip', kind: 'zip', size: '380MB', modified: '3 days ago' },
    { name: 'release-notes.md', kind: 'md', size: '56MB', modified: '5 days ago' },
  ],
  'Website Assets': [
    { name: 'homepage-assets.zip', kind: 'zip', size: '240MB', modified: '1 day ago' },
    { name: 'campaign-images.zip', kind: 'zip', size: '150MB', modified: '4 days ago' },
    { name: 'logo-kit.ai', kind: 'ai', size: '30MB', modified: '6 days ago' },
  ],
}

type WorkspaceContent = { folders: Folder[]; files: FileRow[]; folderContents: Record<string, FolderFile[]> }
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
  const folderSuccessTimer = useRef<number | null>(null)

  useEffect(() => {
    if (isNewFolderOpen) newFolderInputRef.current?.focus()
  }, [isNewFolderOpen])

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
      if (event.key === 'Escape') setIsOrgMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOrgMenuOpen])

  useEffect(() => {
    if (!isAccountMenuOpen) return
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-account-menu]')) setIsAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAccountMenuOpen])

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
              <button className="workspaceName" onClick={() => setIsOrgMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={isOrgMenuOpen}>
                {activeWorkspace.id === 'personal' ? <Icon src={icons.personal} /> : <span className="organizationAvatar"><Icon src={activeWorkspace.icon} /></span>}
                <span>{activeWorkspace.name}</span>
                <span className={`organizationChevron${isOrgMenuOpen ? ' open' : ''}`}><Icon src={icons.chevron} /></span>
              </button>
              {isOrgMenuOpen && (
                <div className="organizationMenu" role="menu" aria-label="Organizations">
                  <div className="organizationGroup">
                    {workspaces.map((workspace) => {
                      const isActive = workspace.id === activeWorkspace.id
                      return (
                        <button
                          className={`organizationOption${isActive ? ' active' : ''}`}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isActive}
                          key={workspace.id}
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
                    <button className="workspaceAddAction" type="button" onClick={() => { setIsOrgMenuOpen(false); onCreateWorkspace() }}><img src="/assets/workspace-menu-add.svg" alt="" aria-hidden="true" />Add new workspace</button>
                  </div>
                </div>
              )}
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
                onChange={(event) => onSearchChange(event.target.value)}
              />
              {isSearching ? (
                <button type="button" className="clearSearch" aria-label="Clear search" onClick={() => onSearchChange('')}><Icon src={icons.searchClear} /></button>
              ) : <Icon src={icons.shortcut} />}
            </label>
          <button className="plainButton" aria-label={canEditWorkspace ? 'New folder' : 'New folder unavailable with Viewer access'} title={isCollapsed ? 'New folder' : undefined} disabled={isNewFolderOpen || !canEditWorkspace} onClick={() => { if (isCollapsed) onStartSearch(); setIsNewFolderOpen(true) }}>
            <Icon src={icons.folder} /><span className="sidebarLabel">New folder</span>
          </button>
        </div>

          <nav className={`folderList${isCollapsed || isSearching ? ' concealed' : ''}`} aria-label="Folders" aria-hidden={isCollapsed || isSearching}>
            {isNewFolderOpen && <div className={`folderCreateRow${folderCreateError ? ' invalid' : ''}`}><Icon src={icons.folderCreate} /><input ref={newFolderInputRef} value={newFolderName} maxLength={64} placeholder="Enter your folder name" spellCheck={false} autoCapitalize="none" aria-label="Folder name" aria-invalid={Boolean(folderCreateError)} aria-describedby={folderCreateError ? 'folder-create-error' : undefined} onChange={(event) => { setNewFolderName(event.target.value); setFolderCreateError('') }} onKeyDown={(event) => { if (event.key === 'Enter') submitNewFolder(); else if (event.key === 'Escape') closeFolderEntry() }} /><button type="button" aria-label="Create folder" onClick={submitNewFolder}><Icon src={icons.folderCreateEnter} /></button>{folderCreateError && <span id="folder-create-error" role="alert">{folderCreateError}</span>}</div>}
            {sidebarFolders.map((folder) => (
              <button className={`folderRow${isFolderNavigationActive && folder.name === activeFolderName ? ' active' : ''}`} key={folder.name} tabIndex={isCollapsed || isSearching ? -1 : 0} onClick={() => onOpenFolder(folder.name)}>
                <span>{folder.name}</span><span>{folder.count}</span>
              </button>
            ))}
          </nav>
      </div>

      <div className="sidebarBottom">
        <div className="utilityLinks">
          <button className={`plainButton${isApiKeysActive ? ' active' : ''}`} aria-label="API Keys" title={isCollapsed ? 'API Keys' : undefined} onClick={onOpenApiKeys}><Icon src={icons.key} /><span className="sidebarLabel">API Keys</span></button>
          <button className={`plainButton${isSettingsActive ? ' active' : ''}`} aria-label="Settings" title={isCollapsed ? 'Settings' : undefined} onClick={onOpenSettings}><Icon src={icons.settings} /><span className="sidebarLabel">Settings</span></button>
        </div>
        <div className="accountControl" data-account-menu>
          {isAccountMenuOpen && (
            <div className="accountMenu" role="menu" aria-label="Account menu">
              <header className="accountIdentity">
                <img src="/assets/account-menu-avatar.png" alt="" />
                <div><strong>{accountName}</strong><span>michele@beam.app</span></div>
              </header>
              <section className="accountPlan" aria-label="Current plan and usage">
                <div className="accountPlanHeading"><strong>Free plan</strong><span>24% used</span></div>
                <div className="accountUsageBody">
                  <div className="accountUsageTrack" aria-hidden="true"><span /></div>
                  <div className="accountUsageMeta"><span>1.2 GB of 5 GB</span><button type="button" aria-label="Open billing and usage" onClick={() => { setIsAccountMenuOpen(false); onOpenBilling() }}><Icon src="/assets/account-menu-arrow.svg" /></button></div>
                </div>
              </section>
              <div className="accountMenuGroup">
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onOpenAccount() }}>Account settings</button>
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onOpenBilling() }}>Billing &amp; usage</button>
                <div className="appearanceMenuControl" onMouseLeave={() => setIsAppearanceMenuOpen(false)}>
                  <button className={isAppearanceMenuOpen ? 'submenuOpen' : ''} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={isAppearanceMenuOpen} onClick={() => setIsAppearanceMenuOpen((open) => !open)} onMouseEnter={() => setIsAppearanceMenuOpen(true)}>
                    <span className="appearanceMenuLabel">Appearance</span><span className="accountMenuValue">{appearanceTheme[0].toUpperCase() + appearanceTheme.slice(1)} <span aria-hidden="true">›</span></span>
                  </button>
                  {isAppearanceMenuOpen && <div className="appearanceSubmenu" role="menu" aria-label="Appearance theme">
                    {(['light', 'dark', 'system'] as const).map((theme) => <button className={appearanceTheme === theme ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={appearanceTheme === theme} key={theme} onClick={() => { applyAppearanceTheme(theme); setAppearanceTheme(theme); setIsAppearanceMenuOpen(false) }}>
                      <img className="appearanceThemeIcon" src={`/assets/appearance-${theme}.svg`} alt="" aria-hidden="true" /><span>{theme[0].toUpperCase() + theme.slice(1)}</span>{appearanceTheme === theme && <span className="appearanceCheck" aria-hidden="true">✓</span>}
                    </button>)}
                  </div>}
                </div>
                <button type="button" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>Help &amp; feedback</button>
              </div>
              <div className="accountMenuGroup accountMenuFooter">
                <button type="button" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>Sign out</button>
              </div>
            </div>
          )}
          <button className={`accountRow${isAccountMenuOpen ? ' active' : ''}`} aria-label={`Open ${accountName} account menu`} aria-haspopup="menu" aria-expanded={isAccountMenuOpen} title={isCollapsed ? accountName : undefined} onClick={() => setIsAccountMenuOpen((open) => !open)}>
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

function FileTable({ rows = files, showHeader = true, onOpenFolder, onRenameFolder, onDeleteFolder }: { rows?: FileRow[]; showHeader?: boolean; onOpenFolder?: (name: string) => void; onRenameFolder?: (name: string) => void; onDeleteFolder?: (name: string) => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

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
        <div className={`tableRow${!showHeader && index === 0 ? ' first' : ''}${index === rows.length - 1 ? ' last' : ''}`} key={file.name}>
          <div className="fileName">
            {file.kind === 'folder' && onOpenFolder ? <button className="fileLink" onClick={() => onOpenFolder(file.name)}>{file.name}</button> : <span>{file.name}</span>}
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
              aria-expanded={openMenu === file.name}
              onClick={() => setOpenMenu((current) => current === file.name ? null : file.name)}
            >
              <Icon src={icons.more} />
            </button>
            {openMenu === file.name && (
              <div className="rowMenu" role="menu" aria-label={`Actions for ${file.name}`}>
                <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); onOpenFolder?.(file.name) }}><Icon src={icons.actionOpen} />Open</button>
                <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); onRenameFolder?.(file.name) }}><Icon src={icons.actionRename} />Rename</button>
                <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); onDeleteFolder?.(file.name) }}><Icon src={icons.actionDelete} />Delete</button>
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

function FolderDetail({ folderName, initialItems, onItemsChange, onBack, readOnly = false, defaultView = 'list', confirmDelete = true, trashRetention = '30 days' }: { folderName: string; initialItems: FolderFile[]; onItemsChange: (items: FolderFile[]) => void; onBack: () => void; readOnly?: boolean; defaultView?: 'list' | 'grid'; confirmDelete?: boolean; trashRetention?: string }) {
  const [folderItems, setFolderItems] = useState<FolderFile[]>(initialItems)
  const [selectedFile, setSelectedFile] = useState<FolderFile | null>(null)
  const [infoFile, setInfoFile] = useState<FolderFile | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null)
  const [downloadFeedback, setDownloadFeedback] = useState<DownloadFeedback>(null)
  const [openFileMenu, setOpenFileMenu] = useState<number | null>(null)
  const [fileToDelete, setFileToDelete] = useState<{ file: FolderFile; index: number } | null>(null)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(defaultView)
  const [splitPercent, setSplitPercent] = useState(50)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => setViewMode(defaultView), [defaultView])

  const removeFile = (file: FolderFile, index: number) => {
    setFolderItems((items) => { const next = items.filter((_, itemIndex) => itemIndex !== index); onItemsChange(next); return next })
    if (selectedFile === file) setSelectedFile(null)
  }
  const previewLayoutRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)
  const dragDepthRef = useRef(0)
  const copyFeedbackTimerRef = useRef<number | null>(null)
  const downloadFeedbackTimerRef = useRef<number | null>(null)
  const minimumDetailWidth = 350
  const minimumPreviewWidth = 513

  const constrainSplit = (desiredLeftWidth: number, totalWidth: number) => {
    const minimumLeft = Math.min(minimumDetailWidth, totalWidth / 2)
    const maximumLeft = Math.max(minimumLeft, totalWidth - minimumPreviewWidth)
    return Math.min(maximumLeft, Math.max(minimumLeft, desiredLeftWidth))
  }

  useEffect(() => () => {
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current)
    if (downloadFeedbackTimerRef.current !== null) window.clearTimeout(downloadFeedbackTimerRef.current)
  }, [])

  useEffect(() => {
    if (openFileMenu === null) return
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-detail-row-menu]')) setOpenFileMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFileMenu(null)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openFileMenu])

  const addFiles = (incomingFiles: FileList | File[]) => {
    if (readOnly) return
    const addedFiles = Array.from(incomingFiles).map((file) => ({
      name: file.name,
      kind: file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'file',
      size: formatFileSize(file.size),
      modified: 'Just now',
      previewAvailable: false,
    }))
    if (addedFiles.length) setFolderItems((current) => {
      const next = [...current, ...addedFiles]
      onItemsChange(next)
      return next
    })
  }

  const downloadFile = (file: FolderFile) => {
    try {
      if (file.previewAvailable === false) throw new Error('File unavailable')
      const blob = new Blob([`# ${file.name}\n`], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setDownloadFeedback({ status: 'success', file })
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
      await navigator.clipboard.writeText(`${window.location.origin}/${folderName}/${file.name}`)
      setCopyFeedback({ status: 'success', fileName: file.name })
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
      if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files)
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
  }, [readOnly])

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
        <label className="uploadButton"><Icon src={icons.upload} /><span>Upload file</span><input type="file" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} /></label>
        <span>or drag and drop</span>
      </div>}
    </div>
  )

  const detailTable = (
    <div className="detailTable">
      <div className="detailRow detailTableHead"><div>Name</div><div>Kind</div><div>Size</div><div>Modified</div><div /></div>
      {folderItems.map((file, index) => (
        <div
          className={`detailRow selectable${selectedFile?.name === file.name ? ' selected' : ''}${index === folderItems.length - 1 ? ' last' : ''}`}
          key={`${file.name}-${index}`}
          role="button"
          tabIndex={0}
          onClick={() => setSelectedFile(file)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedFile(file) }}
        >
          <div>{file.name}</div><div>{file.kind}</div><div>{file.size}</div><div>{file.modified}</div>
          <div className="detailMore" data-detail-row-menu onClick={(event) => event.stopPropagation()}>
            <button
              className="moreButton"
              type="button"
              aria-label={`Actions for ${file.name}`}
              aria-haspopup="menu"
              aria-expanded={openFileMenu === index}
              onClick={() => setOpenFileMenu((current) => current === index ? null : index)}
            ><Icon src={icons.more} /></button>
            {openFileMenu === index && (
              <div className="rowMenu detailRowMenu" role="menu" aria-label={`Actions for ${file.name}`}>
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
    <div className="fileGrid" role="list" aria-label={`${folderName} files`}>
      {folderItems.map((file, index) => (
        <button
          className={`fileGridCard${selectedFile?.name === file.name ? ' selected' : ''}`}
          type="button"
          role="listitem"
          key={`${file.name}-${index}`}
          title={file.name}
          onClick={() => setSelectedFile(file)}
        >
          <span className="fileGridPreview"><Icon src={icons.fileDocument} /></span>
          <span className="fileGridName">{file.name}</span>
        </button>
      ))}
    </div>
  )

  const viewTabs = (
    <div className="viewTabs" role="tablist" aria-label="Folder view">
      <button className={viewMode === 'list' ? 'active' : ''} type="button" role="tab" aria-selected={viewMode === 'list'} onClick={() => setViewMode('list')}><Icon src={icons.viewList} />List</button>
      <button className={viewMode === 'grid' ? 'active' : ''} type="button" role="tab" aria-selected={viewMode === 'grid'} onClick={() => setViewMode('grid')}><Icon src={icons.viewGrid} />Grid</button>
    </div>
  )

  return (
    <div className={`folderDetail${selectedFile ? ' previewing' : ''}`}>
      {selectedFile ? (
        <div className={`previewLayout${isResizing ? ' resizing' : ''}`} ref={previewLayoutRef}>
          <div className="detailMain" style={{ flexBasis: `${splitPercent}%` }}>{detailHeader}{viewMode === 'grid' ? detailGridView : detailTable}</div>
          <FilePreview file={selectedFile} copyFeedback={copyFeedback?.fileName === selectedFile.name ? copyFeedback : null} onCopyLink={() => copyFileLink(selectedFile)} onDownload={() => downloadFile(selectedFile)} onInfo={() => setInfoFile(selectedFile)} onClose={() => setSelectedFile(null)} />
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
            {!readOnly && <label className="detailEmptyUpload"><Icon src={icons.upload} /><span>Upload file</span><input type="file" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} /></label>}
          </section>
        </>
      ) : <>{detailHeader}<div className="detailGrid"><div className="detailListPane">{viewMode === 'grid' ? detailGridView : detailTable}<div className="viewTabsDock">{viewTabs}</div></div><RecentActivity /></div></>}
      {isDraggingFiles && (
        <div className="dropOverlay" role="status" aria-live="polite">
          <div className="dropZone">
            <div className="dropPrompt">
              <div className="dropMessage"><span>Drop item to upload file to</span><span className="dropDestination"><Icon src={icons.dropFolder} />{folderName}</span></div>
            </div>
          </div>
        </div>
      )}
      {infoFile && <FileActivityModal file={infoFile} onClose={() => setInfoFile(null)} />}
      {copyFeedback && !selectedFile && <CopyTooltip feedback={copyFeedback} global />}
      {downloadFeedback && <DownloadToast feedback={downloadFeedback} onRetry={() => downloadFile(downloadFeedback.file)} onClose={() => setDownloadFeedback(null)} />}
      {fileToDelete && <DeleteItemModal itemName={fileToDelete.file.name} itemType="file" retention={trashRetention} onClose={() => setFileToDelete(null)} onConfirm={() => { removeFile(fileToDelete.file, fileToDelete.index); setFileToDelete(null) }} />}
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
  return <span className={`copyTooltip ${feedback.status}${global ? ' global' : ''}`} role="status" aria-live="polite">{feedback.status === 'success' ? 'Link-copied' : 'Copy link failed'}</span>
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

const editorIcons = {
  chevron: '/assets/editor-chevron.svg', bold: '/assets/editor-bold.svg', italic: '/assets/editor-italic.svg',
  underline: '/assets/editor-underline.svg', divider: '/assets/editor-divider.svg',
  list: '/assets/editor-list.svg', link: '/assets/editor-link.svg', image: '/assets/editor-image.svg',
} as const

function TextEditorToolbar({ position, blockStyle, isBulleted, onFormat }: { position: EditorToolbarPosition; blockStyle: 'Header 1' | 'Body'; isBulleted: boolean; onFormat: (command: string, value?: string) => void }) {
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false)
  const [openEditorPanel, setOpenEditorPanel] = useState<'color' | 'link' | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [nextAlignment, setNextAlignment] = useState<'center' | 'right' | 'left'>('center')
  const applyBlockStyle = (style: 'Header 1' | 'Body') => {
    setIsHeadingMenuOpen(false)
    onFormat('formatBlock', style === 'Header 1' ? 'h1' : 'p')
  }
  const applyLink = () => {
    const normalizedUrl = linkUrl.trim()
    if (!normalizedUrl) return
    onFormat('createLink', normalizedUrl)
    setLinkUrl('')
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
    <div className="textEditorToolbar" style={position} role="toolbar" aria-label="Text formatting" onMouseDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <div className="editorGroup editorHeadingGroup">
        <button className="editorHeadingTrigger" type="button" aria-haspopup="menu" aria-expanded={isHeadingMenuOpen} onMouseDown={(event) => event.preventDefault()} onClick={() => setIsHeadingMenuOpen((open) => !open)}><span>{blockStyle}</span><img className={isHeadingMenuOpen ? 'open' : ''} src={editorIcons.chevron} alt="" /></button>
        {isHeadingMenuOpen && (
          <div className="editorHeadingMenu" role="menu" aria-label="Text style">
            <button className={blockStyle === 'Header 1' ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={blockStyle === 'Header 1'} onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockStyle('Header 1')}><span>Header 1</span>{blockStyle === 'Header 1' && <img src={icons.downloadSuccess} alt="" />}</button>
            <button className={blockStyle === 'Body' ? 'selected' : ''} type="button" role="menuitemradio" aria-checked={blockStyle === 'Body'} onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockStyle('Body')}><span>Body</span>{blockStyle === 'Body' && <img src={icons.downloadSuccess} alt="" />}</button>
          </div>
        )}
      </div>
      <div className="editorGroup editorFormattingGroup">
        {iconButton('Bold', editorIcons.bold, 'bold', 'editorHoverPreview')}
        {iconButton('Italic', editorIcons.italic, 'italic')}
        {iconButton('Underline', editorIcons.underline, 'underline')}
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button className="editorColor" type="button" aria-label="Text color" aria-expanded={openEditorPanel === 'color'} title="Text color" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenEditorPanel((panel) => panel === 'color' ? null : 'color')}><span /></button>
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button type="button" aria-label={`Align ${nextAlignment}`} title={`Align ${nextAlignment}`} onMouseDown={(event) => event.preventDefault()} onClick={cycleAlignment}><span className={`editorAlignIcon ${nextAlignment}`} aria-hidden="true"><i /><i /><i /><i /></span></button>
        <button className={isBulleted ? 'active' : ''} type="button" aria-label={isBulleted ? 'Remove bulleted list' : 'Bulleted list'} aria-pressed={isBulleted} title={isBulleted ? 'Remove bulleted list' : 'Bulleted list'} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat('insertUnorderedList')}><img src={editorIcons.list} alt="" /></button>
        <img className="editorDivider" src={editorIcons.divider} alt="" />
        <button type="button" aria-label="Add link" aria-expanded={openEditorPanel === 'link'} title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenEditorPanel((panel) => panel === 'link' ? null : 'link')}><img src={editorIcons.link} alt="" /></button>
        <label className="editorImageButton" title="Add image"><img src={editorIcons.image} alt="" /><input type="file" accept="image/*" onChange={(event) => { insertImage(event.target.files?.[0]); event.target.value = '' }} /></label>
        {openEditorPanel === 'color' && <div className="editorColorMenu" aria-label="Text colors">{['#0a0a0a', '#29323d', '#0d76f2', '#f24b0d', '#810718'].map((color) => <button type="button" key={color} aria-label={`Use ${color}`} style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => { onFormat('foreColor', color); setOpenEditorPanel(null) }} />)}</div>}
        {openEditorPanel === 'link' && <form className="editorLinkMenu" onSubmit={(event) => { event.preventDefault(); applyLink() }}><input autoFocus value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" aria-label="Link URL" /><button type="submit" disabled={!linkUrl.trim()}>Apply</button></form>}
      </div>
    </div>
  )
}

function FilePreview({ file, copyFeedback, onCopyLink, onDownload, onInfo, onClose }: { file: FolderFile; copyFeedback: CopyFeedback; onCopyLink: () => void; onDownload: () => void; onInfo: () => void; onClose: () => void }) {
  const [loadState, setLoadState] = useState<'loaded' | 'loading' | 'error'>(file.previewAvailable === false ? 'error' : 'loaded')
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [editorToolbarPosition, setEditorToolbarPosition] = useState<EditorToolbarPosition | null>(null)
  const [editorBlockStyle, setEditorBlockStyle] = useState<'Header 1' | 'Body'>('Body')
  const [isEditorBulleted, setIsEditorBulleted] = useState(false)
  const retryTimerRef = useRef<number | null>(null)
  const previewDocumentRef = useRef<HTMLElement>(null)
  const editorSelectionRef = useRef<Range | null>(null)

  useEffect(() => {
    setLoadState(file.previewAvailable === false ? 'error' : 'loaded')
    return () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
    }
  }, [file])

  useEffect(() => {
    const closeEditor = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.textEditorToolbar') && !target.closest('.previewDocument')) setEditorToolbarPosition(null)
    }
    document.addEventListener('mousedown', closeEditor)
    return () => document.removeEventListener('mousedown', closeEditor)
  }, [])

  useEffect(() => {
    if (!isShareOpen) return
    const closeShare = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-share-control]')) setIsShareOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsShareOpen(false)
    }
    document.addEventListener('mousedown', closeShare)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeShare)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isShareOpen])

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
    document.execCommand(command, false, value)
    if (command === 'formatBlock') setEditorBlockStyle(value === 'h1' ? 'Header 1' : 'Body')
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

  return (
    <aside className="filePreview" aria-label={`Preview of ${file.name}`}>
      <div className="previewTitle"><span>{file.name}</span><button onClick={onClose}><Icon src={icons.previewClose} />Close</button></div>
      <div className="previewCard">
        <div className="previewToolbar">
          <div className="fileMetadata">
            <span>{file.kind}</span><Icon src={icons.metadataDivider} /><span>{formatDisplayFileSize(file.size)}</span><Icon src={icons.metadataDivider} /><span>Aug 3</span>
          </div>
          <div className="previewActions">
            <button onClick={onInfo}><Icon src={icons.previewInfo} />Info</button>
            <div className="shareControl" data-share-control>
              <button className="shareButton" type="button" aria-haspopup="dialog" aria-expanded={isShareOpen} onClick={() => setIsShareOpen((open) => !open)}><Icon src={icons.previewShare} />Share</button>
              {isShareOpen && (
                <section className="sharePopover" role="dialog" aria-label={`Share ${file.name}`}>
                  <img className="sharePopoverPointer" src="/assets/share-tooltip.svg" alt="" aria-hidden="true" />
                  <div className="sharePopoverBody">
                    <div className="sharePeople">
                      <div className="shareHeadingRow">
                        <div className="shareHeading"><span>People with access on</span><img src="/assets/share-document.svg" alt="" aria-hidden="true" /><span>{file.name}</span></div>
                        <div className="sharePeopleCount" aria-label="1 person has access"><img src="/assets/share-people.svg" alt="" aria-hidden="true" /><span>1</span></div>
                      </div>
                      <div className="shareMemberRow">
                        <div className="shareMember"><img className="shareAvatar" src="/assets/james-avatar.png" alt="" /><span>James T.</span><span className="shareBadge">Member</span></div>
                        <button type="button" disabled>Remove</button>
                      </div>
                    </div>
                    <div className="shareFooter">
                      <button className="sharePermission" type="button">All people with access can edit<img src="/assets/share-extra-1.svg" alt="" /></button>
                      <button className="shareCopyLink" type="button" onClick={onCopyLink}><img src={copyFeedback?.status === 'success' ? icons.downloadSuccess : copyFeedback?.status === 'failure' ? icons.previewClose : '/assets/share-chevron.svg'} alt="" />{copyFeedback?.status === 'success' ? 'Link-copied' : copyFeedback?.status === 'failure' ? 'Copy failed' : 'Copy-link'}</button>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <button onClick={onDownload}><Icon src={icons.previewDownload} />Download</button>
          </div>
        </div>
        {loadState === 'error' || loadState === 'loading' ? (
          <div className="previewLoadState" role={loadState === 'error' ? 'alert' : 'status'}>
            <strong>{loadState === 'loading' ? 'Loading file…' : 'Couldn’t load this file'}</strong>
            {loadState === 'error' && <button type="button" onClick={retryLoading}><Icon src={icons.previewRetry} />Try again</button>}
          </div>
        ) : <article className="previewDocument" ref={previewDocumentRef} contentEditable suppressContentEditableWarning onMouseUp={showEditorForSelection} onKeyUp={showEditorForSelection} onContextMenu={(event) => { if (editorToolbarPosition) event.preventDefault() }}>
          <h2>{file.name}</h2>
          <p><strong>Your Folder is ready to go the moment you sign up.</strong><br />It ships with three things: `folder.md` as the root operating file, a set of reusable prompt files for common agent tasks, and a live API key created during signup.</p>
          <p><strong>The core idea</strong><br />Everything lives in one place, and `folder.md` is the entry point. Whenever an agent starts a task, it reads `folder.md` first — that&apos;s how it learns the context, the conventions, and where things belong.</p>
          <p><strong>Your first three moves</strong><br />Start by editing `folder.md` so it reflects how you actually work. Then upload your source material — notes, screenshots, drafts, whatever the task needs. Finally, hand it to an agent with one instruction: read `folder.md` first, and keep the structure tidy as you go.</p>
          <p><strong>What this is good for</strong><br />A Folder shines when you need to turn loose notes into clean docs without losing the meaning, or when you want to drop in a pile of assets and let an agent sort them into a sane structure. It&apos;s also the natural home for project context, so a fresh agent can onboard in a single read. The rule of thumb: one Folder per project, client, or workstream.</p>
          <p><strong>Handing off to an agent — what to say</strong><br />&gt; Use my Folder as the working space for this task. Read `folder.md` first, keep the file structure tidy, and explain what you saved when you&apos;re done.<br />That&apos;s it. The agent takes it from there.</p>
        </article>}
      </div>
      {editorToolbarPosition && <TextEditorToolbar position={editorToolbarPosition} blockStyle={editorBlockStyle} isBulleted={isEditorBulleted} onFormat={applyEditorFormat} />}
    </aside>
  )
}

function RecentActivity() {
  return (
    <section className="recentActivity">
      <h2>Recent Activity</h2>
      <div className="activityList">
        {[0, 1, 2].map((item) => (
          <div className="activityItem" key={item}>
            <div className="activityTrack">
              <span className="activityDot" />
              {item < 2 && <img src={icons.activityLine} alt="" aria-hidden="true" />}
            </div>
            <div className="activityBody">
              <div className="activityTop"><span>Michele J.</span><span className="activityBadge">Viewed</span><time>2h ago</time></div>
              <p>folder.md · /folder.md</p>
            </div>
          </div>
        ))}
      </div>
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

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(readWorkspaces)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => window.localStorage.getItem('beam-active-workspace') || 'personal')
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]
  const [workspaceContent, setWorkspaceContent] = useState<Record<string, WorkspaceContent>>(readWorkspaceContent)
  const activeContent = workspaceContent[activeWorkspace.id] ?? { folders: [], files: [], folderContents: {} }
  const folderRows = activeContent.folders
  const homeFiles = activeContent.files
  const folderContents = activeContent.folderContents
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<'all' | FileKind>('all')
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const requestedView = new URLSearchParams(window.location.search).get('view')
    return requestedView === 'settings' || requestedView === 'apiKeys' || requestedView === 'account' || requestedView === 'billing' ? requestedView : 'home'
  })
  const [selectedFolderName, setSelectedFolderName] = useState('Folder 001')
  const [folderToRename, setFolderToRename] = useState<string | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [isEmptyCreateOpen, setIsEmptyCreateOpen] = useState(false)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [settingsLeaveRequest, setSettingsLeaveRequest] = useState(0)
  const [pendingView, setPendingView] = useState<AppView | null>(null)
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null)
  const [settingsSaveToast, setSettingsSaveToast] = useState('')
  const [accountName, setAccountName] = useState(readAccountName)
  const [accountSaveToast, setAccountSaveToast] = useState('')
  const [workspaceCreateToast, setWorkspaceCreateToast] = useState('')
  const [workspaceDeleteToast, setWorkspaceDeleteToast] = useState('')
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false)
  const settingsSaveToastTimer = useRef<number | null>(null)
  const skipNextWorkspaceContentSave = useRef(false)
  const workspaceBehavior = readWorkspaceBehavior(activeWorkspace.id)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchResults = homeFiles.filter((file) =>
    (searchFilter === 'all' || file.kind === searchFilter) &&
    (!normalizedQuery || file.name.toLowerCase().includes(normalizedQuery)),
  )
  const totalFileCount = Object.values(folderContents).reduce((total, items) => total + items.length, 0)
  const totalStorageBytes = Object.values(folderContents).flat().reduce((total, file) => total + fileSizeInBytes(file.size), 0)
  const storageSummary = `${Math.round(totalStorageBytes / (1024 * 1024)).toLocaleString('en-US')} MB`

  useEffect(() => {
    const restoreViewFromUrl = () => {
      const requestedView = new URLSearchParams(window.location.search).get('view')
      setCurrentView(requestedView === 'settings' || requestedView === 'apiKeys' || requestedView === 'account' || requestedView === 'billing' ? requestedView : 'home')
    }
    window.addEventListener('popstate', restoreViewFromUrl)
    return () => window.removeEventListener('popstate', restoreViewFromUrl)
  }, [])

  useEffect(() => {
    if (skipNextWorkspaceContentSave.current) {
      skipNextWorkspaceContentSave.current = false
      return
    }
    window.localStorage.setItem('beam-workspace-content-v1', JSON.stringify(workspaceContent))
  }, [workspaceContent])

  const commitView = (view: AppView) => {
    setCurrentView(view)
    const url = new URL(window.location.href)
    if (view === 'home' || view === 'folder') url.searchParams.delete('view')
    else url.searchParams.set('view', view)
    url.hash = ''
    window.history.pushState({}, '', url)
  }

  const openView = (view: AppView) => {
    if (currentView === 'settings' && settingsDirty && view !== 'settings') {
      setPendingView(view)
      setSettingsLeaveRequest((request) => request + 1)
      return
    }
    commitView(view)
  }

  const startSearch = () => {
    setIsSidebarCollapsed(false)
  }

  const updateSearchQuery = (query: string) => {
    setSearchQuery(query)
    setIsSearching(query.trim().length > 0)
    if (query.trim().length === 0) {
      setSearchFilter('all')
      openView('home')
    }
  }

  const openFolder = (name: string) => {
    setSelectedFolderName(name)
    openView('folder')
    setSearchQuery('')
    setIsSearching(false)
    setSearchFilter('all')
  }

  const createFolder = (name: string) => {
    if (activeContent.folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    setWorkspaceContent((current) => ({ ...current, [activeWorkspace.id]: {
      folders: [...activeContent.folders, { name, count: 0 }],
      files: [...activeContent.files, { name, size: '0B', modified: 'Just now', kind: 'folder' }],
      folderContents: { ...activeContent.folderContents, [name]: [] },
    } }))
    openView('home')
    setSearchQuery('')
    setIsSearching(false)
  }

  const renameFolder = (newName: string) => {
    if (!folderToRename) return
    if (activeContent.folders.some((folder) => folder.name !== folderToRename && folder.name.toLocaleLowerCase() === newName.toLocaleLowerCase())) return
    const { [folderToRename]: renamedItems = [], ...remainingContents } = activeContent.folderContents
    setWorkspaceContent((current) => ({ ...current, [activeWorkspace.id]: {
      folders: activeContent.folders.map((folder) => folder.name === folderToRename ? { ...folder, name: newName } : folder),
      files: activeContent.files.map((file) => file.name === folderToRename ? { ...file, name: newName } : file),
      folderContents: { ...remainingContents, [newName]: renamedItems },
    } }))
    if (selectedFolderName === folderToRename) setSelectedFolderName(newName)
    setFolderToRename(null)
  }

  const removeFolder = (folderName: string) => {
    const { [folderName]: _deletedItems, ...remainingContents } = activeContent.folderContents
    // Folder deletion is intentionally session-only in this prototype. Preserve
    // the current stored snapshot so refreshing restores the folder and files.
    window.localStorage.setItem('beam-workspace-content-v1', JSON.stringify({ ...workspaceContent, [activeWorkspace.id]: activeContent }))
    skipNextWorkspaceContentSave.current = true
    setWorkspaceContent((current) => ({ ...current, [activeWorkspace.id]: {
      folders: activeContent.folders.filter((folder) => folder.name !== folderName),
      files: activeContent.files.filter((file) => file.name !== folderName),
      folderContents: remainingContents,
    } }))
    if (selectedFolderName === folderName) openView('home')
    setFolderToDelete(null)
  }

  const requestFolderDelete = (folderName: string) => {
    if (workspaceBehavior.confirmDelete) setFolderToDelete(folderName)
    else removeFolder(folderName)
  }

  const showSettingsSaveToast = (changeCount: number) => {
    if (settingsSaveToastTimer.current !== null) window.clearTimeout(settingsSaveToastTimer.current)
    setSettingsSaveToast(`${changeCount} ${changeCount === 1 ? 'change' : 'changes'} saved successfully`)
    settingsSaveToastTimer.current = window.setTimeout(() => setSettingsSaveToast(''), 3000)
  }

  const commitWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId)
    window.localStorage.setItem('beam-active-workspace', workspaceId)
    setSettingsDirty(false)
    setSearchQuery('')
    setIsSearching(false)
    setSelectedFolderName('Folder 001')
  }

  const changeWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspace.id) return
    if (currentView === 'settings' && settingsDirty) {
      setPendingWorkspaceId(workspaceId)
      setSettingsLeaveRequest((request) => request + 1)
      return
    }
    commitWorkspaceChange(workspaceId)
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
    setAccountSaveToast(`${name} is now your display name.`)
    window.setTimeout(() => setAccountSaveToast(''), 3000)
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
    setWorkspaceContent((current) => ({ ...current, [workspaceId]: { folders: [], files: [], folderContents: {} } }))
    setIsCreateWorkspaceOpen(false)
    commitWorkspaceChange(workspaceId)
    commitView('home')
    setWorkspaceCreateToast(`${name} is ready to use.`)
    window.setTimeout(() => setWorkspaceCreateToast(''), 3000)
  }

  const deleteWorkspace = (workspaceId: string) => {
    if (initialWorkspaces.some((workspace) => workspace.id === workspaceId)) return
    const workspaceToDelete = workspaces.find((workspace) => workspace.id === workspaceId)
    const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId)
    setWorkspaces(nextWorkspaces)
    window.localStorage.setItem('beam-created-workspaces-v1', JSON.stringify(nextWorkspaces.filter((workspace) => !initialWorkspaces.some((initial) => initial.id === workspace.id))))
    setWorkspaceContent((current) => { const { [workspaceId]: _deletedWorkspace, ...remaining } = current; return remaining })
    ;[`beam-settings-v3-${workspaceId}`, `beam-members-v1-${workspaceId}`, `beam-api-keys-v1-${workspaceId}`, `beam-billing-v1-${workspaceId}`].forEach((key) => window.localStorage.removeItem(key))
    setSettingsDirty(false)
    commitWorkspaceChange('personal')
    commitView('home')
    setWorkspaceDeleteToast(`${workspaceToDelete?.name ?? 'Workspace'} was permanently deleted.`)
    window.setTimeout(() => setWorkspaceDeleteToast(''), 3000)
  }

  return (
    <main className={`appShell${isSidebarCollapsed ? ' sidebarCollapsed' : ''}`}>
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
        {currentView === 'billing' && !isSearching ? <BillingUsagePage key={activeWorkspace.id} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} storageUsedMb={Math.round(totalStorageBytes / (1024 * 1024))} /> : currentView === 'account' && !isSearching ? <AccountProfilePage displayName={accountName} onDisplayNameSave={saveAccountName} /> : currentView === 'settings' && !isSearching ? <SettingsPage key={activeWorkspace.id} workspace={activeWorkspace} storageUsedMb={Math.round(totalStorageBytes / (1024 * 1024))} onOpenApiKeys={() => openView('apiKeys')} onWorkspaceNameChange={renameWorkspace} canDeleteWorkspace={!initialWorkspaces.some((workspace) => workspace.id === activeWorkspace.id)} onDeleteWorkspace={deleteWorkspace} onDirtyChange={setSettingsDirty} onSaveSuccess={showSettingsSaveToast} leaveRequest={settingsLeaveRequest} onLeaveResolved={(proceed) => {
          if (!proceed) { setPendingView(null); setPendingWorkspaceId(null); return }
          setSettingsDirty(false)
          if (pendingWorkspaceId) { const nextWorkspaceId = pendingWorkspaceId; setPendingWorkspaceId(null); commitWorkspaceChange(nextWorkspaceId) }
          if (pendingView) { const nextView = pendingView; setPendingView(null); commitView(nextView) }
        }} /> : currentView === 'apiKeys' && !isSearching ? <ApiKeysPage key={activeWorkspace.id} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} readOnly={activeWorkspace.role === 'Viewer'} /> : currentView === 'folder' && !isSearching ? <FolderDetail key={`${activeWorkspace.id}-${selectedFolderName}`} folderName={selectedFolderName} initialItems={folderContents[selectedFolderName] ?? []} readOnly={activeWorkspace.role === 'Viewer'} defaultView={workspaceBehavior.defaultView} confirmDelete={workspaceBehavior.confirmDelete} trashRetention={workspaceBehavior.trashRetention} onItemsChange={(items) => {
          setWorkspaceContent((current) => ({ ...current, [activeWorkspace.id]: {
            folders: activeContent.folders.map((folder) => folder.name === selectedFolderName ? { ...folder, count: items.length } : folder),
            files: activeContent.files.map((file) => file.name === selectedFolderName ? { ...file, size: formatFileSize(items.reduce((total, item) => total + fileSizeInBytes(item.size), 0)), modified: 'Just now' } : file),
            folderContents: { ...activeContent.folderContents, [selectedFolderName]: items },
          } }))
        }} onBack={() => setCurrentView('home')} /> : isSearching ? (
          <>
            <div className="searchFilters" aria-label="Search filters">
              {(['all', 'folder', 'file'] as const).map((filter) => (
                <button className={searchFilter === filter ? 'active' : ''} key={filter} onClick={() => setSearchFilter(filter)}>
                  {filter[0].toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="contentGrid searchGrid"><FileTable rows={searchResults} showHeader={false} onOpenFolder={openFolder} onRenameFolder={activeWorkspace.role === 'Viewer' ? undefined : setFolderToRename} onDeleteFolder={activeWorkspace.role === 'Viewer' ? undefined : requestFolderDelete} /><Stats folderCount={folderRows.length} fileCount={totalFileCount} storageUsed={storageSummary} /></div>
          </>
        ) : (
          <>
            <h1>My Beam</h1>
            {folderRows.length === 0 ? (
              <section className="emptyBeamState" aria-labelledby="empty-beam-title">
                <img className="emptyBeamIllustration emptyBeamIllustrationLight" src={icons.emptyFolders} alt="" aria-hidden="true" />
                <img className="emptyBeamIllustration emptyBeamIllustrationDark" src="/assets/empty-folder-dark.svg" alt="" aria-hidden="true" />
                <div className="emptyBeamCopy">
                  <h2 id="empty-beam-title">No folder yet</h2>
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
      {settingsSaveToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Settings saved</strong><span>{settingsSaveToast}</span></div></div>}
      {accountSaveToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Account updated</strong><span>{accountSaveToast}</span></div></div>}
      {workspaceCreateToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Workspace created</strong><span>{workspaceCreateToast}</span></div></div>}
      {workspaceDeleteToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Workspace deleted</strong><span>{workspaceDeleteToast}</span></div></div>}
      {folderToRename && <RenameFolderModal currentName={folderToRename} existingNames={folderRows.map((folder) => folder.name)} onRename={renameFolder} onClose={() => setFolderToRename(null)} />}
      {folderToDelete && <DeleteItemModal itemName={folderToDelete} itemType="folder" retention={workspaceBehavior.trashRetention} onConfirm={() => removeFolder(folderToDelete)} onClose={() => setFolderToDelete(null)} />}
      {isEmptyCreateOpen && <NewFolderModal existingNames={folderRows.map((folder) => folder.name)} onCreate={(name) => { createFolder(name); setIsEmptyCreateOpen(false) }} onClose={() => setIsEmptyCreateOpen(false)} />}
    </main>
  )
}
