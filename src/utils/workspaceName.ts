export const normalizeWorkspaceName = (value: string) => value.trim().toLocaleLowerCase()

export function validateWorkspaceName(value: string, existingNames: string[], currentName?: string) {
  const trimmedName = value.trim()
  if (!trimmedName) return { valid: false as const, error: 'Enter a workspace name.' }
  const normalizedName = normalizeWorkspaceName(trimmedName)
  const normalizedCurrentName = currentName ? normalizeWorkspaceName(currentName) : null
  const isDuplicate = existingNames.some((existingName) => {
    const normalizedExistingName = normalizeWorkspaceName(existingName)
    return normalizedExistingName === normalizedName && normalizedExistingName !== normalizedCurrentName
  })
  if (isDuplicate) return { valid: false as const, error: 'A workspace with this name already exists.' }
  return { valid: true as const, name: trimmedName }
}
