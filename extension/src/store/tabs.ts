import { storage } from '#imports';
import type { PageState } from '../recorder';

/** Per-tab page state, kept in session storage so it survives worker restarts. */
export const tabsItem = storage.defineItem<Record<number, PageState>>('session:tabs', { fallback: {} });
