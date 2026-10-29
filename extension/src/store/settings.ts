import { storage } from '#imports';

export interface Settings {
  /** Stop recording without deleting anything. */
  paused: boolean;
  /** Keep the words of searches. When off, only "searched on Google" is kept. */
  recordSearchWords: boolean;
  /** Records older than this are deleted. */
  retentionDays: number;
  /** Sites (registrable domains) the user does not want recorded. */
  excludedSites: string[];
  /** Show the detailed views. Off by default: the simple view is for everyone. */
  advanced: boolean;
  /** Show a feed of alerts on web pages (ADR 0005). Off by default. */
  showAlerts: boolean;
  /** Add a "Sleep on it" nudge to basket and checkout alerts. Off by default. */
  sleepOnIt: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  paused: false,
  recordSearchWords: true,
  retentionDays: 30,
  excludedSites: [],
  advanced: false,
  showAlerts: false,
  sleepOnIt: false,
};

export const RETENTION_CHOICES = [7, 30, 90, 365] as const;

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 4,
  migrations: {
    // Version 2 added the simple view; existing users start in it too.
    2: (old: Omit<Settings, 'advanced' | 'showAlerts'>) => ({ ...old, advanced: false }),
    // Version 3 added the optional on-page alert feed, off until chosen.
    3: (old: Omit<Settings, 'showAlerts' | 'sleepOnIt'>) => ({ ...old, showAlerts: false }),
    // Version 4 added the optional "Sleep on it" nudge.
    4: (old: Omit<Settings, 'sleepOnIt'>): Settings => ({ ...old, sleepOnIt: false }),
  },
});
