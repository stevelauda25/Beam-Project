import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

type SelectControlProps = {
  value: string
  options: string[]
  icon?: string
  label: string
  onChange: (value: string) => void
  className?: string
}

const Icon = ({ src }: { src: string }) => <img className="settingsIcon" src={src} alt="" aria-hidden="true" />

export default function SelectControl({ value, options, icon, label, onChange, className = '' }: SelectControlProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(() => Math.max(0, options.indexOf(value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const typeBuffer = useRef('')
  const typeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  useEffect(() => { if (open) optionRefs.current[focusedIndex]?.focus() }, [focusedIndex, open])

  const choose = (option: string) => { onChange(option); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()) }
  const openAt = (index: number) => { setFocusedIndex(index); setOpen(true) }
  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); openAt(event.key === 'ArrowUp' ? options.length - 1 : Math.max(0, options.indexOf(value)))
    }
  }
  const handleOptionKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setFocusedIndex((index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length) }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setFocusedIndex(event.key === 'Home' ? 0 : options.length - 1) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(options[index]) }
    else if (event.key === 'Escape' || event.key === 'Tab') { setOpen(false); if (event.key === 'Escape') { event.preventDefault(); triggerRef.current?.focus() } }
    else if (event.key.length === 1 && /\S/.test(event.key)) {
      typeBuffer.current += event.key.toLowerCase(); window.clearTimeout(typeTimer.current)
      const match = options.findIndex((option) => option.toLowerCase().startsWith(typeBuffer.current))
      if (match >= 0) setFocusedIndex(match)
      typeTimer.current = window.setTimeout(() => { typeBuffer.current = '' }, 500)
    }
  }

  return <div className={`settingsSelect${open ? ' open' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
    <button ref={triggerRef} className="settingsSelectTrigger" type="button" aria-label={`${label}: ${value}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => open ? setOpen(false) : openAt(Math.max(0, options.indexOf(value)))} onKeyDown={handleTriggerKeyDown}>
      {icon && <Icon src={icon} />}<span>{value}</span><Icon src="/assets/settings-user.svg" />
    </button>
    {open && <div className="settingsSelectMenu" role="listbox" aria-label={label}>{options.map((option, index) => <button ref={(node) => { optionRefs.current[index] = node }} className={`${option === value ? 'selected ' : ''}${index === focusedIndex ? 'focused' : ''}`} type="button" role="option" aria-selected={option === value} tabIndex={index === focusedIndex ? 0 : -1} key={option} onMouseEnter={() => setFocusedIndex(index)} onKeyDown={(event) => handleOptionKeyDown(event, index)} onClick={() => choose(option)}><span>{option}</span>{option === value && <Icon src="/assets/settings-list.svg" />}</button>)}</div>}
  </div>
}
