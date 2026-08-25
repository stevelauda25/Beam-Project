import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

export type UploadProgressFile = { name: string; size: string; icon?: string; bytes?: number; initialProgress?: number }
type Props = { onClose: () => void; files?: UploadProgressFile[]; onComplete?: () => Promise<boolean | void> | boolean | void; autoCloseOnComplete?: boolean }
type TransferState = 'uploading' | 'paused' | 'saving' | 'failed' | 'complete'

const demoFiles: UploadProgressFile[] = [
  { name: 'backup-prompt.md', size: '12,2 MB', initialProgress: 62, icon: '/assets/upload-file.svg' },
  { name: 'getting-started.md', size: '12 MB', initialProgress: 52, icon: '/assets/upload-file.svg' },
  { name: 'organize-thoughts-prompt-the-latest.md', size: '7,4 MB', initialProgress: 38, icon: '/assets/upload-file.svg' },
  { name: 'woman-proffesional.jpeg', size: '2,3 MB', initialProgress: 22, icon: '/assets/upload-image-file.svg' },
]

function bytesFromSize(size: string) {
  const value = Number.parseFloat(size.replace(',', '.')) || 1
  if (/GB/i.test(size)) return value * 1024 ** 3
  if (/MB/i.test(size)) return value * 1024 ** 2
  if (/KB/i.test(size)) return value * 1024
  return value
}

function TruncatedFilename({ name }: { name: string }) {
  const dot = name.lastIndexOf('.')
  const hasExtension = dot > 0 && dot < name.length - 1
  return <span className="uploadDemoTruncatedName" title={name}><span>{hasExtension ? name.slice(0, dot) : name}</span>{hasExtension && <span>{name.slice(dot)}</span>}</span>
}

const cellCount = 13 * 27
function MosaicField({ progress }: { progress: number }) {
  const activeCount = Math.round((progress / 100) * cellCount)
  return <span className="uploadDemoMosaic" aria-hidden="true">{Array.from({ length: cellCount }, (_, index) => {
    const sequence = (index * 173) % cellCount
    const style = { '--pixel-base': 0.025 + ((index * 17) % 5) / 100, '--pixel-opacity': 0.11 + ((index * 29) % 16) / 100 } as CSSProperties
    return <i className={sequence < activeCount ? 'active' : ''} style={style} key={index} />
  })}</span>
}

export default function UploadDemoOverlay({ onClose, files = demoFiles, onComplete, autoCloseOnComplete = false }: Props) {
  const fileBytes = useMemo(() => files.map((file) => Math.max(1, file.bytes ?? bytesFromSize(file.size))), [files])
  const [uploadedBytes, setUploadedBytes] = useState(() => files.map((file, index) => fileBytes[index] * ((file.initialProgress ?? 0) / 100)))
  const [transferState, setTransferState] = useState<TransferState>('uploading')
  const [failureReason, setFailureReason] = useState<'offline' | 'quota' | 'storage' | null>(null)
  const [announcement, setAnnouncement] = useState('Upload started.')
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMosaicVisible, setIsMosaicVisible] = useState(true)
  const completionHandled = useRef(false)
  const pauseButtonRef = useRef<HTMLButtonElement>(null)
  const keepUploadingButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const totalBytes = fileBytes.reduce((sum, bytes) => sum + bytes, 0) || 1
  const transferredBytes = uploadedBytes.reduce((sum, bytes) => sum + bytes, 0)
  const hasTransferredAllBytes = uploadedBytes.every((bytes, index) => bytes >= fileBytes[index] * .99)
  const isComplete = transferState === 'complete'
  const overallProgress = isComplete ? 100 : Math.min(99, (transferredBytes / totalBytes) * 100)
  const fileProgress = uploadedBytes.map((bytes, index) => isComplete ? 100 : Math.min(99, (bytes / fileBytes[index]) * 100))

  useEffect(() => {
    const failOffline = () => { setFailureReason('offline'); setTransferState('failed'); setAnnouncement('Upload paused because you are offline.') }
    window.addEventListener('offline', failOffline)
    if (!navigator.onLine) failOffline()
    return () => window.removeEventListener('offline', failOffline)
  }, [])

  useEffect(() => {
    window.requestAnimationFrame(() => pauseButtonRef.current?.focus({ preventScroll: true }))
    return () => { const previousFocus = previousFocusRef.current; if (previousFocus?.isConnected) window.requestAnimationFrame(() => previousFocus.focus({ preventScroll: true })) }
  }, [])

  useEffect(() => {
    if (isCancelConfirmOpen) window.requestAnimationFrame(() => keepUploadingButtonRef.current?.focus({ preventScroll: true }))
  }, [isCancelConfirmOpen])

  useEffect(() => {
    if (transferState !== 'uploading' || hasTransferredAllBytes) return
    let frame = 0
    let previousTime = performance.now()
    const startedAt = previousTime
    const advance = (time: number) => {
      const elapsedSeconds = Math.min(.1, (time - previousTime) / 1000)
      previousTime = time
      const sharedBytesPerSecond = 4.5 * 1024 ** 2 * (.82 + .18 * Math.sin((time - startedAt) / 850))
      setUploadedBytes((current) => {
        const active = current.map((bytes, index) => bytes < fileBytes[index] * .99)
        const activeCount = active.filter(Boolean).length || 1
        return current.map((bytes, index) => active[index] ? Math.min(fileBytes[index] * .99, bytes + sharedBytesPerSecond * elapsedSeconds / activeCount) : bytes)
      })
      frame = window.requestAnimationFrame(advance)
    }
    frame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(frame)
  }, [fileBytes, hasTransferredAllBytes, transferState])

  useEffect(() => {
    if (!hasTransferredAllBytes || completionHandled.current || transferState !== 'uploading') return
    completionHandled.current = true
    setTransferState('saving')
    void Promise.resolve(onComplete?.()).then((saved) => {
      if (saved === false) throw new Error('Storage did not confirm the upload.')
      setUploadedBytes(fileBytes)
      setTransferState('complete')
      setAnnouncement(`Upload complete. ${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded.`)
      window.setTimeout(() => { setIsMosaicVisible(false); if (autoCloseOnComplete) onClose() }, 900)
    }).catch((error: unknown) => {
      const isQuotaFailure = error instanceof DOMException && error.name === 'QuotaExceededError'
      setFailureReason(!navigator.onLine ? 'offline' : isQuotaFailure ? 'quota' : 'storage')
      setTransferState('failed')
      setAnnouncement(isQuotaFailure ? 'Upload failed because storage is full.' : !navigator.onLine ? 'Upload paused because you are offline.' : 'Upload failed.')
    })
  }, [autoCloseOnComplete, fileBytes, hasTransferredAllBytes, onClose, onComplete, transferState])

  const togglePause = () => setTransferState((state) => {
    if (state === 'paused') { setAnnouncement('Upload resumed.'); return 'uploading' }
    if (state === 'uploading') { setAnnouncement('Upload paused.'); return 'paused' }
    return state
  })
  const retry = () => {
    if (!navigator.onLine) { setFailureReason('offline'); return }
    completionHandled.current = false
    setFailureReason(null)
    setTransferState('uploading')
    setAnnouncement('Upload resumed.')
  }
  const requestClose = () => {
    if (isComplete || transferState === 'failed') onClose()
    else setIsCancelConfirmOpen(true)
  }
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (isCancelConfirmOpen) setIsCancelConfirmOpen(false)
      else requestClose()
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [isCancelConfirmOpen, isComplete, transferState])
  const statusLabel = transferState === 'failed' ? failureReason === 'offline' ? 'Offline' : failureReason === 'quota' ? 'Storage full' : 'Failed' : transferState === 'saving' ? 'Saving' : transferState === 'paused' ? 'Paused' : `${Math.floor(overallProgress)}%`

  return <div className="uploadDemoOverlay" role="dialog" aria-label="Upload progress" aria-modal="true"><div className="uploadDemoStage">
    <img className="uploadDemoIllustration uploadDemoIllustrationLight" src="/assets/upload-processing-illustration.svg" alt="Files moving through an upload processor" />
    <img className="uploadDemoIllustration uploadDemoIllustrationDark" src="/assets/upload-illustration-dark.svg" alt="" aria-hidden="true" />
    <section className={`uploadDemoController${isExpanded ? ' expanded' : ''}${transferState === 'paused' ? ' paused' : ''}${isComplete ? ' complete' : ''}${isMosaicVisible ? ' mosaic' : ''}`} aria-busy={transferState === 'saving'}>
      <span className="srOnly" role="progressbar" aria-label={`Uploading ${files.length} ${files.length === 1 ? 'file' : 'files'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(overallProgress)} />
      <span className="srOnly" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      {!isExpanded && isMosaicVisible && <span className="uploadDemoProgressClip" style={{ width: `${overallProgress}%` }}><MosaicField progress={overallProgress} /></span>}
      <header className="uploadDemoHeader">
        <span className="uploadDemoTitle"><img src="/assets/upload-progress-title.svg" alt="" />{transferState === 'failed' && failureReason === 'offline' ? 'Upload paused — offline' : isComplete ? `Uploaded ${files.length} ${files.length === 1 ? 'file' : 'files'}` : `Uploading ${files.length} ${files.length === 1 ? 'file' : 'files'}`}</span>
        <span className="uploadDemoPercent">{statusLabel}</span>
        <span className="uploadDemoActions">
          {isComplete ? <span className="uploadCompleteStatus" role="status" aria-label="Upload complete"><img src="/assets/upload-check.svg" alt="" /></span> : <button ref={pauseButtonRef} type="button" aria-label={transferState === 'failed' ? 'Retry upload' : transferState === 'paused' ? 'Resume upload' : 'Pause upload'} onClick={transferState === 'failed' ? retry : togglePause}><img src={transferState === 'paused' ? '/assets/upload-play.svg' : '/assets/upload-pause.svg'} alt="" /></button>}
          <button type="button" aria-label={isExpanded ? 'Hide upload details' : 'Show upload details'} aria-expanded={isExpanded} onClick={() => setIsExpanded((expanded) => !expanded)}><img className={isExpanded ? 'expanded' : ''} src="/assets/upload-chevron.svg" alt="" /></button>
          <img className="uploadDemoSeparator" src="/assets/upload-separator.svg" alt="" />
          <button type="button" aria-label={isComplete ? 'Close upload progress' : 'Cancel upload'} onClick={requestClose}><img src="/assets/upload-close.svg" alt="" /></button>
        </span>
      </header>
      {isExpanded ? <div className="uploadDemoDetails">{files.map((file, index) => <div className={`uploadDemoFileRow${fileProgress[index] >= 100 ? ' complete' : ''}`} key={`${file.name}-${index}`}>
        {isMosaicVisible && <span className="uploadDemoProgressClip" style={{ width: `${fileProgress[index]}%` }}><MosaicField progress={fileProgress[index]} /></span>}
        <span className="uploadDemoFileName"><img src={file.icon ?? '/assets/upload-file.svg'} alt="" /><TruncatedFilename name={file.name} /></span>
        <span className="uploadDemoFilePercent">{transferState === 'failed' ? failureReason === 'offline' ? 'Offline' : 'Failed' : transferState === 'saving' && fileProgress[index] >= 99 ? 'Saving' : `${Math.floor(fileProgress[index])}%`}</span><span className="uploadDemoFileSize">{file.size}</span>
      </div>)}</div> : <div className="uploadDemoProgressTrack"><span style={{ width: `${overallProgress}%` }} /></div>}
    </section>
    {isCancelConfirmOpen && <div className="newFolderBackdrop uploadCancelBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCancelConfirmOpen(false) }}><section className="deleteItemModal uploadCancelModal" role="dialog" aria-modal="true" aria-labelledby="cancel-upload-title"><header><div><h2 id="cancel-upload-title">Cancel upload?</h2></div><button type="button" aria-label="Close cancellation confirmation" onClick={() => setIsCancelConfirmOpen(false)}><img src="/assets/preview-close.svg" alt="" /></button></header><div className="deleteItemContent"><p>{files.length === 1 ? `${files[0].name} has not finished uploading.` : `${files.length} files have not finished uploading.`} Cancelling will remove the active upload queue.</p><footer><button ref={keepUploadingButtonRef} type="button" onClick={() => setIsCancelConfirmOpen(false)}>Keep uploading</button><button className="deleteItemConfirm" type="button" onClick={onClose}>Cancel upload</button></footer></div></section></div>}
  </div></div>
}
