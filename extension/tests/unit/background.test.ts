import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '../../entrypoints/background';
import { DEFAULT_SETTINGS, settingsItem } from '../../src/store/settings';

describe('background', () => {
  let registered: string[];

  beforeEach(() => {
    fakeBrowser.reset();
    registered = [];
    // The fake browser has no webRequest or scripting; request handling is
    // tested in recorder.test.ts, and the feed registration is tested here.
    vi.spyOn(fakeBrowser.webRequest.onBeforeRequest, 'addListener').mockImplementation(() => undefined);
    /* eslint-disable @typescript-eslint/no-misused-promises -- these APIs are typed with a
       callback overload, but the extension uses (and the mocks return) promises. */
    vi.spyOn(fakeBrowser.scripting, 'getRegisteredContentScripts').mockImplementation(() =>
      Promise.resolve(registered.map((id) => ({ id }))),
    );
    vi.spyOn(fakeBrowser.scripting, 'registerContentScripts').mockImplementation((scripts) => {
      registered.push(...scripts.map((s) => s.id));
      return Promise.resolve();
    });
    vi.spyOn(fakeBrowser.scripting, 'unregisterContentScripts').mockImplementation(() => {
      registered = [];
      return Promise.resolve();
    });
    /* eslint-enable @typescript-eslint/no-misused-promises */
    background.main();
  });

  it('opens the welcome page on first install', async () => {
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
    expect(create).toHaveBeenCalledWith({ url: fakeBrowser.runtime.getURL('/welcome.html') });
  });

  it('does not open it again on update', async () => {
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '0.0.1' });
    expect(create).not.toHaveBeenCalled();
  });

  it('puts the on-page feed script in pages only while alerts are switched on', async () => {
    await vi.waitFor(() => {
      expect(fakeBrowser.scripting.getRegisteredContentScripts).toHaveBeenCalled();
    });
    expect(registered).toEqual([]);

    await settingsItem.setValue({ ...DEFAULT_SETTINGS, showAlerts: true });
    await vi.waitFor(() => {
      expect(registered).toEqual(['feed']);
    });
    expect(fakeBrowser.scripting.registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'feed', js: ['feed.js'], matches: ['<all_urls>'] }),
    ]);

    await settingsItem.setValue({ ...DEFAULT_SETTINGS, showAlerts: false });
    await vi.waitFor(() => {
      expect(registered).toEqual([]);
    });
  });
});
