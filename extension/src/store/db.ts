import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AdEvent } from '../types';

export type StoredEvent = AdEvent & { id: number };

interface Schema extends DBSchema {
  events: {
    key: number;
    value: AdEvent & { id?: number };
    indexes: { ts: number };
  };
}

const DB_NAME = 'they-spy';
const DB_VERSION = 1;

let db: Promise<IDBPDatabase<Schema>> | undefined;

function open(): Promise<IDBPDatabase<Schema>> {
  db ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const events = database.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
      events.createIndex('ts', 'ts');
    },
  });
  return db;
}

export async function addEvents(events: AdEvent[]): Promise<void> {
  if (!events.length) return;
  const tx = (await open()).transaction('events', 'readwrite');
  await Promise.all([...events.map((e) => tx.store.add(e)), tx.done]);
}

/** Events at or after `since`, oldest first. */
export async function eventsSince(since: number): Promise<StoredEvent[]> {
  return (await open()).getAllFromIndex('events', 'ts', IDBKeyRange.lowerBound(since)) as Promise<StoredEvent[]>;
}

/** Deletes events before `before`; returns how many were deleted. */
export async function deleteBefore(before: number): Promise<number> {
  const tx = (await open()).transaction('events', 'readwrite');
  let deleted = 0;
  let cursor = await tx.store.index('ts').openCursor(IDBKeyRange.upperBound(before, true));
  while (cursor) {
    await cursor.delete();
    deleted++;
    cursor = await cursor.continue();
  }
  await tx.done;
  return deleted;
}

export async function deleteAll(): Promise<void> {
  await (await open()).clear('events');
}

/** For tests: forget the open connection so a fresh database can be used. */
export function resetConnection(): void {
  db = undefined;
}
