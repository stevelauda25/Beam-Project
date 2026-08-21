import { useState } from 'react'
import SelectControl from './SelectControl'
import WorkspaceAvatar from './WorkspaceAvatar'

type InviteRole = 'Admin' | 'Editor' | 'Viewer'
type WorkspaceInvitation = { email: string; role: InviteRole }

type CreateWorkspacePageProps = {
  existingNames: string[]
  onCancel: () => void
  onCreate: (workspace: { name: string; invitations: WorkspaceInvitation[] }) => void
}

const validEmail = /^\S+@\S+\.\S+$/
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function CreateWorkspacePage({ existingNames, onCancel, onCreate }: CreateWorkspacePageProps) {
  const [name, setName] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [inviteRole, setInviteRole] = useState<InviteRole>('Editor')
  const [error, setError] = useState('')

  const addEmails = (values: string[]) => {
    const emails = values.map((value) => value.trim().toLowerCase()).filter(Boolean)
    if (!emails.length) return true
    if (emails.some((email) => !validEmail.test(email))) { setError('Enter a valid email address.'); return false }
    setInvitations((current) => [...current, ...emails.filter((email) => !current.some((invitation) => invitation.email === email)).map((email) => ({ email, role: inviteRole }))])
    setEmailDraft('')
    setError('')
    return true
  }

  const submit = () => {
    const workspaceName = name.trim()
    if (!workspaceName) { setError('Enter a workspace name.'); return }
    if (existingNames.some((existing) => existing.toLowerCase() === workspaceName.toLowerCase())) { setError('A workspace with this name already exists.'); return }
    const pendingEmails = emailDraft.split(/[\s,]+/).filter(Boolean)
    if (pendingEmails.length && !addEmails(pendingEmails)) return
    const pendingInvitations = pendingEmails.filter((email) => !invitations.some((invitation) => invitation.email === email.toLowerCase())).map((email) => ({ email: email.toLowerCase(), role: inviteRole }))
    onCreate({ name: workspaceName, invitations: [...invitations, ...pendingInvitations] })
  }

  return <main className="createWorkspacePage" aria-labelledby="create-workspace-title">
    <header className="createWorkspaceHeader"><div><h1 id="create-workspace-title">Create a new workspace</h1><p>Give your team one place to organize files, collaborate, and manage access.</p></div></header>
    <div className="createWorkspaceBody">
      <section className="createWorkspaceGroup"><header><h2>Workspace details</h2></header><div className="createWorkspaceFields"><label><span>Workspace name</span><input autoFocus value={name} maxLength={64} placeholder="Enter workspace name" onChange={(event) => { setName(event.target.value); setError('') }} /></label><div className="workspaceUrlPreview"><span>Workspace URL</span><strong>beam.app/{slugify(name) || 'workspace-name'}</strong></div></div></section>
      <section className="createWorkspaceGroup"><header><div><h2>Invite members</h2><span>optional</span></div></header><div className="createWorkspaceInvite"><div className="createWorkspaceInviteHeader"><span>Email addresses</span><div><SelectControl className="createWorkspaceDefaultRole" label="Invitation role" value={inviteRole} options={['Admin', 'Editor', 'Viewer']} icon="/assets/create-workspace-chevron.svg" chevronIcon="/assets/create-workspace-chevron.svg" onChange={(value) => setInviteRole(value as InviteRole)} /></div></div><div className="createWorkspaceEmailInput"><input value={emailDraft} placeholder="name@example.com, name2@example.com, ..." onChange={(event) => { setEmailDraft(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',' || event.key === ' ') { event.preventDefault(); addEmails(emailDraft.split(/[\s,]+/)) } }} onPaste={(event) => { const pasted = event.clipboardData.getData('text'); if (!/[\s,]/.test(pasted.trim())) return; event.preventDefault(); addEmails(pasted.split(/[\s,]+/)) }} /><button type="button" onClick={() => addEmails(emailDraft.split(/[\s,]+/))}><img src="/assets/create-workspace-invite.svg" alt="" aria-hidden="true" />Invite</button></div><div className="createWorkspaceInviteNotice" role="note"><img src="/assets/create-workspace-info.svg" alt="" aria-hidden="true" /><span>Listed members will be invited when this workspace is created. You can invite more later from Members and access.</span></div></div>{invitations.length > 0 && <div className="createWorkspaceInviteList" role="list" aria-label="Members to invite">{invitations.map((invitation, index) => <div className="createWorkspaceInviteRow" role="listitem" key={invitation.email}><div><WorkspaceAvatar name={invitation.email.split('@')[0]} email={invitation.email} variant={index + 1} /><span>{invitation.email}</span></div><SelectControl label={`${invitation.email} role`} value={invitation.role} options={['Admin', 'Editor', 'Viewer']} chevronIcon="/assets/create-workspace-chevron.svg" onChange={(value) => setInvitations((current) => current.map((candidate) => candidate.email === invitation.email ? { ...candidate, role: value as InviteRole } : candidate))} /><button type="button" aria-label={`Remove ${invitation.email}`} onClick={() => setInvitations((current) => current.filter((candidate) => candidate.email !== invitation.email))}><img src="/assets/member-invite-remove.svg" alt="" /></button></div>)}</div>}</section>
      {error && <p className="createWorkspaceError" role="alert">{error}</p>}
      <footer className="createWorkspaceActions"><button type="button" onClick={onCancel}>Cancel</button><button className="createWorkspaceSubmit" type="button" onClick={submit}><img src="/assets/workspace-menu-add.svg" alt="" />Create workspace</button></footer>
    </div>
  </main>
}
