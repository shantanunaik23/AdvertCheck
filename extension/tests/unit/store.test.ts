import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEvents, deleteAll, deleteBefore, eventsSince, resetConnection } from '../../src/store/db';
import { bodyFor } from '../../src/requestBody';
import type { AdEvent } from '../../src/types';

const ev = (ts: number, site = 'shop.example'): AdEvent => ({
  kind: 'tracker',
  ts,
  site,
  companyId: 'meta',
  category: 'ad',
});

describe('event store', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetConnection();
  });

  it('adds events and reads them back oldest first', async () => {
    await addEvents([ev(30), ev(10), ev(20)]);
    expect((await eventsSince(0)).map((e) => e.ts)).toEqual([10, 20, 30]);
    expect((await eventsSince(20)).map((e) => e.ts)).toEqual([20, 30]);
  });

  it('deletes events older than the retention cut-off', async () => {
    await addEvents([ev(1), ev(2), ev(3)]);
    expect(await deleteBefore(3)).toBe(2);
    expect((await eventsSince(0)).map((e) => e.ts)).toEqual([3]);
  });

  it('deletes everything', async () => {
    await addEvents([ev(1), ev(2)]);
    await deleteAll();
    expect(await eventsSince(0)).toEqual([]);
  });
});

describe('request bodies', () => {
  const raw = (s: string) => ({ raw: [{ bytes: new TextEncoder().encode(s).buffer }] });

  it('decodes bodies only for known tracking endpoints', () => {
    expect(bodyFor('https://analytics.tiktok.com/api/v2/pixel', raw('{"event":"Lead"}'))).toBe('{"event":"Lead"}');
    expect(bodyFor('https://bank.example/login', raw('password=secret'))).toBeUndefined();
  });

  it('turns form data into a query string', () => {
    expect(bodyFor('https://tr.snapchat.com/p', { formData: { ev: ['PURCHASE'], pid: ['1'] } })).toBe(
      'ev=PURCHASE&pid=1',
    );
  });
});
