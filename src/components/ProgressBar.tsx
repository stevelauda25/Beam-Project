type ProgressBarProps = {
  value: number
  label: string
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return <div className="settingsStorageTrack" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={normalizedValue}>
    <span style={{ width: `${normalizedValue}%` }} />
  </div>
}
