import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '../../entrypoints/background';

describe('background', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    // The fake browser has no webRequest; request handling is tested in recorder.test.ts.
    vi.spyOn(fakeBrowser.webRequest.onBeforeRequest, 'addListener').mockImplementation(() => undefined);
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
});
