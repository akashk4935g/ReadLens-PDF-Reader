export type AnnotationType = 'normal' | 'important' | 'definition' | 'question' | 'confusing' | 'idea';
export type HighlightRect = { x: number; y: number; width: number; height: number };
export type Annotation = { id: string; documentId: string; pageNumber: number; selectedText: string; type: AnnotationType; comment: string; rects?: HighlightRect[]; createdAt: number; updatedAt: number };
export type ReadDocument = { id: string; title: string; fileName: string; mimeType: string; size: number; pageCount: number; pdfBytes: ArrayBuffer; pageTexts: string[]; currentPage: number; createdAt: number; updatedAt: number; lastOpenedAt: number };

const DB_NAME = 'readlens-local-library';
const DB_VERSION = 1;
let opening: Promise<IDBDatabase> | null = null;
function db() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support local document storage.'));
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('documents')) database.createObjectStore('documents', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('annotations')) {
        const annotations = database.createObjectStore('annotations', { keyPath: 'id' });
        annotations.createIndex('documentId', 'documentId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
  });
  return opening;
}
function request<T>(store: string, mode: IDBTransactionMode, operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(database => new Promise((resolve, reject) => {
    const tx = database.transaction(store, mode);
    const req = operation(tx.objectStore(store));
    let result = undefined as unknown as T;
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => reject(req.error || new Error('Local storage request failed.'));
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error || new Error('Could not save to local storage. Check available space.'));
    tx.onerror = () => reject(tx.error || new Error('Local storage transaction failed.'));
  }));
}
export const getDocuments = () => request<ReadDocument[]>('documents', 'readonly', s => s.getAll()).then(rows => rows.sort((a,b) => b.lastOpenedAt-a.lastOpenedAt));
export const getDocument = (id: string) => request<ReadDocument | undefined>('documents', 'readonly', s => s.get(id));
export const saveDocument = (doc: ReadDocument) => request<IDBValidKey>('documents', 'readwrite', s => s.put(doc));
export const removeDocument = async (id: string) => {
  const database = await db();
  await new Promise<void>((resolve,reject) => {
    const tx = database.transaction(['documents','annotations'], 'readwrite');
    tx.objectStore('documents').delete(id);
    const idx = tx.objectStore('annotations').index('documentId');
    const cursor = idx.openKeyCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => { const c = cursor.result; if (c) { tx.objectStore('annotations').delete(c.primaryKey); c.continue(); } };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
export const getAnnotations = () => request<Annotation[]>('annotations', 'readonly', s => s.getAll()).then(rows => rows.sort((a,b) => b.updatedAt-a.updatedAt));
export const saveAnnotation = (item: Annotation) => request<IDBValidKey>('annotations', 'readwrite', s => s.put(item));
export const removeAnnotation = (id: string) => request<undefined>('annotations', 'readwrite', s => s.delete(id));
export async function clearLibrary() {
  const database = await db();
  await new Promise<void>((resolve,reject) => {
    const tx = database.transaction(['documents','annotations'], 'readwrite');
    tx.objectStore('documents').clear(); tx.objectStore('annotations').clear();
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
export async function estimateUsage() {
  const docs = await getDocuments();
  return { count: docs.length, bytes: docs.reduce((n,d) => n+d.size,0) };
}
export const refreshLibrary = () => window.dispatchEvent(new Event('readlens-library-change'));
export const prettyBytes = (bytes: number) => bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;
