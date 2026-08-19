import { useRef, useState } from 'react'

const accountSections = [['account-personal', 'Personal information'], ['account-signin', 'Sign-in methods'], ['account-protection', 'Account protection'], ['account-danger', 'Danger zone']] as const
const icons = { edit: '/assets/settings-edit.svg', plus: '/assets/settings-plus.svg', monitor: '/assets/settings-monitor.svg', trash: '/assets/settings-trash.svg' } as const

export default function AccountProfilePage() {
  const [activeSection, setActiveSection] = useState('account-personal')
  const [displayName, setDisplayName] = useState('Michele J.')
  const [draftName, setDraftName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('/assets/avatar.png')
  const [editingPassword, setEditingPassword] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const openSection = (id: string) => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const saveName = () => { const next = draftName.trim(); if (next) { setDisplayName(next); setEditingName(false) } }

  return <main className="accountPage" aria-labelledby="account-title">
    <header className="accountPageHeader"><h1 id="account-title">Account settings</h1></header>
    <div className="accountSettingsLayout">
      <nav className="accountSectionNav" aria-label="Account settings sections">{accountSections.map(([id, label]) => <button className={activeSection === id ? 'active' : ''} type="button" key={id} onClick={() => openSection(id)}>{label}</button>)}</nav>
      <div className="accountPageContent">
        <section className="profileGroup" id="account-personal" aria-labelledby="personal-information-title"><header><h2 id="personal-information-title">Personal information</h2></header>
          <div className="profileRow"><div><span>Profile photo</span><small>JPG or PNG, maximum 5 MB</small></div><div className="profilePhotoControl"><img src={avatarUrl} alt="Michele J." /><span>profile.jpg</span><button type="button" onClick={() => avatarInput.current?.click()}>Change</button><input ref={avatarInput} className="srOnly" type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) setAvatarUrl(URL.createObjectURL(file)) }} /></div></div>
          <div className="profileRow"><div><span>Display name</span><small>This is how other people see you</small></div><div className="profileField">{editingName ? <input autoFocus value={draftName} maxLength={64} aria-label="Display name" onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveName(); if (event.key === 'Escape') setEditingName(false) }} /> : <span>{displayName}</span>}<button className="profileIconAction" type="button" aria-label={editingName ? 'Save display name' : 'Edit display name'} onClick={() => editingName ? saveName() : setEditingName(true)}><img src={icons.edit} alt="" /></button></div></div>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Email address <em>Verified</em></span><small>Used to sign in and receive account notices</small></div><div className="profileEmail"><span>michele@beam.app</span><button className="profileIconAction" type="button" aria-label="Change email address"><img src={icons.edit} alt="" /></button></div></div>
        </section>
        <section className="profileGroup" id="account-signin" aria-labelledby="sign-in-methods-title"><header><h2 id="sign-in-methods-title">Sign-in methods</h2></header>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Email <em>Verified</em></span><small>Your primary sign-in and recovery address</small></div><div className="profileEmail"><span>michele@beam.app</span><button className="profileIconAction" type="button" aria-label="Change sign-in email"><img src={icons.edit} alt="" /></button></div></div>
          <div className="profileRow"><div><span>Password</span><small>Last changed July 12, 2026</small></div><button className="profileActionWithIcon" type="button" onClick={() => setEditingPassword((open) => !open)}>{editingPassword ? 'Cancel' : 'Change password'}<img src={icons.edit} alt="" /></button></div>
          {editingPassword && <form className="profilePasswordForm" onSubmit={(event) => { event.preventDefault(); setEditingPassword(false) }}><label>Current password<input type="password" autoComplete="current-password" /></label><label>New password<input type="password" autoComplete="new-password" minLength={10} /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={10} /></label><div><button type="button" onClick={() => setEditingPassword(false)}>Cancel</button><button className="primary" type="submit">Update password</button></div></form>}
          <div className="profileRow"><div><span className="profileLabelWithStatus">Google <em>Connected</em></span><small>Connected as michele@gmail.com</small></div><button className="profileDisconnect" type="button">Disconnect</button></div>
        </section>
        <section className="profileGroup" id="account-protection" aria-labelledby="account-protection-title"><header><h2 id="account-protection-title">Account protection</h2></header>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Two-step verification <em className="off">Off</em></span><small>Add an extra layer of protection when signing in.</small></div><button className="profileActionWithIcon" type="button">Set up<img src={icons.plus} alt="" /></button></div>
          <div className="profileRow"><div><span>Active sessions</span><small>1 active session · This browser</small></div><button className="profileActionWithIcon" type="button">Manage sessions<img src={icons.monitor} alt="" /></button></div>
        </section>
        <section className="profileGroup profileDanger" id="account-danger" aria-labelledby="delete-account-title"><header><h2 id="delete-account-title">Danger zone</h2></header><div className="profileRow"><div><span>Delete account</span><small>You must transfer or delete owned workspaces first.</small></div><button className="profileDelete" type="button"><img src={icons.trash} alt="" />Delete account</button></div></section>
      </div><div className="accountLayoutSpacer" aria-hidden="true" />
    </div>
  </main>
}
