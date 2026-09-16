"use client";

// IndexedDB-backed queue for meter readings captured with no signal. A
// reading isn't "done" until its photo is uploaded and /api/readings has
// accepted it — without this, a network drop between "Save & next" and
// either of those just failed the whole capture, on a site visit Wayne
// isn't going to repeat. Queuing here (with the photo as a Blob) means the
// round continues; offlineSync.ts drains the queue once a connection exists.
//
// Same subscribe/snapshot shape as installPromptStore.ts, but the state
// lives in IndexedDB rather than a module variable, so mutations are async
// and `cachedCount` is a synchronous mirror kept in sync for
// useSyncExternalStore.

import type { Service } from "@/lib/types";

export interface QueuedReading {
  id: string;
  propertyId: string;
  meterId: string;
  meterLabel: string;
  unitNumber: string | null;
  service: Service;
  rawValue: string;
  notes: string | null;
  /** When the reading was actually taken, not when it eventually syncs. */
  capturedAt: string;
  photo: Blob;
  photoName: string;
  queuedAt: string;
}

const DB_NAME = "meter-readings-offline";
const STORE = "pending_readings";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

let cachedCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function refreshCount(): Promise<void> {
  cachedCount = (await withStore("readonly", (store) => store.count())) as number;
  notify();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCountSnapshot(): number {
  return cachedCount;
}

export function getCountServerSnapshot(): number {
  return 0;
}

if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
  refreshCount().catch(() => {
    // IndexedDB unavailable (private mode, disabled storage) — offline
    // capture just won't be available; the online path is untouched.
  });
}

export async function queueReading(entry: Omit<QueuedReading, "id" | "queuedAt">): Promise<void> {
  const record: QueuedReading = {
    ...entry,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.add(record));
  await refreshCount();
}

export async function listQueuedReadings(): Promise<QueuedReading[]> {
  const items = (await withStore("readonly", (store) => store.getAll())) as QueuedReading[];
  return items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function removeQueuedReading(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
  await refreshCount();
}
