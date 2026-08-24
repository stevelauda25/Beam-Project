import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

export type UploadProgressFile = { name: string; size: string; icon?: string; weight?: number; initialProgress?: number }
type Props = { onClose: () => void; files?: UploadProgressFile[]; onComplete?: () => void; autoCloseOnComplete?: boolean }

const demoFiles: UploadProgressFile[] = [
  { name: 'backup-prompt.md', size: '12,2 MB', weight: 12.2, initialProgress: 62, icon: '/assets/upload-file.svg' },
  { name: 'getting-started.md', size: '12 MB', weight: 12, initialProgress: 52, icon: '/assets/upload-file.svg' },
  { name: 'organize-thoughts-prompt-the-latest.md', size: '7,4 MB', weight: 7.4, initialProgress: 38, icon: '/assets/upload-file.svg' },
  { name: 'woman-proffesional.jpeg', size: '2,3 MB', weight: 2.3, initialProgress: 22, icon: '/assets/upload-image-file.svg' },
]
const clamp = (value: number) => Math.max(0, Math.min(100, value))

function weightFromSize(size: string) {
  const value = Number.parseFloat(size.replace(',', '.')) || 1
  if (/GB/i.test(size)) return value * 1024
  if (/KB/i.test(size)) return value / 1024
  if (/\bB\b/i.test(size) && !/MB/i.test(size)) return value / (1024 * 1024)
  return value
}

function createInitialProgress(files: UploadProgressFile[]) {
  const weights = files.map((file) => file.weight ?? weightFromSize(file.size))
  const raw = files.map((file, index) => file.initialProgress ?? clamp(62 - index * 10))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1
  const weightedMean = raw.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight
  const adjustment = 50 - weightedMean
  return raw.map((value) => clamp(value + adjustment))
}

function TruncatedFilename({ name }: { name: string }) {
  const dot = name.lastIndexOf('.')
  const hasExtension = dot > 0 && dot < name.length - 1
  return <span className="uploadDemoTruncatedName" title={name}><span>{hasExtension ? name.slice(0, dot) : name}</span>{hasExtension && <span>{name.slice(dot)}</span>}</span>
}

const mosaicColumns = 27
const mosaicRows = 13
const cellCount = mosaicRows * mosaicColumns
function MosaicField({ progress }: { progress: number }) {
  const activeCount = Math.round((progress / 100) * cellCount)
  return <span className="uploadDemoMosaic" aria-hidden="true">{Array.from({ length: cellCount }, (_, index) => {
    const sequence = (index * 173) % cellCount
    const style = {
      '--pixel-base': 0.025 + ((index * 17) % 5) / 100,
      '--pixel-opacity': 0.11 + ((index * 29) % 16) / 100,
    } as CSSProperties
    return <i className={sequence < activeCount ? 'active' : ''} style={style} key={index} />
  })}</span>
}

export default function UploadDemoOverlay({ onClose, files = demoFiles, onComplete, autoCloseOnComplete = false }: Props) {
  const initialProgress = useRef(createInitialProgress(files))
  const [fileProgress, setFileProgress] = useState(() => initialProgress.current)
  const [isPaused, setIsPaused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMosaicVisible, setIsMosaicVisible] = useState(true)
  const completionTimer = useRef<number | null>(null)
  const completionHandled = useRef(false)
  const weights = useMemo(() => files.map((file) => file.weight ?? weightFromSize(file.size)), [files])
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1
  const isComplete = fileProgress.every((value) => value >= 100)
  const weightedProgress = fileProgress.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight
  const displayProgress = isComplete ? 100 : Math.min(99, Math.floor(weightedProgress))

  useEffect(() => {
    if (isPaused || isComplete) return
    let frame = 0
    let previousTime = performance.now()
    const advance = (time: number) => {
      const elapsed = Math.min(50, time - previousTime)
      previousTime = time
      setFileProgress((current) => current.map((value) => Math.min(100, value + elapsed / 333.333)))
      frame = window.requestAnimationFrame(advance)
    }
    frame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(frame)
  }, [isComplete, isPaused])

  useEffect(() => {
    if (!isComplete) { setIsMosaicVisible(true); return }
    completionTimer.current = window.setTimeout(() => {
      setIsMosaicVisible(false)
      if (!completionHandled.current) {
        completionHandled.current = true
        onComplete?.()
        if (autoCloseOnComplete) onClose()
      }
    }, 1600)
    return () => { if (completionTimer.current !== null) window.clearTimeout(completionTimer.current) }
  }, [autoCloseOnComplete, isComplete, onClose, onComplete])

  return <div className="uploadDemoOverlay" role="dialog" aria-label="Upload progress" aria-modal="true"><div className="uploadDemoStage">
    <img className="uploadDemoIllustration" src="/assets/upload-processing-illustration.svg" alt="Files moving through an upload processor" />
    <section className={`uploadDemoController${isExpanded ? ' expanded' : ''}${isPaused ? ' paused' : ''}${isComplete ? ' complete' : ''}${isMosaicVisible ? ' mosaic' : ''}`} aria-live="polite">
      {!isExpanded && isMosaicVisible && <span className="uploadDemoProgressClip" style={{ width: `${weightedProgress}%` }}><MosaicField progress={weightedProgress} /></span>}
      <header className="uploadDemoHeader">
        <span className="uploadDemoTitle"><img src="/assets/upload-progress-title.svg" alt="" />{`Uploading ${files.length} ${files.length === 1 ? 'file' : 'files'}`}</span>
        <span className="uploadDemoPercent">{displayProgress}%</span>
        <span className="uploadDemoActions">
          <button type="button" aria-label={isComplete ? 'Upload complete' : isPaused ? 'Resume upload' : 'Pause upload'} onClick={() => { if (!isComplete) setIsPaused((paused) => !paused) }}><img src={isComplete ? '/assets/upload-check.svg' : isPaused ? '/assets/upload-play.svg' : '/assets/upload-pause.svg'} alt="" /></button>
          <button type="button" aria-label={isExpanded ? 'Hide upload details' : 'Show upload details'} aria-expanded={isExpanded} onClick={() => setIsExpanded((expanded) => !expanded)}><img className={isExpanded ? 'expanded' : ''} src="/assets/upload-chevron.svg" alt="" /></button>
          <img className="uploadDemoSeparator" src="/assets/upload-separator.svg" alt="" />
          <button type="button" aria-label="Close upload progress" onClick={onClose}><img src="/assets/upload-close.svg" alt="" /></button>
        </span>
      </header>
      {isExpanded ? <div className="uploadDemoDetails">{files.map((file, index) => <div className={`uploadDemoFileRow${fileProgress[index] >= 100 ? ' complete' : ''}`} key={`${file.name}-${index}`}>
        {isMosaicVisible && <span className="uploadDemoProgressClip" style={{ width: `${fileProgress[index]}%` }}><MosaicField progress={fileProgress[index]} /></span>}
        <span className="uploadDemoFileName"><img src={file.icon ?? '/assets/upload-file.svg'} alt="" /><TruncatedFilename name={file.name} /></span>
        <span className="uploadDemoFilePercent">{Math.round(fileProgress[index])}%</span><span className="uploadDemoFileSize">{file.size}</span>
      </div>)}</div> : <div className="uploadDemoProgressTrack"><span style={{ width: `${weightedProgress}%` }} /></div>}
    </section>
  </div></div>
}
