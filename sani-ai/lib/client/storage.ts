'use client';
// Minimal IndexedDB wrapper. Everything stays on the user's device.
const DB = 'sani-ai';
const STORES = ['chats', 'pages', 'kv'] as const;
type Store = (typeof STORES)[number];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function run<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const listItems = <T,>(s: Store) => run<T[]>(s, 'readonly', (o) => o.getAll() as IDBRequest<T[]>);
export const putItem = (s: Store, v: { id: string }) => run(s, 'readwrite', (o) => o.put(v));
export const deleteItem = (s: Store, id: string) => run(s, 'readwrite', (o) => o.delete(id));
export const clearStore = (s: Store) => run(s, 'readwrite', (o) => o.clear());
export const getItem = <T,>(s: Store, id: string) => run<T | undefined>(s, 'readonly', (o) => o.get(id) as IDBRequest<T | undefined>);
