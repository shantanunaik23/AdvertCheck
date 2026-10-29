// Parameters ad platforms add to the address of the page an ad leads to.
// Sources: each platform's own documentation on auto-tagging and click IDs.

export interface ClickId {
  param: string;
  platform: string;
  companyId: string;
  /** False when the platform also adds it to ordinary (non-ad) links. */
  certain: boolean;
}

const CLICK_IDS: ClickId[] = [
  { param: 'gclid', platform: 'Google Ads', companyId: 'google', certain: true },
  { param: 'gbraid', platform: 'Google Ads', companyId: 'google', certain: true },
  { param: 'wbraid', platform: 'Google Ads', companyId: 'google', certain: true },
  { param: 'dclid', platform: 'Google Display & Video', companyId: 'google', certain: true },
  { param: 'msclkid', platform: 'Microsoft Advertising', companyId: 'microsoft', certain: true },
  { param: 'ttclid', platform: 'TikTok Ads', companyId: 'bytedance_inc', certain: true },
  { param: 'twclid', platform: 'X Ads', companyId: 'twitter', certain: true },
  { param: 'li_fat_id', platform: 'LinkedIn Ads', companyId: 'linkedin', certain: true },
  { param: 'ScCid', platform: 'Snapchat Ads', companyId: 'snap_technologies', certain: true },
  { param: 'rdt_cid', platform: 'Reddit Ads', companyId: 'reddit', certain: true },
  // Added to every outbound link from these apps, ads included.
  { param: 'fbclid', platform: 'Facebook or Instagram', companyId: 'meta', certain: false },
  { param: 'epik', platform: 'Pinterest', companyId: 'pinterest', certain: false },
];

/** The click ID in a page address, if any. Ad-only IDs win over link IDs. */
export function findClickId(url: string): ClickId | null {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return null;
  }
  return CLICK_IDS.find((c) => params.get(c.param)) ?? null;
}
