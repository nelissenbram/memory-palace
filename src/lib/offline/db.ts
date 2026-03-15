/**
 * IndexedDB helpers for offline memory queue and cached memories.
 * Uses raw IndexedDB API to avoid adding dependencies.
 */

const DB_NAME = "memory-palace-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "offline-queue";
const CACHE_STORE = "memory-cache";

export interface QueuedMemory {
  /** Auto-incremented key */
  queueId?: number;
  /** Temp client-side ID */
  clientId: string;
  roomId: string;
  title: string;
  description: string;
  type: string;
  hue: number;
  saturation: number;
  lightness: number;
  /** Data URL or external URL */
  fileData: string | null;
  createdAt: string;
}

export interface CachedMemory {
  /** Supabase memory ID */
  id: string;
  roomId: string;
  title: string;
  description: string;
  type: string;
  hue: number;
  saturation: number;
  lightness: number;
  fileUrl: string | null;
  cachedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "queueId", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const store = db.createObjectStore(CACHE_STORE, { keyPath: "id" });
        store.createIndex("roomId", "roomId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Offline Queue ──

export async function enqueueMemory(mem: Omit<QueuedMemory, "queueId">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add(mem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedMemories(): Promise<QueuedMemory[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedMemory(queueId: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(queueId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Memory Cache (for offline viewing) ──

export async function cacheMemories(roomId: string, memories: CachedMemory[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readwrite");
    const store = tx.objectStore(CACHE_STORE);
    for (const mem of memories) {
      store.put({ ...mem, roomId, cachedAt: Date.now() });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMemories(roomId: string): Promise<CachedMemory[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const idx = tx.objectStore(CACHE_STORE).index("roomId");
    const req = idx.getAll(roomId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
