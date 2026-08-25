import { FormEvent, useEffect, useRef, useState } from 'react'
import SelectControl from './SelectControl'
import WorkspaceAvatar from './WorkspaceAvatar'
import { validateWorkspaceName } from '../utils/workspaceName'

type InviteRole = 'Editor' | 'Viewer'
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
  const [inviteRole, setInviteRole] = useState<InviteRole>('Viewer')
  const [nameError, setNameError] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const hasMeaningfulDraft = Boolean(name.trim() || emailDraft.trim() || invitations.length)
  const requestCancel = () => { if (!hasMeaningfulDraft || window.confirm('Discard this workspace draft?')) onCancel() }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('[aria-expanded="true"]')) requestCancel() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [hasMeaningfulDraft])

  const addEmails = (values: string[]) => {
    const emails = values.map((value) => value.trim().toLowerCase()).filter(Boolean)
    if (!emails.length) { setInviteError('Enter at least one email address.'); return false }
    if (emails.some((email) => !validEmail.test(email))) { setInviteError('Enter a valid email address.'); return false }
    setInvitations((current) => [...current, ...emails.filter((email) => !current.some((invitation) => invitation.email === email)).map((email) => ({ email, role: inviteRole }))])
    setEmailDraft('')
    setInviteError('')
    return true
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (isSubmittingRef.current) return
    const validation = validateWorkspaceName(name, existingNames)
    if (!validation.valid) { setNameError(validation.error); return }
    const workspaceName = validation.name
    const pendingEmails = emailDraft.split(/[\s,]+/).filter(Boolean)
    if (pendingEmails.length && !addEmails(pendingEmails)) return
    const pendingInvitations = pendingEmails.filter((email) => !invitations.some((invitation) => invitation.email === email.toLowerCase())).map((email) => ({ email: email.toLowerCase(), role: inviteRole }))
    isSubmittingRef.current = true
    setIsSubmitting(true)
    onCreate({ name: workspaceName, invitations: [...invitations, ...pendingInvitations] })
  }

  return <main className="createWorkspacePage" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title">
    <header className="createWorkspaceHeader"><div><h1 id="create-workspace-title">Create a new workspace</h1><p>Give your team one place to organize files, collaborate, and manage access.</p></div></header>
    <form className="createWorkspaceBody" onSubmit={submit} noValidate>
      <section className="createWorkspaceGroup"><header><h2>Workspace details</h2></header><div className="createWorkspaceFields"><label><span>Workspace name</span><input autoFocus value={name} maxLength={64} placeholder="Enter workspace name" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'workspace-name-error' : undefined} onChange={(event) => { setName(event.target.value); setNameError('') }} />{nameError && <small id="workspace-name-error" className="createWorkspaceFieldError" role="alert">{nameError}</small>}</label><div className="workspaceUrlPreview"><span>Workspace URL</span><strong>beam.app/{slugify(name) || 'workspace-name'}</strong></div></div></section>
      <section className="createWorkspaceGroup"><header><div><h2>Invite members</h2><span>optional</span></div></header><div className="createWorkspaceInvite"><div className="createWorkspaceInviteHeader"><span>Email addresses</span><div><SelectControl className="createWorkspaceDefaultRole" label="Invitation role" value={inviteRole} options={['Editor', 'Viewer']} icon="/assets/create-workspace-chevron.svg" chevronIcon="/assets/create-workspace-chevron.svg" onChange={(value) => setInviteRole(value as InviteRole)} /></div></div><div className="createWorkspaceEmailInput"><input value={emailDraft} aria-invalid={Boolean(inviteError)} aria-describedby={inviteError ? 'workspace-invite-error' : undefined} placeholder="name@example.com, name2@example.com, ..." onChange={(event) => { setEmailDraft(event.target.value); setInviteError('') }} onKeyDown={(event) => { if (event.key === ',' || event.key === ' ') { event.preventDefault(); addEmails(emailDraft.split(/[\s,]+/)) } }} onPaste={(event) => { const pasted = event.clipboardData.getData('text'); if (!/[\s,]/.test(pasted.trim())) return; event.preventDefault(); addEmails(pasted.split(/[\s,]+/)) }} /><button type="button" onClick={() => addEmails(emailDraft.split(/[\s,]+/))}><img src="/assets/create-workspace-invite.svg" alt="" aria-hidden="true" />Add to invitation list</button></div>{inviteError && <small id="workspace-invite-error" className="createWorkspaceFieldError" role="alert">{inviteError}</small>}<div className="createWorkspaceInviteNotice" role="note"><img src="/assets/create-workspace-info.svg" alt="" aria-hidden="true" /><span>Listed members will be invited when this workspace is created. You can invite more later from Members and access.</span></div></div>{invitations.length > 0 && <div className="createWorkspaceInviteList" role="list" aria-label="Members to invite">{invitations.map((invitation, index) => <div className="createWorkspaceInviteRow" role="listitem" key={invitation.email}><div><WorkspaceAvatar name={invitation.email.split('@')[0]} email={invitation.email} variant={index + 1} /><span>{invitation.email}</span></div><SelectControl label={`${invitation.email} role`} value={invitation.role} options={['Editor', 'Viewer']} chevronIcon="/assets/create-workspace-chevron.svg" onChange={(value) => setInvitations((current) => current.map((candidate) => candidate.email === invitation.email ? { ...candidate, role: value as InviteRole } : candidate))} /><button type="button" aria-label={`Remove ${invitation.email}`} onClick={() => setInvitations((current) => current.filter((candidate) => candidate.email !== invitation.email))}><img src="/assets/member-invite-remove.svg" alt="" /></button></div>)}</div>}</section>
      <footer className="createWorkspaceActions"><button type="button" data-modal-close onClick={requestCancel}>Cancel</button><button className="createWorkspaceSubmit" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}><img src="/assets/workspace-menu-add.svg" alt="" />Create workspace</button></footer>
    </form>
  </main>
}
