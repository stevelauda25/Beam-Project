import { useEffect, useRef, useState } from 'react'

const accountSections = [['account-personal', 'Personal information'], ['account-signin', 'Sign-in methods'], ['account-protection', 'Account protection'], ['account-danger', 'Danger zone']] as const
const icons = { edit: '/assets/settings-edit.svg', check: '/assets/settings-list.svg', plus: '/assets/settings-plus.svg', monitor: '/assets/settings-monitor.svg', trash: '/assets/settings-trash.svg' } as const
const ThemeIcon = ({ light, dark }: { light: string; dark: string }) => <span className="settingsThemeIcon" aria-hidden="true"><img className="settingsIcon lightAsset" src={light} alt="" /><img className="settingsIcon darkAsset" src={dark} alt="" /></span>

type AccountProfilePageProps = { displayName: string; onDisplayNameSave: (name: string) => void; onPasswordUpdateSuccess: () => void }

export default function AccountProfilePage({ displayName, onDisplayNameSave, onPasswordUpdateSuccess }: AccountProfilePageProps) {
  const [activeSection, setActiveSection] = useState(() => { const requested = new URLSearchParams(window.location.search).get('section'); return accountSections.some(([id]) => id === requested) ? requested! : 'account-personal' })
  const contentRef = useRef<HTMLDivElement>(null)
  const [draftName, setDraftName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [reviewingName, setReviewingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('/assets/avatar.png')
  const [avatarFilename, setAvatarFilename] = useState('profile.jpg')
  const [avatarError, setAvatarError] = useState('')
  const [editingPassword, setEditingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const passwordUpdateTimerRef = useRef<number | null>(null)
  const currentPasswordRef = useRef<HTMLInputElement>(null)
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const openSection = (id: string) => { setActiveSection(id); const url = new URL(window.location.href); url.searchParams.set('section', id); window.history.pushState({}, '', url) }
  const reviewName = () => { const next = draftName.trim(); if (!next) { setNameError('Display name is required'); return }; if (next === displayName) { setEditingName(false); return }; setDraftName(next); setNameError(''); setEditingName(false); setReviewingName(true) }
  const saveName = () => { onDisplayNameSave(draftName); setReviewingName(false) }
  const selectAvatar = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setAvatarError('Choose a JPG or PNG image.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Profile photo must be 5 MB or smaller.'); return }
    if (avatarUrl.startsWith('blob:')) URL.revokeObjectURL(avatarUrl)
    setAvatarUrl(URL.createObjectURL(file)); setAvatarFilename(file.name); setAvatarError('')
  }
  const updatePassword = (event: React.FormEvent) => {
    event.preventDefault()
    if (isUpdatingPassword) return
    const errors: typeof passwordErrors = {}
    if (!currentPassword) errors.current = 'Enter your current password.'
    if (newPassword.length < 10) errors.next = 'Use at least 10 characters.'
    if (confirmPassword !== newPassword) errors.confirm = 'Passwords do not match.'
    setPasswordErrors(errors)
    if (errors.current) { currentPasswordRef.current?.focus(); return }
    if (errors.next) { newPasswordRef.current?.focus(); return }
    if (errors.confirm) { confirmPasswordRef.current?.focus(); return }
    setIsUpdatingPassword(true)
    passwordUpdateTimerRef.current = window.setTimeout(() => { setIsUpdatingPassword(false); setEditingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); onPasswordUpdateSuccess() }, 250)
  }

  useEffect(() => {
    if (!reviewingName) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setReviewingName(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [reviewingName])

  useEffect(() => { contentRef.current?.querySelectorAll<HTMLElement>(':scope > section').forEach((section) => { section.hidden = section.id !== activeSection }) }, [activeSection])
  useEffect(() => () => { if (passwordUpdateTimerRef.current !== null) window.clearTimeout(passwordUpdateTimerRef.current); if (avatarUrl.startsWith('blob:')) URL.revokeObjectURL(avatarUrl) }, [avatarUrl])
  useEffect(() => { const restore = () => { const requested = new URLSearchParams(window.location.search).get('section'); setActiveSection(accountSections.some(([id]) => id === requested) ? requested! : 'account-personal') }; window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore) }, [])

  return <main className="accountPage" aria-labelledby="account-title">
    <header className="accountPageHeader"><h1 id="account-title">Account settings</h1></header>
    <div className="accountSettingsLayout">
      <nav className="accountSectionNav" aria-label="Account settings sections">{accountSections.map(([id, label]) => <button className={activeSection === id ? 'active' : ''} type="button" key={id} onClick={() => openSection(id)}>{label}</button>)}</nav>
      <div ref={contentRef} className="accountPageContent">
        <section className="profileGroup" id="account-personal" aria-labelledby="personal-information-title"><header><h2 id="personal-information-title">Personal information</h2></header>
          <div className="profileRow"><div><span>Profile photo</span><small>JPG or PNG, maximum 5 MB</small>{avatarError && <small className="profileFieldError" role="alert">{avatarError}</small>}</div><div className="profilePhotoControl"><img src={avatarUrl} alt={`${displayName} profile`} /><span>{avatarFilename}</span><button type="button" aria-label="Change profile photo" onClick={() => avatarInput.current?.click()}>Change</button><input ref={avatarInput} className="srOnly" type="file" accept="image/png,image/jpeg" onChange={(event) => { selectAvatar(event.target.files?.[0]); event.target.value = '' }} /></div></div>
          <div className="profileRow"><div><span>Display name</span><small>This is how other people see you</small></div><div className={`profileField${editingName ? ' editing' : ''}${nameError ? ' invalid' : ''}`}>{editingName ? <input autoFocus size={Math.max(1, draftName.length)} value={draftName} maxLength={64} aria-label="Display name" aria-invalid={Boolean(nameError)} onChange={(event) => { setDraftName(event.target.value); setNameError('') }} onKeyDown={(event) => { if (event.key === 'Enter') reviewName(); if (event.key === 'Escape') { setDraftName(displayName); setNameError(''); setEditingName(false) } }} /> : <span>{displayName}</span>}<button className="profileIconAction" type="button" aria-label={editingName ? 'Review display name' : 'Edit display name'} onClick={() => editingName ? reviewName() : (setDraftName(displayName), setEditingName(true))}><img src={editingName ? icons.check : icons.edit} alt="" /></button>{nameError && <span className="profileFieldError" role="alert">{nameError}</span>}</div></div>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Email address <em>Verified</em></span><small>Used to sign in and receive account notices</small></div><div className="profileEmail"><span>michele@beam.app</span><button className="profileUnavailableAction" type="button" disabled title="Email changes will be available after account verification is connected">Coming soon</button></div></div>
        </section>
        <section className="profileGroup" id="account-signin" aria-labelledby="sign-in-methods-title"><header><h2 id="sign-in-methods-title">Sign-in methods</h2></header>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Email <em>Verified</em></span><small>Your primary sign-in and recovery address</small></div><div className="profileEmail"><span>michele@beam.app</span><button className="profileUnavailableAction" type="button" disabled title="Sign-in email changes are not available yet">Coming soon</button></div></div>
          <div className="profileRow"><div><span>Password</span><small>Last changed July 12, 2026</small></div><button className="profileActionWithIcon" type="button" onClick={() => setEditingPassword((open) => !open)}>{editingPassword ? 'Cancel' : 'Change password'}<img src={icons.edit} alt="" /></button></div>
          {editingPassword && <form className="profilePasswordForm" onSubmit={updatePassword} noValidate><label>Current password<input ref={currentPasswordRef} type="password" autoComplete="current-password" value={currentPassword} aria-invalid={Boolean(passwordErrors.current)} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordErrors((errors) => ({ ...errors, current: undefined })) }} />{passwordErrors.current && <small role="alert">{passwordErrors.current}</small>}</label><label>New password<input ref={newPasswordRef} type="password" autoComplete="new-password" value={newPassword} aria-invalid={Boolean(passwordErrors.next)} onChange={(event) => { setNewPassword(event.target.value); setPasswordErrors((errors) => ({ ...errors, next: undefined })) }} />{passwordErrors.next && <small role="alert">{passwordErrors.next}</small>}</label><label>Confirm new password<input ref={confirmPasswordRef} type="password" autoComplete="new-password" value={confirmPassword} aria-invalid={Boolean(passwordErrors.confirm)} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordErrors((errors) => ({ ...errors, confirm: undefined })) }} />{passwordErrors.confirm && <small role="alert">{passwordErrors.confirm}</small>}</label><div><button type="button" onClick={() => setEditingPassword(false)}>Cancel</button><button className="primary" type="submit" disabled={isUpdatingPassword} aria-busy={isUpdatingPassword}>{isUpdatingPassword ? 'Updating…' : 'Update password'}</button></div></form>}
          <div className="profileRow"><div><span className="profileLabelWithStatus">Google <em>Connected</em></span><small>Connected as michele@gmail.com</small></div><button className="profileUnavailableAction" type="button" disabled title="Google disconnection is not available in this prototype">Coming soon</button></div>
        </section>
        <section className="profileGroup" id="account-protection" aria-labelledby="account-protection-title"><header><h2 id="account-protection-title">Account protection</h2></header>
          <div className="profileRow"><div><span className="profileLabelWithStatus">Two-factor authentication <em className="off">Off</em></span><small>Add an extra layer of protection when signing in.</small></div><button className="profileUnavailableAction" type="button" disabled title="Two-factor authentication is coming soon">Coming soon</button></div>
          <div className="profileRow"><div><span>Active sessions</span><small>1 active session · This browser</small></div><button className="profileUnavailableAction" type="button" disabled title="Session management is coming soon">Coming soon</button></div>
        </section>
        <section className="profileGroup profileDanger" id="account-danger" aria-labelledby="delete-account-title"><header><h2 id="delete-account-title">Danger zone</h2></header><div className="profileRow"><div><span>Delete account</span><small>You must transfer or delete owned workspaces first.</small></div><button className="profileUnavailableAction" type="button" disabled title="Delete or transfer owned workspaces before deleting this account">Unavailable</button></div></section>
      </div><div className="accountLayoutSpacer" aria-hidden="true" />
    </div>
    {reviewingName && <div className="newFolderBackdrop settingsReviewBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewingName(false) }}><section className="settingsReviewModal accountNameReviewModal" role="dialog" aria-modal="true" aria-labelledby="account-name-review-title"><header><div><h2 id="account-name-review-title">Review changes</h2><p>You have made changes to these settings.</p></div><button type="button" aria-label="Close review changes" onClick={() => setReviewingName(false)}><ThemeIcon light="/assets/settings-review-close.svg" dark="/assets/settings-review-close-dark.svg" /></button></header><ul><li><span>Display name</span><div><del>{displayName}</del><ThemeIcon light="/assets/settings-review-undo.svg" dark="/assets/settings-review-value-dark.svg" /><strong>{draftName}</strong></div></li></ul><footer><button type="button" onClick={() => { setDraftName(displayName); setReviewingName(false) }}><ThemeIcon light="/assets/settings-review-save.svg" dark="/assets/settings-review-undo-dark.svg" />Undo changes</button><button className="settingsReviewSave" type="button" onClick={saveName}><ThemeIcon light="/assets/settings-review-arrow.svg" dark="/assets/settings-review-save-dark.svg" />Save changes</button></footer></section></div>}
  </main>
}
