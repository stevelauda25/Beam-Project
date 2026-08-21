type WorkspaceAvatarProps = {
  name: string
  email?: string
  variant?: number
}

export default function WorkspaceAvatar({ name, email = '', variant = 0 }: WorkspaceAvatarProps) {
  const source = name.trim() || email.split('@')[0] || '?'
  const initials = source.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'
  return <span className={`workspaceAvatar variant${Math.abs(variant) % 4}`} aria-hidden="true">{initials}</span>
}
