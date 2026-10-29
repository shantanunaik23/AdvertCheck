// Background script: a service worker in Chrome and Edge, an event page in
// Firefox. Listeners are registered synchronously at the top level so the
// browser can wake the worker for them; state lives in storage, not globals.

import {
  applyToFeed,
  followedNote,
  type FeedItem,
  type FeedMessage,
  type FeedPayload,
  type Highlight,
} from '../src/feed';
import { findFollowed, LOOKBACK_MS } from '../src/insights/followed';
import { Recorder } from '../src/recorder';
import { bodyFor } from '../src/requestBody';
import { addEvents, deleteBefore, eventsSince } from '../src/store/db';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '../src/store/settings';
import { tabsItem } from '../src/store/tabs';
import type { AdEvent } from '../src/types';

const PURGE_ALARM = 'purge';
const FLUSH_MS = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FEED_SCRIPT = 'feed';

/** Registers the on-page feed only while the user has it switched on (ADR 0005). */
async function syncFeedScript(on: boolean): Promise<void> {
  const registered = await browser.scripting.getRegisteredContentScripts({ ids: [FEED_SCRIPT] });
  if (on && !registered.length) {
    await browser.scripting.registerContentScripts([
      {
        id: FEED_SCRIPT,
        js: ['feed.js'],
        matches: ['<all_urls>'],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
  } else if (!on && registered.length) {
    await browser.scripting.unregisterContentScripts({ ids: [FEED_SCRIPT] });
  }
}

export default defineBackground(() => {
  let settings: Settings = DEFAULT_SETTINGS;
  let queue: AdEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let saveTabsTimer: ReturnType<typeof setTimeout> | undefined;
  // The feed for each tab's current page, kept in memory only.
  const feeds = new Map<number, { items: FeedItem[]; notes: Highlight[] }>();
  const payload = (tabId: number): FeedPayload => ({
    items: feeds.get(tabId)?.items ?? [],
    notes: feeds.get(tabId)?.notes ?? [],
    sleepOnIt: settings.sleepOnIt,
  });
  const sendFeed = (tabId: number) => {
    if (!settings.showAlerts) return;
    const message: FeedMessage = { type: 'they-spy/feed', feed: payload(tabId) };
    // Fails harmlessly when the page has no feed script (yet).
    void browser.tabs.sendMessage(tabId, message).catch(() => undefined);
  };

  // An ad click may have followed the user from an earlier visit (retargeting).
  const checkFollowed = async (tabId: number, events: AdEvent[]) => {
    for (const click of events) {
      if (click.kind !== 'ad_click') continue;
      const history = [...(await eventsSince(click.ts - LOOKBACK_MS)), ...queue];
      const followed = findFollowed(click, history);
      const feed = feeds.get(tabId);
      if (!followed || !feed) continue;
      feed.notes.push(followedNote(followed));
      sendFeed(tabId);
    }
  };

  const flush = async () => {
    flushTimer = undefined;
    const batch = queue;
    queue = [];
    await addEvents(batch);
  };

  const recorder = new Recorder({
    now: () => Date.now(),
    settings: () => settings,
    record: (events, tabId) => {
      queue.push(...events);
      flushTimer ??= setTimeout(() => void flush(), FLUSH_MS);
      const feed = feeds.get(tabId) ?? { items: [], notes: [] };
      feeds.set(tabId, { ...feed, items: applyToFeed(feed.items, events) });
      sendFeed(tabId);
      if (events.some((e) => e.kind === 'ad_click')) void checkFollowed(tabId, events);
    },
    onCompanies: (tabId, count) => {
      if (count === 0) feeds.delete(tabId);
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
    void syncFeedScript(s.showAlerts);
  });
  settingsItem.watch((s) => {
    settings = s;
    void syncFeedScript(s.showAlerts);
  });

  // The feed script asks for its page's alerts when it starts. Answer only
  // about the tab it runs in, and only to this extension's own scripts.
  browser.runtime.onMessage.addListener((message: FeedMessage, sender, sendResponse) => {
    if (message.type !== 'they-spy/feed-hello' || sender.id !== browser.runtime.id) return false;
    const tabId = sender.tab?.id;
    if (tabId === undefined || sender.frameId !== 0) return false;
    void ready.then(() => {
      sendResponse(settings.showAlerts ? payload(tabId) : null);
    });
    // Keep the channel open for the asynchronous answer (works in every browser).
    return true;
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
    feeds.delete(tabId);
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
