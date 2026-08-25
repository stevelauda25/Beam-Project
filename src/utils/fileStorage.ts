export type StoredFile = {
  id: string
  workspaceId: string
  folderName: string
  name: string
  type: string
  size: number
  lastModified: number
  blob: Blob
}

const DATABASE_NAME = 'beam-file-storage'
const STORE_NAME = 'files'

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('File storage is unavailable.'))
})

export const createStorageId = (workspaceId: string, folderName: string) =>
  `${workspaceId}:${folderName}:${crypto.randomUUID()}`

export async function storeFile(record: StoredFile, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('The upload was cancelled.', 'AbortError')
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const abort = () => { try { transaction.abort() } catch { /* The transaction already completed. */ } }
    const cleanup = () => signal?.removeEventListener('abort', abort)
    signal?.addEventListener('abort', abort, { once: true })
    transaction.objectStore(STORE_NAME).put(record)
    transaction.oncomplete = () => { cleanup(); resolve() }
    transaction.onerror = () => { cleanup(); reject(transaction.error ?? new Error('The upload could not be saved.')) }
    transaction.onabort = () => { cleanup(); reject(transaction.error ?? new DOMException('The upload was cancelled.', 'AbortError')) }
  })
  database.close()
}

export async function getStoredFile(id: string) {
  const database = await openDatabase()
  const result = await new Promise<StoredFile | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result as StoredFile | undefined)
    request.onerror = () => reject(request.error ?? new Error('The file could not be read.'))
  })
  database.close()
  return result
}

export async function deleteStoredFile(id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('The file could not be deleted.'))
  })
  database.close()
}
