// What a website told an ad company the user did, in one shared vocabulary.
export type Action =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'checkout'
  | 'purchase'
  | 'sign_up'
  | 'lead'
  | 'search'
  | 'subscribe'
  | 'conversion'
  | 'other';

export type Category = 'ad' | 'analytics' | 'social' | 'interaction';

interface Base {
  /** Milliseconds since the epoch. */
  ts: number;
  /** Registrable domain of the page the user was on, e.g. "shop.example". */
  site: string;
}

/** An ad or tracking company was contacted while the user was on `site`. */
export interface TrackerEvent extends Base {
  kind: 'tracker';
  companyId: string;
  category: Category;
}

/** `site` sent an ad company a message about something the user did. */
export interface ReportedEvent extends Base {
  kind: 'reported';
  companyId: string;
  platform: string;
  action: Action;
  /** The platform's own name for the event, e.g. "AddToCart". */
  eventName: string;
  /** Product or content name, only if the site sent it. */
  item?: string;
  itemCategory?: string;
  searchTerm?: string;
  /** The site also sent hashed contact details (email or phone). The hash is never kept. */
  identityShared: boolean;
}

/** The user reached `site` from an ad or a tracked link. */
export interface AdClickEvent extends Base {
  kind: 'ad_click';
  companyId: string;
  platform: string;
  /** False when the parameter is also added to ordinary links (e.g. fbclid). */
  certain: boolean;
}

/** The user searched on `site`. */
export interface SearchEvent extends Base {
  kind: 'search';
  engine: string;
  /** Omitted when the user has turned off recording search words. */
  query?: string;
}

export type AdEvent = TrackerEvent | ReportedEvent | AdClickEvent | SearchEvent;

/** A network request, reduced to what the classifiers need. */
export interface RequestInfo {
  url: string;
  /** webRequest resource type, e.g. "main_frame", "script", "ping". */
  type: string;
  /** Decoded request body, only for known tracking endpoints. */
  body?: string;
}
