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
}

export const DEFAULT_SETTINGS: Settings = {
  paused: false,
  recordSearchWords: true,
  retentionDays: 30,
  excludedSites: [],
};

export const RETENTION_CHOICES = [7, 30, 90, 365] as const;

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});
