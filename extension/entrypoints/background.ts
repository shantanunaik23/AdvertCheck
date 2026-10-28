// Background script: a service worker in Chrome and Edge, an event page in
// Firefox. Listeners are registered synchronously at the top level so the
// browser can wake the worker for them; state lives in storage, not globals.

import { Recorder } from '../src/recorder';
import { bodyFor } from '../src/requestBody';
import { addEvents, deleteBefore } from '../src/store/db';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '../src/store/settings';
import { tabsItem } from '../src/store/tabs';
import type { AdEvent } from '../src/types';

const PURGE_ALARM = 'purge';
const FLUSH_MS = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export default defineBackground(() => {
  let settings: Settings = DEFAULT_SETTINGS;
  let queue: AdEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let saveTabsTimer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    flushTimer = undefined;
    const batch = queue;
    queue = [];
    await addEvents(batch);
  };

  const recorder = new Recorder({
    now: () => Date.now(),
    settings: () => settings,
    record: (events) => {
      queue.push(...events);
      flushTimer ??= setTimeout(() => void flush(), FLUSH_MS);
    },
    onCompanies: (tabId, count) => {
      void browser.action.setBadgeText({ tabId, text: count ? String(count) : '' }).catch(() => undefined);
    },
    onTabsChanged: (tabs) => {
      clearTimeout(saveTabsTimer);
      saveTabsTimer = setTimeout(() => void tabsItem.setValue(tabs), 500);
    },
  });

  // Requests that arrive while state loads wait for it, so nothing is lost.
  const ready = Promise.all([settingsItem.getValue(), tabsItem.getValue()]).then(([s, tabs]) => {
    settings = s;
    recorder.restore(tabs);
  });
  settingsItem.watch((s) => {
    settings = s;
  });

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      const info = details as typeof details & { initiator?: string; documentUrl?: string };
      const body = bodyFor(details.url, details.requestBody);
      void ready.then(() => {
        recorder.handle(
          details.tabId,
          { url: details.url, type: details.type, ...(body !== undefined && { body }) },
          info.documentUrl ?? info.initiator,
        );
      });
      return undefined;
    },
    { urls: ['<all_urls>'] },
    ['requestBody'],
  );

  browser.tabs.onRemoved.addListener((tabId) => {
    void ready.then(() => {
      recorder.forget(tabId);
    });
  });

  const purge = async () => {
    const { retentionDays } = await settingsItem.getValue();
    await deleteBefore(Date.now() - retentionDays * DAY_MS);
  };
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === PURGE_ALARM) void purge();
  });
  void browser.alarms.get(PURGE_ALARM).then((existing) => {
    if (!existing) void browser.alarms.create(PURGE_ALARM, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
  });

  void browser.action.setBadgeBackgroundColor({ color: '#0b57d0' });

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });
});
