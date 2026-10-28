// Reads what any website can learn about a visitor without asking.
// Nothing here is stored or sent anywhere; it is only displayed.

const LEVELS = { low: 'Low', medium: 'Medium', high: 'High' };
export { LEVELS };

const NA = 'Not available';

function signal(group, label, value, level, why, technical) {
  return { group, label, value: value === undefined || value === null || value === '' ? NA : String(value), level, why, technical };
}

// Which browser family to give advice for. Brave hides itself in the user
// agent, but exposes navigator.brave.
export function browserFamily(ua, brands) {
  if (navigator.brave) return 'brave';
  const names = (brands || []).map((b) => b.brand).join(' ');
  if (/Edg\//.test(ua) || /Edge/.test(names)) return 'edge';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/OPR\//.test(ua) || /Opera/.test(names)) return 'opera';
  if (/Firefox\/|FxiOS/.test(ua)) return 'firefox';
  if (/CriOS/.test(ua)) return 'chrome';
  if (/Chrome\//.test(ua) || /Chrome/.test(names)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

function describeBrowser(ua, brands) {
  if (navigator.brave) return 'Brave';
  if (brands && brands.length) {
    const named = brands.find((b) => !/not.?a.?brand|chromium/i.test(b.brand)) || brands[0];
    return `${named.brand.replace(/^Google /, '')} ${named.version}`;
  }
  const rules = [
    [/Edg\/([\d]+)/, 'Edge'],
    [/OPR\/([\d]+)/, 'Opera'],
    [/SamsungBrowser\/([\d]+)/, 'Samsung Internet'],
    [/(?:Firefox|FxiOS)\/([\d]+)/, 'Firefox'],
    [/(?:Chrome|CriOS)\/([\d]+)/, 'Chrome'],
    [/Version\/([\d]+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Unknown browser';
}

// iPads report themselves as Macs, but Macs have no touch screen.
function describeOS(ua, platform) {
  if (/Mac OS X/.test(ua) && navigator.maxTouchPoints > 1) return 'iPadOS';
  if (platform) return platform;
  if (/iPhone|iPod/.test(ua)) return 'iOS';
  if (/iPad/.test(ua)) return 'iPadOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

// Client hints report Windows 11 as platform version 13 or above.
function osWithVersion(os, version) {
  if (!version) return os;
  if (os === 'Windows') {
    const major = Number(version.split('.')[0]);
    if (major >= 13) return 'Windows 11';
    if (major > 0) return 'Windows 10';
    return 'Windows';
  }
  return `${os} ${version.split('.').slice(0, 2).join('.')}`;
}

function media(query) {
  try { return window.matchMedia(query).matches; } catch { return false; }
}

function languageName(tag) {
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) || tag; } catch { return tag; }
}

// Short, stable hash. Uses SHA-256 where available (secure contexts),
// otherwise FNV-1a so the page still works over plain http in development.
export async function hash(text) {
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}

function canvasPrint() {
  try {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.textBaseline = 'top';
    ctx.font = '16px "Times New Roman", serif';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('They Spy, 1.0 \u{1F50D}', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('They Spy, 1.0 \u{1F50D}', 4, 17);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 30, 20, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL();
  } catch {
    return null;
  }
}

// Browsers that resist fingerprinting (Brave, Firefox with resist
// fingerprinting, Safari's advanced protection) add noise to canvas reads.
// Draw one solid colour and check it comes back exactly as drawn.
function canvasScrambled() {
  try {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.fillStyle = 'rgb(10, 20, 30)';
    ctx.fillRect(0, 0, 16, 16);
    const px = ctx.getImageData(0, 0, 16, 16).data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 10 || px[i + 1] !== 20 || px[i + 2] !== 30 || px[i + 3] !== 255) return true;
    }
    return false;
  } catch {
    // Reading the canvas was refused outright, which also protects the visitor.
    return true;
  }
}

function webglInfo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { vendor, renderer };
  } catch {
    return null;
  }
}

const FONT_CANDIDATES = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia',
  'Corbel', 'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Gill Sans', 'Helvetica',
  'Helvetica Neue', 'Impact', 'Lucida Console', 'Lucida Grande', 'Menlo', 'Monaco', 'Optima', 'Palatino',
  'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Avenir', 'Futura', 'Baskerville',
  'Didot', 'Roboto', 'Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'Fira Sans', 'Open Sans',
  'Source Sans Pro', 'Lato', 'Cantarell', 'SF Pro Text', 'Bahnschrift', 'Sitka Text',
];

// A font counts as installed when it renders the test string at a different
// width from all three generic fallbacks.
function detectFonts() {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return [];
    const sample = 'mmmmmmmmmmlli1WQ@#';
    const bases = ['monospace', 'sans-serif', 'serif'];
    const baseWidths = bases.map((b) => { ctx.font = `72px ${b}`; return ctx.measureText(sample).width; });
    return FONT_CANDIDATES.filter((font) => bases.some((b, i) => {
      ctx.font = `72px "${font}", ${b}`;
      return ctx.measureText(sample).width !== baseWidths[i];
    }));
  } catch {
    return [];
  }
}

async function clientHints() {
  const data = navigator.userAgentData;
  if (!data || typeof data.getHighEntropyValues !== 'function') return null;
  try {
    return await data.getHighEntropyValues(['platformVersion', 'architecture', 'model', 'bitness', 'fullVersionList']);
  } catch {
    return null;
  }
}

export async function collectSignals() {
  const nav = navigator;
  const ua = nav.userAgent || '';
  const uaData = nav.userAgentData;
  const brands = uaData && uaData.brands;
  const hints = await clientHints();
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
  const offset = -new Date().getTimezoneOffset() / 60;
  const languages = (nav.languages && nav.languages.length ? nav.languages : [nav.language]).filter(Boolean);
  const browser = describeBrowser(ua, brands);
  const family = browserFamily(ua, brands);
  const os = describeOS(ua, uaData && uaData.platform);
  const osLabel = osWithVersion(os, hints && hints.platformVersion);
  const mobile = os === 'iPadOS' || (uaData ? uaData.mobile : /Mobi|Android|iPhone/.test(ua));
  const conn = nav.connection;
  const canvas = canvasPrint();
  const scrambled = canvasScrambled();
  const gl = webglInfo();
  const fonts = detectFonts();
  const dnt = nav.doNotTrack === '1' || window.doNotTrack === '1';
  const gpc = nav.globalPrivacyControl === true;

  const canvasHash = canvas ? await hash(canvas) : null;
  const glHash = gl ? await hash(`${gl.vendor}|${gl.renderer}`) : null;
  const screenText = `${screen.width} × ${screen.height}`;
  const place = tz && tz.includes('/') ? tz.split('/').pop().replace(/_/g, ' ') : tz;

  const signals = [
    signal('Your device', 'Operating system', osLabel, 'low',
      'Ad prices and product choices can differ by platform. Some retailers have shown Mac users pricier options.'),
    signal('Your device', 'Type of device', mobile ? 'Phone or tablet' : 'Computer', 'low',
      'Decides which ad formats you get and whether you see adverts for apps.'),
    signal('Your device', 'Device model', hints && hints.model ? hints.model : null, 'medium',
      'A specific model hints at your income and how recently you bought your device.'),
    signal('Your device', 'Screen size', `${screenText} at ${window.devicePixelRatio || 1}× sharpness`, 'medium',
      'Screen size and sharpness narrow down your exact device.'),
    signal('Your device', 'Processor cores', nav.hardwareConcurrency, 'medium',
      'Combined with other details, hardware specs help single you out.'),
    signal('Your device', 'Memory', nav.deviceMemory ? `About ${nav.deviceMemory} GB` : null, 'medium',
      'A rough sign of how expensive your device is.'),
    signal('Your device', 'Touch screen', nav.maxTouchPoints > 0 ? `Yes, ${nav.maxTouchPoints} touch points` : 'No', 'low',
      'Separates touch laptops and tablets from ordinary computers.'),

    signal('Your browser', 'Browser', browser, 'low',
      'Used to choose ad formats and to spot people who block ads.'),
    signal('Your browser', 'Browser ID text', ua, 'medium',
      'Your browser sends this with every page you open. Rare versions make you easier to recognise.', 'User agent string'),
    signal('Your browser', 'Connection speed', conn && conn.effectiveType ? conn.effectiveType.toUpperCase() : null, 'low',
      'Lets advertisers guess whether you are on Wi-Fi or mobile data.'),
    signal('Your browser', 'Dark mode', media('(prefers-color-scheme: dark)') ? 'On' : 'Off', 'low',
      'A small preference, but every preference adds to your profile.'),

    signal('Where you are', 'Time zone', tz ? `${tz.replace(/_/g, ' ')} (UTC${offset >= 0 ? '+' : ''}${offset})` : null, 'medium',
      'Places you in a region without asking for your location.'),
    signal('Where you are', 'Languages', languages.map(languageName).join(', '), 'medium',
      'Shows your likely country and the language ads will be written in.'),
    signal('Where you are', 'IP address', 'Seen by every server you contact', 'high',
      'Reveals your rough location and internet provider. They Spy has no server, so it never sees yours.'),

    signal('Privacy settings', 'Do-not-sell signal', gpc ? 'On' : 'Off', 'low',
      'Asks sites not to sell or share your data. Sites must obey it in California and some other US states.', 'Global Privacy Control'),
    signal('Privacy settings', 'Do Not Track', dnt ? 'On' : 'Off', 'low',
      'An older signal that advertisers ignore. Firefox has removed it. Turning it on can make you stand out.'),
    signal('Privacy settings', 'Cookies', nav.cookieEnabled ? 'Allowed' : 'Blocked', 'low',
      'Cookies let ad networks recognise you as you move between sites.'),
    signal('Privacy settings', 'Page you came from', document.referrer || 'Hidden or none', 'medium',
      'Tells the site where you were just browsing.', 'Referrer'),

    signal('Fingerprint', 'How your device draws images', canvasHash ? (scrambled ? `${canvasHash} (scrambled by your browser)` : canvasHash) : null, 'high',
      'Every device draws text and shapes slightly differently. Trackers turn the result into an ID that survives clearing cookies.', 'Canvas fingerprint'),
    signal('Fingerprint', 'Graphics chip', gl ? gl.renderer : null, 'high',
      'Any page can read the name of your graphics hardware, and it is fairly rare.', 'WebGL renderer'),
    signal('Fingerprint', 'Installed fonts', fonts.length ? `${fonts.length} found: ${fonts.slice(0, 6).join(', ')}${fonts.length > 6 ? ', …' : ''}` : null, 'high',
      'The fonts on your device reflect the software you use, and vary a lot between people.'),
  ];

  const idParts = [ua, screenText, window.devicePixelRatio, tz, languages.join(','), nav.hardwareConcurrency, canvasHash, glHash, fonts.join(',')];
  const fingerprintId = await hash(idParts.join('||'));
  const highReadable = signals.filter((s) => s.group === 'Fingerprint' && s.value !== NA).length;

  return {
    signals,
    summary: {
      browser, family, os, osLabel, mobile, tz, place, languages,
      language: languages[0] ? languageName(languages[0]) : null,
      fingerprintId, highReadable, highTotal: 3, scrambled, gpc,
    },
  };
}
