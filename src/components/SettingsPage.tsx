import { useEffect, useRef, useState } from 'react'
import ProgressBar from './ProgressBar'
import SelectControl from './SelectControl'
import Toggle from './Toggle'
import WorkspaceAvatar from './WorkspaceAvatar'

type SettingsPageProps = {
  workspace: { id: string; name: string; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' }
  storageUsedMb: number
  onOpenApiKeys: () => void
  onWorkspaceNameChange: (workspaceId: string, name: string) => void
  canDeleteWorkspace: boolean
  onDeleteWorkspace: (workspaceId: string) => void
  onDirtyChange: (dirty: boolean) => void
  onSaveSuccess: (changeCount: number) => void
  leaveRequest: number
  onLeaveResolved: (proceed: boolean) => void
}
type SavedSettings = { workspaceName: string; timezone: string; defaultView: string; trashRetention: string; confirmDelete: boolean; linkPermission: string; linkExpiry: string; externalSharing: boolean; securityAlerts: boolean }
type MemberRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer'
type WorkspaceMember = { id: string; name: string; email: string; role: MemberRole; status: 'Active' | 'Pending' }
const currentAccountEmail = 'michele@beam.app'
const currentAccountName = () => window.localStorage.getItem('beam-account-display-name') || 'Michele J.'

const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const settingsDefaults = (workspaceName: string): SavedSettings => ({ workspaceName, timezone: detectedTimezone, defaultView: 'List', trashRetention: '30 days', confirmDelete: true, linkPermission: 'View only', linkExpiry: '7 days', externalSharing: false, securityAlerts: true })
const readSettings = (workspaceId: string, workspaceName: string): SavedSettings => {
  const defaults = settingsDefaults(workspaceName)
  try { return { ...defaults, ...JSON.parse(window.localStorage.getItem(`beam-settings-v3-${workspaceId}`) ?? '{}') } }
  catch { return defaults }
}

const defaultMembers = (workspaceId: string): WorkspaceMember[] => workspaceId === 'company-xyz' ? [
  { id: 'amelia', name: 'Amelia Hart', email: 'amelia@companyxyz.com', role: 'Owner', status: 'Active' },
  { id: 'michele', name: currentAccountName(), email: currentAccountEmail, role: 'Viewer', status: 'Active' },
] : workspaceId === 'company-abc' ? [
  { id: 'michele', name: currentAccountName(), email: currentAccountEmail, role: 'Owner', status: 'Active' },
] : [
  { id: 'michele', name: currentAccountName(), email: currentAccountEmail, role: 'Owner', status: 'Active' },
  { id: 'alex', name: 'Alex Morgan', email: 'alex@example.com', role: 'Editor', status: 'Active' },
]

const readMembers = (workspaceId: string) => {
  try { return JSON.parse(window.localStorage.getItem(`beam-members-v1-${workspaceId}`) ?? 'null') as WorkspaceMember[] || defaultMembers(workspaceId) }
  catch { return defaultMembers(workspaceId) }
}

const icons = {
  user: '/assets/settings-edit.svg', edit: '/assets/settings-chevron.svg', clock: '/assets/settings-clock.svg', chevron: '/assets/settings-user.svg',
  list: '/assets/settings-info.svg', info: '/assets/settings-check.svg', check: '/assets/settings-list.svg', x: '/assets/settings-x.svg',
  plus: '/assets/settings-plus.svg', monitor: '/assets/settings-monitor.svg', trash: '/assets/settings-trash.svg',
  review: '/assets/settings-review.svg',
  reviewClose: '/assets/settings-review-close.svg', reviewArrow: '/assets/settings-review-undo.svg', reviewUndo: '/assets/settings-review-save.svg', reviewSave: '/assets/settings-review-arrow.svg',
} as const

const sections = [['general', 'General'], ['members-access', 'Members and access'], ['files-storage', 'Files and storage'], ['sharing', 'Sharing and access'], ['security', 'Security'], ['workspace-data', 'Workspace data'], ['danger-zone', 'Danger zone']] as const

function Icon({ src }: { src: string }) { return <img className="settingsIcon" src={src} alt="" aria-hidden="true" /> }
function ThemeIcon({ light, dark }: { light: string; dark: string }) { return <span className="settingsThemeIcon" aria-hidden="true"><img className="settingsIcon lightAsset" src={light} alt="" /><img className="settingsIcon darkAsset" src={dark} alt="" /></span> }

function Row({ label, children, infoText, description }: { label: string; children: React.ReactNode; infoText?: string; description?: string }) {
  const tooltipId = `settings-tip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return <div className={`settingsRow${description ? ' described' : ''}`}><div className="settingsRowLabel"><span>{label}</span>{infoText && <span className="settingsInfoTooltip"><button type="button" aria-label={`About ${label}`} aria-describedby={tooltipId}><Icon src={icons.info} /></button><span id={tooltipId} role="tooltip">{infoText}</span></span>}{description && <small>{description}</small>}</div><div className="settingsRowControl">{children}</div></div>
}

const settingLabels: Record<keyof SavedSettings, string> = {
  workspaceName: 'Workspace name', timezone: 'Time zone', defaultView: 'Default view', trashRetention: 'Trash retention', confirmDelete: 'Confirm permanent deletion',
  linkPermission: 'Default permission', linkExpiry: 'Default link expiry', externalSharing: 'External sharing', securityAlerts: 'Security alerts',
}

const displaySettingValue = (value: string | boolean) => typeof value === 'boolean' ? (value ? 'On' : 'Off') : value

export default function SettingsPage({ workspace, storageUsedMb, onOpenApiKeys, onWorkspaceNameChange, canDeleteWorkspace, onDeleteWorkspace, onDirtyChange, onSaveSuccess, leaveRequest, onLeaveResolved }: SettingsPageProps) {
  const canManage = workspace.role === 'Owner' || workspace.role === 'Admin'
  const canEditContent = workspace.role !== 'Viewer'
  const visibleSections = workspace.role === 'Viewer' ? sections.filter(([id]) => ['general', 'members-access', 'files-storage', 'sharing'].includes(id)) : sections
  const [initial] = useState(() => readSettings(workspace.id, workspace.name))
  const [savedSettings, setSavedSettings] = useState(initial)
  const [workspaceName, setWorkspaceName] = useState(initial.workspaceName)
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(initial.workspaceName)
  const [isEditingWorkspaceName, setIsEditingWorkspaceName] = useState(false)
  const [workspaceNameError, setWorkspaceNameError] = useState('')
  const workspaceNameInputRef = useRef<HTMLInputElement>(null)
  const workspaceImportRef = useRef<HTMLInputElement>(null)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [defaultView, setDefaultView] = useState(initial.defaultView)
  const [trashRetention, setTrashRetention] = useState(initial.trashRetention)
  const [confirmDelete, setConfirmDelete] = useState(initial.confirmDelete)
  const [linkPermission, setLinkPermission] = useState(initial.linkPermission)
  const [linkExpiry, setLinkExpiry] = useState(initial.linkExpiry)
  const [externalSharing, setExternalSharing] = useState(initial.externalSharing)
  const [securityAlerts, setSecurityAlerts] = useState(initial.securityAlerts)
  const [activeSection, setActiveSection] = useState('general')
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [utilityDialog, setUtilityDialog] = useState<'sessions' | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [importError, setImportError] = useState('')
  const [initialMembers] = useState<WorkspaceMember[]>(() => readMembers(workspace.id))
  const [savedMembers, setSavedMembers] = useState<WorkspaceMember[]>(initialMembers)
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEmails, setInviteEmails] = useState<string[]>([])
  const [inviteRole, setInviteRole] = useState<MemberRole>('Editor')
  const [memberError, setMemberError] = useState('')
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null)
  const [memberToEdit, setMemberToEdit] = useState<WorkspaceMember | null>(null)
  const [memberEditRole, setMemberEditRole] = useState<MemberRole>('Viewer')
  const [memberActionToast, setMemberActionToast] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const memberToastTimer = useRef<number | null>(null)

  const currentSettings: SavedSettings = { workspaceName, timezone, defaultView, trashRetention, confirmDelete, linkPermission, linkExpiry, externalSharing, securityAlerts }
  const settingChanges = (Object.keys(settingLabels) as Array<keyof SavedSettings>).filter((key) => currentSettings[key] !== savedSettings[key]).map((key) => ({ key: String(key), label: settingLabels[key], before: displaySettingValue(savedSettings[key]), after: displaySettingValue(currentSettings[key]) }))
  const memberChanges = [
    ...members.filter((member) => !savedMembers.some((saved) => saved.id === member.id)).map((member) => ({ key: `member-added-${member.id}`, label: 'Member invitation', before: 'Not invited', after: `${member.email} · ${member.role}` })),
    ...savedMembers.filter((saved) => !members.some((member) => member.id === saved.id)).map((member) => ({ key: `member-removed-${member.id}`, label: member.status === 'Pending' ? 'Invitation cancelled' : 'Member removed', before: `${member.email} · ${member.role}`, after: 'Removed' })),
    ...members.flatMap((member) => { const saved = savedMembers.find((candidate) => candidate.id === member.id); return saved && saved.role !== member.role ? [{ key: `member-role-${member.id}`, label: `${member.email} role`, before: saved.role, after: member.role }] : [] }),
  ]
  const changes = [...settingChanges, ...memberChanges]
  const isDirty = changes.length > 0
  const timezoneOptions = Array.from(new Set([detectedTimezone, 'Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura', 'Europe/London', 'UTC']))

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])
  useEffect(() => () => { if (memberToastTimer.current !== null) window.clearTimeout(memberToastTimer.current) }, [])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) event.preventDefault() }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  useEffect(() => { if (leaveRequest > 0 && isDirty) setIsReviewOpen(true) }, [leaveRequest, isDirty])

  useEffect(() => {
    if (!isEditingWorkspaceName) return
    workspaceNameInputRef.current?.focus()
    workspaceNameInputRef.current?.select()
  }, [isEditingWorkspaceName])

  useEffect(() => {
    if (!isInviteOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsInviteOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isInviteOpen])

  const startWorkspaceNameEdit = () => {
    setWorkspaceNameDraft(workspaceName)
    setWorkspaceNameError('')
    setIsEditingWorkspaceName(true)
  }

  const cancelWorkspaceNameEdit = () => {
    setWorkspaceNameDraft(workspaceName)
    setWorkspaceNameError('')
    setIsEditingWorkspaceName(false)
  }

  const saveWorkspaceName = () => {
    const nextName = workspaceNameDraft.trim()
    if (!nextName) { setWorkspaceNameError('Workspace name is required'); workspaceNameInputRef.current?.focus(); return }
    setWorkspaceName(nextName)
    setWorkspaceNameDraft(nextName)
    setWorkspaceNameError('')
    setIsEditingWorkspaceName(false)
  }

  const applySettings = (settings: SavedSettings) => {
    setWorkspaceName(settings.workspaceName); setWorkspaceNameDraft(settings.workspaceName); setTimezone(settings.timezone); setDefaultView(settings.defaultView); setTrashRetention(settings.trashRetention)
    setConfirmDelete(settings.confirmDelete); setLinkPermission(settings.linkPermission); setLinkExpiry(settings.linkExpiry); setExternalSharing(settings.externalSharing); setSecurityAlerts(settings.securityAlerts)
    setIsEditingWorkspaceName(false); setWorkspaceNameError('')
  }

  const saveAllChanges = () => {
    try {
      window.localStorage.setItem(`beam-settings-v3-${workspace.id}`, JSON.stringify(currentSettings))
      window.localStorage.setItem(`beam-members-v1-${workspace.id}`, JSON.stringify(members))
      const savedChangeCount = changes.length
      setSavedSettings(currentSettings)
      setSavedMembers(members)
      onWorkspaceNameChange(workspace.id, currentSettings.workspaceName)
      onSaveSuccess(savedChangeCount)
      setSaveError(''); setIsReviewOpen(false); onLeaveResolved(true)
    } catch { setSaveError('Couldn’t save these changes. Please try again.') }
  }

  const undoAllChanges = () => {
    applySettings(savedSettings)
    setMembers(savedMembers)
    setSaveError(''); setIsReviewOpen(false); onLeaveResolved(true)
  }

  const cancelReview = () => { setSaveError(''); setIsReviewOpen(false); onLeaveResolved(false) }

  const exportWorkspaceData = () => {
    const payload = { format: 'beam-workspace', version: 1, workspace: savedSettings.workspaceName, exportedAt: new Date().toISOString(), settings: savedSettings, files: { storageUsedMb: 1276, storageCapacityMb: 5120 } }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${savedSettings.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workspace'}-export.json`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const importWorkspaceData = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text()) as { format?: string; version?: number; settings?: Partial<SavedSettings> }
      if (payload.format !== 'beam-workspace' || payload.version !== 1 || !payload.settings || typeof payload.settings !== 'object') throw new Error('Invalid export')
      const imported = { ...currentSettings }
      const defaults = settingsDefaults(workspace.name)
      for (const key of Object.keys(defaults) as Array<keyof SavedSettings>) {
        const value = payload.settings[key]
        if (value !== undefined) {
          if (typeof value !== typeof defaults[key]) throw new Error('Invalid setting type')
          ;(imported as Record<keyof SavedSettings, string | boolean>)[key] = value
        }
      }
      if (!(Object.keys(defaults) as Array<keyof SavedSettings>).some((key) => imported[key] !== savedSettings[key])) {
        setImportError('This export already matches your saved workspace settings.')
        if (workspaceImportRef.current) workspaceImportRef.current.value = ''
        return
      }
      applySettings(imported)
      setImportError('')
      window.setTimeout(() => setIsReviewOpen(true), 0)
    } catch { setImportError('This file is not a valid Beam workspace export.') }
    if (workspaceImportRef.current) workspaceImportRef.current.value = ''
  }

  const openSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const persistMembers = (nextMembers: WorkspaceMember[]) => {
    setMembers(nextMembers)
  }

  const addInviteEmails = (values: string[]) => {
    const candidates = values.map((email) => email.trim().toLowerCase()).filter(Boolean)
    if (!candidates.length) return true
    if (candidates.some((email) => !/^\S+@\S+\.\S+$/.test(email))) {
      setMemberError('Enter a valid email address.')
      return false
    }
    setInviteEmails((current) => Array.from(new Set([...current, ...candidates])))
    setInviteEmail('')
    setMemberError('')
    return true
  }

  const inviteMember = () => {
    const draftEmails = inviteEmail.split(/[\s,]+/).filter(Boolean)
    if (draftEmails.length && !addInviteEmails(draftEmails)) return
    const emails = Array.from(new Set([...inviteEmails, ...draftEmails.map((email) => email.toLowerCase())]))
    setMemberError('')
    if (!emails.length) { setMemberError('Enter at least one email address.'); return }
    if (emails.some((email) => members.some((member) => member.email.toLowerCase() === email))) { setMemberError('One or more people are already members or have pending invitations.'); return }
    const invitedAt = Date.now()
    const nextMembers: WorkspaceMember[] = emails.map((email, index) => ({ id: `invite-${invitedAt}-${index}`, name: email.split('@')[0], email, role: inviteRole, status: 'Pending' }))
    persistMembers([...members, ...nextMembers])
    setInviteEmail('')
    setInviteEmails([])
    setInviteRole('Editor')
    setIsInviteOpen(false)
  }

  const changeMemberRole = (memberId: string, role: string) => {
    persistMembers(members.map((member) => member.id === memberId ? { ...member, role: role as MemberRole } : member))
  }

  const removeMember = (member: WorkspaceMember) => {
    persistMembers(members.filter((candidate) => candidate.id !== member.id))
    setMemberToRemove(null)
  }

  const notifyMemberAction = (message: string) => {
    if (memberToastTimer.current !== null) window.clearTimeout(memberToastTimer.current)
    setMemberActionToast(message)
    memberToastTimer.current = window.setTimeout(() => setMemberActionToast(''), 3000)
  }

  const resendInvitation = (member: WorkspaceMember) => {
    notifyMemberAction(`Invitation resent to ${member.email}.`)
  }

  const openMemberEditor = (member: WorkspaceMember) => {
    setMemberToEdit(member)
    setMemberEditRole(member.role)
  }

  const saveMemberEditor = () => {
    if (!memberToEdit) return
    changeMemberRole(memberToEdit.id, memberEditRole)
    setMemberToEdit(null)
  }

  return (
    <main className="settingsPage" aria-labelledby="settings-title" data-page="settings">
      <header className="settingsPageHeader"><h1 id="settings-title">Settings <span aria-hidden="true">·</span> {workspace.name}</h1></header>
      <div className="settingsLayout">
        <nav className="settingsNav" aria-label="Settings sections">{visibleSections.map(([id, label]) => <button className={activeSection === id ? 'active' : ''} type="button" key={id} onClick={() => openSection(id)}>{label}</button>)}</nav>
        <label className="settingsMobileNav"><span className="srOnly">Settings section</span><select value={activeSection} onChange={(event) => openSection(event.target.value)}>{visibleSections.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select><Icon src={icons.chevron} /></label>
        <div className="settingsContent">
          {workspace.role === 'Viewer' && <div className="workspaceAccessNotice" role="note"><div><strong>View-only workspace</strong><span>You can review {workspace.name} settings, but only an owner or admin can make changes.</span></div><span className="workspaceRoleBadge">Viewer</span></div>}
          <section className="settingsGroup" id="general"><header><h2>General</h2></header>
            <Row label="Workspace name"><div className={`workspaceNameControl${isEditingWorkspaceName ? ' editing' : ''}`}><Icon src={icons.user} />{isEditingWorkspaceName ? <input ref={workspaceNameInputRef} aria-label="Workspace name" aria-invalid={Boolean(workspaceNameError)} value={workspaceNameDraft} maxLength={64} onChange={(event) => { setWorkspaceNameDraft(event.target.value); setWorkspaceNameError('') }} onKeyDown={(event) => { if (event.key === 'Enter') saveWorkspaceName(); else if (event.key === 'Escape') cancelWorkspaceNameEdit() }} /> : <span className="workspaceNameValue">{workspaceName}</span>}{canManage && <button type="button" aria-label={isEditingWorkspaceName ? 'Save workspace name' : 'Edit workspace name'} title={isEditingWorkspaceName ? 'Save' : 'Edit'} onClick={isEditingWorkspaceName ? saveWorkspaceName : startWorkspaceNameEdit}><Icon src={isEditingWorkspaceName ? icons.check : icons.edit} /></button>}{workspaceNameError && <span className="workspaceNameError" role="alert">{workspaceNameError}</span>}</div></Row>
            <Row label="Your role"><span className="workspaceRoleValue">{workspace.role}</span></Row>
            <Row label="Time zone">{canEditContent ? <SelectControl label="Time zone" value={timezone} options={timezoneOptions} icon={icons.clock} onChange={setTimezone} /> : <span className="settingsStaticValue">{timezone}</span>}</Row>
          </section>

          <section className="settingsGroup workspaceMembersGroup" id="members-access"><header><div><h2>Members and access · {members.length} member</h2></div>{canManage && <button className="inviteMembersButton" type="button" aria-expanded={isInviteOpen} onClick={() => { setIsInviteOpen((open) => !open); setMemberError('') }}><img src="/assets/members-invite.svg" alt="" aria-hidden="true" />Invite members</button>}</header>
            <div className="memberList" role="list">{members.map((member, index) => { const isCurrentUser = member.email.toLowerCase() === currentAccountEmail; return <div className="memberRow" role="listitem" key={member.id}><div className="memberPrimary"><WorkspaceAvatar name={member.name} email={member.email} variant={index} /><div className="memberIdentity"><div><strong>{member.email}</strong>{isCurrentUser && <span className="memberOwnerBadge">You</span>}{member.status === 'Pending' && <span className="memberStatus">Invited</span>}</div></div></div><div className="memberRoleCell">{canManage && member.role !== 'Owner' ? <SelectControl className="memberRoleSelect" label={`${member.name} role`} value={member.role} options={['Admin', 'Editor', 'Viewer']} chevronIcon="/assets/members-chevron.svg" onChange={(value) => changeMemberRole(member.id, value)} /> : <span className="memberRole">{member.role}</span>}</div><div className="memberActions">{canManage && member.role !== 'Owner' && (member.status === 'Pending' ? <><button className="memberResend memberActionTooltip" type="button" aria-label={`Resend invitation to ${member.email}`} data-tooltip="Resend invitation" onClick={() => resendInvitation(member)}><img src="/assets/member-resend.svg" alt="" aria-hidden="true" /></button><button className="memberPendingRemove memberActionTooltip" type="button" aria-label={`Cancel invitation for ${member.email}`} data-tooltip="Cancel invitation" onClick={() => setMemberToRemove(member)}><img src="/assets/member-invite-remove.svg" alt="" aria-hidden="true" /></button></> : <><button className="memberEdit memberActionTooltip" type="button" aria-label={`Edit ${member.email}`} data-tooltip="Edit member" onClick={() => openMemberEditor(member)}><img src="/assets/member-edit.svg" alt="" aria-hidden="true" /></button><button className="memberRemove memberActionTooltip" type="button" aria-label={`Remove ${member.email}`} data-tooltip="Remove member" onClick={() => setMemberToRemove(member)}><img src="/assets/member-trash.svg" alt="" aria-hidden="true" /><span className="memberRemoveGlyph" aria-hidden="true" /></button></>)}</div></div> })}</div>
          </section>

          <section className="settingsGroup" id="files-storage"><header><h2>Files and storage</h2></header>
            <div className="settingsStorage"><div><span>Storage used</span><span>{storageUsedMb.toLocaleString('en-US')} MB <em>of 5,120 MB</em></span></div><ProgressBar value={Math.min(100, (storageUsedMb / 5120) * 100)} label="Storage used" /></div>
            <Row label="Default view">{canEditContent ? <SelectControl label="Default view" value={defaultView} options={['List', 'Grid']} icon={icons.list} onChange={setDefaultView} /> : <span className="settingsStaticValue">{defaultView}</span>}</Row>
            <Row label="Trash retention">{canEditContent ? <SelectControl label="Trash retention" value={trashRetention} options={['7 days', '30 days', '90 days']} onChange={setTrashRetention} /> : <span className="settingsStaticValue">{trashRetention}</span>}</Row>
            <Row label="Confirm permanent deletion" infoText="Ask for confirmation before a file is permanently deleted.">{canEditContent ? <Toggle label="Confirm permanent deletion" checked={confirmDelete} onChange={setConfirmDelete} /> : <span className="settingsStaticValue">{confirmDelete ? 'On' : 'Off'}</span>}</Row>
          </section>

          <section className="settingsGroup" id="sharing"><header><h2>Sharing</h2></header>
            <Row label="Default permission">{canEditContent ? <SelectControl label="Default permission" value={linkPermission} options={['View only', 'Can download', 'Can edit']} onChange={setLinkPermission} /> : <span className="settingsStaticValue">{linkPermission}</span>}</Row>
            <Row label="Default link expiry">{canEditContent ? <SelectControl label="Default link expiry" value={linkExpiry} options={['1 day', '7 days', '30 days', 'No expiry']} onChange={setLinkExpiry} /> : <span className="settingsStaticValue">{linkExpiry}</span>}</Row>
            <Row label="External sharing" infoText="Allow files to be shared with people outside this workspace.">{canEditContent ? <Toggle label="External sharing" checked={externalSharing} onChange={setExternalSharing} /> : <span className="settingsStaticValue">{externalSharing ? 'On' : 'Off'}</span>}</Row>
          </section>

          {workspace.role !== 'Viewer' && <section className="settingsGroup" id="security"><header><h2>Security</h2></header>
            <Row label="Security alerts" infoText="Security alerts are delivered to the email address on your Beam account."><Toggle label="Security alerts" checked={securityAlerts} onChange={setSecurityAlerts} /></Row>
            <Row label="Alert destination"><span className="settingsStaticValue">michele@example.com</span></Row>
            <Row label="Active sessions"><button className="settingsInlineAction" type="button" onClick={() => setUtilityDialog('sessions')}><Icon src={icons.monitor} />Manage sessions</button></Row>
            <Row label="Two-factor authentication"><button className="settingsInlineAction" type="button"><Icon src={icons.plus} />Set up</button></Row>
            <Row label="API keys"><button className="settingsInlineAction" type="button" onClick={onOpenApiKeys}><Icon src={icons.monitor} />Manage API Keys</button></Row>
          </section>}

          {workspace.role !== 'Viewer' && <section className="settingsGroup" id="workspace-data"><header><h2>Workspace data</h2></header>
            <Row label="Workspace data" description="Import or export your workspace settings and metadata."><div className="settingsDataActions"><button type="button" onClick={() => workspaceImportRef.current?.click()}>Import data</button><button type="button" onClick={exportWorkspaceData}>Export data</button><input ref={workspaceImportRef} className="srOnly" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importWorkspaceData(file) }} /></div></Row>
            {importError && <div className="settingsDataError" role="alert">{importError}</div>}
          </section>}

          {canManage && <section className="settingsGroup danger" id="danger-zone"><header><h2>Danger zone</h2></header>
            <Row label="Delete workspace" description={canDeleteWorkspace ? 'Permanently delete this workspace and all of its files.' : 'Built-in workspaces cannot be deleted.'}><button className="settingsDangerButton" type="button" disabled={!canDeleteWorkspace} onClick={() => setIsDeleteOpen(true)}><Icon src={icons.trash} />Delete workspace</button></Row>
          </section>}
        </div>
      </div>

      {isDirty && <div className="settingsUnsavedBar" role="status"><span>{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</span><button type="button" onClick={() => setIsReviewOpen(true)}><Icon src={icons.review} /><span>Review changes</span></button></div>}

      {isReviewOpen && <div className="newFolderBackdrop settingsReviewBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelReview() }}><section className="settingsReviewModal" role="dialog" aria-modal="true" aria-labelledby="settings-review-title"><header><div><h2 id="settings-review-title">Review changes</h2><p>You have made changes to this workspace.</p></div><button type="button" aria-label="Close review changes" onClick={cancelReview}><ThemeIcon light={icons.reviewClose} dark="/assets/settings-review-close-dark.svg" /></button></header><ul>{changes.map((change) => <li key={change.key}><span>{change.label}</span><div><del>{change.before}</del><ThemeIcon light={icons.reviewArrow} dark="/assets/settings-review-value-dark.svg" /><strong>{change.after}</strong></div></li>)}</ul>{saveError && <p className="settingsReviewError" role="alert">{saveError}</p>}<footer><button type="button" onClick={undoAllChanges}><ThemeIcon light={icons.reviewUndo} dark="/assets/settings-review-undo-dark.svg" />Undo changes</button><button className="settingsReviewSave" type="button" onClick={saveAllChanges}><ThemeIcon light={icons.reviewSave} dark="/assets/settings-review-save-dark.svg" />Save changes</button></footer></section></div>}

      {isDeleteOpen && canDeleteWorkspace && <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsDeleteOpen(false) }}><section className="newFolderModal settingsDeleteModal memberRemoveModal" role="alertdialog" aria-modal="true" aria-labelledby="delete-workspace-title"><header><h2 id="delete-workspace-title">Delete workspace</h2><button type="button" aria-label="Close delete workspace dialog" onClick={() => setIsDeleteOpen(false)}><Icon src={icons.reviewClose} /></button></header><div><p><strong>{workspace.name}</strong> and all of its files, members, API keys, and settings will be permanently deleted. This action cannot be undone.</p><footer><button type="button" onClick={() => setIsDeleteOpen(false)}>Cancel</button><button className="memberRemoveConfirm" type="button" onClick={() => onDeleteWorkspace(workspace.id)}>Delete workspace</button></footer></div></section></div>}
      {utilityDialog && <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUtilityDialog(null) }}><section className="newFolderModal settingsUtilityModal" role="dialog" aria-modal="true" aria-labelledby="settings-utility-title"><header><h2 id="settings-utility-title">Active sessions</h2><button type="button" aria-label="Close active sessions dialog" onClick={() => setUtilityDialog(null)}><Icon src={icons.reviewClose} /></button></header><div className="settingsUtilityContent"><div><span>Current session</span></div><p>Other-device session management will be available after account authentication is connected.</p><footer><button type="button" onClick={() => setUtilityDialog(null)}>Okay</button></footer></div></section></div>}
      {isInviteOpen && <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsInviteOpen(false) }}><section className="newFolderModal inviteMembersModal" role="dialog" aria-modal="true" aria-labelledby="invite-members-title"><header><h2 id="invite-members-title"><img src="/assets/invite-members.svg" alt="" aria-hidden="true" />Invite members</h2><button type="button" aria-label="Close invite members" onClick={() => setIsInviteOpen(false)}><img src="/assets/invite-close.svg" alt="" aria-hidden="true" /></button></header><form onSubmit={(event) => { event.preventDefault(); inviteMember() }}><div className="inviteMembersField"><div className="inviteMembersFieldHeader"><label htmlFor={`invite-${workspace.id}`}>Email addresses</label><div><span>Role</span><SelectControl label="Invitation role" value={inviteRole} options={['Admin', 'Editor', 'Viewer']} onChange={(value) => setInviteRole(value as MemberRole)} /></div></div><div className="inviteEmailInput" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>{inviteEmails.map((email) => <span className="inviteEmailPill" key={email}><span>{email}</span><button type="button" aria-label={`Remove ${email}`} onClick={() => setInviteEmails((current) => current.filter((candidate) => candidate !== email))}><img src="/assets/invite-email-remove.svg" alt="" aria-hidden="true" /></button></span>)}<input id={`invite-${workspace.id}`} autoFocus value={inviteEmail} placeholder={inviteEmails.length ? '' : 'name@example.com, name2@example.com, ...'} onChange={(event) => { setInviteEmail(event.target.value); setMemberError('') }} onKeyDown={(event) => { if (['Enter', ' ', ','].includes(event.key)) { event.preventDefault(); addInviteEmails(inviteEmail.split(/[\s,]+/)) } else if (event.key === 'Backspace' && !inviteEmail && inviteEmails.length) { setInviteEmails((current) => current.slice(0, -1)) } }} onPaste={(event) => { const pasted = event.clipboardData.getData('text'); if (!/[\s,]/.test(pasted.trim())) return; event.preventDefault(); addInviteEmails(pasted.split(/[\s,]+/)) }} /></div>{memberError && <span className="inviteMembersError" role="alert">{memberError}</span>}</div><footer><button type="button" onClick={() => setIsInviteOpen(false)}>Cancel</button><button className="sendInvitation" type="submit"><img src="/assets/invite-send.svg" alt="" aria-hidden="true" />Send invitation</button></footer></form></section></div>}
      {memberToRemove && <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMemberToRemove(null) }}><section className="newFolderModal settingsDeleteModal memberRemoveModal" role="alertdialog" aria-modal="true" aria-labelledby="remove-member-title"><header><h2 id="remove-member-title">Remove member</h2><button type="button" aria-label="Close" onClick={() => setMemberToRemove(null)}><Icon src={icons.reviewClose} /></button></header><div><p>{memberToRemove.status === 'Pending' ? `${memberToRemove.email} will be removed from ${workspace.name}, and their invitation will no longer work.` : `${memberToRemove.name} will immediately lose access to ${workspace.name} and its files.`}</p><footer><button type="button" onClick={() => setMemberToRemove(null)}>Cancel</button><button className="memberRemoveConfirm" type="button" onClick={() => removeMember(memberToRemove)}>Remove member</button></footer></div></section></div>}
      {memberToEdit && <div className="newFolderBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMemberToEdit(null) }}><section className="newFolderModal settingsDeleteModal memberEditModal" role="dialog" aria-modal="true" aria-labelledby="edit-member-title"><header><h2 id="edit-member-title">Edit member</h2><button type="button" aria-label="Close" onClick={() => setMemberToEdit(null)}><Icon src={icons.reviewClose} /></button></header><div><div className="memberEditModalRow"><div><strong>{memberToEdit.name}</strong><span>{memberToEdit.email}</span></div><SelectControl label={`${memberToEdit.name} role`} value={memberEditRole} options={['Admin', 'Editor', 'Viewer']} chevronIcon="/assets/members-chevron.svg" onChange={(value) => setMemberEditRole(value as MemberRole)} /></div><footer><button type="button" onClick={() => setMemberToEdit(null)}>Cancel</button><button className="memberEditSave" type="button" onClick={saveMemberEditor}>Save member</button></footer></div></section></div>}
      {memberActionToast && <div className="apiCreatedToast" role="status" aria-live="polite"><span className="apiCreatedToastIcon"><img src="/assets/toast-success.svg" alt="" aria-hidden="true" /></span><div><strong>Invitation sent</strong><span>{memberActionToast}</span></div></div>}
    </main>
  )
}
