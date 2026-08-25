type ToggleProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  saving?: boolean
}

export default function Toggle({ checked, onChange, label, saving = false }: ToggleProps) {
  return <label className={`settingsToggle${checked ? ' checked' : ''}${saving ? ' saving' : ''}`}>
    <input type="checkbox" checked={checked} disabled={saving} onChange={(event) => onChange(event.target.checked)} aria-busy={saving || undefined} />
    <span className="settingsToggleHit"><span className="settingsToggleTrack"><span className="settingsToggleThumb"><img src={checked ? '/assets/settings-toggle-active.svg' : '/assets/settings-toggle-inactive.svg'} alt="" aria-hidden="true" /></span></span></span>
    <span className="srOnly">{label}</span>
  </label>
}
