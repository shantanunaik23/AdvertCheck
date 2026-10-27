// Reads what any website can learn about a visitor without asking.
// Nothing here is stored or sent anywhere; it is only displayed.

const LEVELS = { low: 'Low', medium: 'Medium', high: 'High' };
export { LEVELS };

function signal(group, label, value, level, why) {
  return { group, label, value: value === undefined || value === null || value === '' ? 'Not available' : String(value), level, why };
}

function describeBrowser(ua, brands) {
  if (brands && brands.length) {
    const named = brands.find((b) => !/not.?a.?brand|chromium/i.test(b.brand)) || brands[0];
    return `${named.brand} ${named.version}`;
  }
  const rules = [
    [/Edg\/([\d]+)/, 'Edge'],
    [/OPR\/([\d]+)/, 'Opera'],
    [/Firefox\/([\d]+)/, 'Firefox'],
    [/Chrome\/([\d]+)/, 'Chrome'],
    [/Version\/([\d]+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Unknown browser';
}

function describeOS(ua, platform) {
  if (platform) return platform;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function media(query) {
  try { return window.matchMedia(query).matches; } catch { return false; }
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
    ctx.fillText('Ad Mirror, 1.0 \u{1F50D}', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Ad Mirror, 1.0 \u{1F50D}', 4, 17);
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
  const hints = await clientHints();
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
  const offset = -new Date().getTimezoneOffset() / 60;
  const languages = (nav.languages && nav.languages.length ? nav.languages : [nav.language]).filter(Boolean);
  const browser = describeBrowser(ua, uaData && uaData.brands);
  const os = describeOS(ua, uaData && uaData.platform);
  const mobile = uaData ? uaData.mobile : /Mobi|Android|iPhone/.test(ua);
  const conn = nav.connection;
  const canvas = canvasPrint();
  const gl = webglInfo();
  const fonts = detectFonts();
  const dnt = nav.doNotTrack === '1' || window.doNotTrack === '1';
  const gpc = nav.globalPrivacyControl === true;

  const canvasHash = canvas ? await hash(canvas) : null;
  const glHash = gl ? await hash(`${gl.vendor}|${gl.renderer}`) : null;
  const screenText = `${screen.width} × ${screen.height}`;

  const signals = [
    signal('Device', 'Operating system', hints && hints.platformVersion ? `${os} ${hints.platformVersion}` : os, 'low',
      'Ad prices and product choices can differ by platform. Some retailers have shown Mac users pricier options.'),
    signal('Device', 'Device type', mobile ? 'Phone or tablet' : 'Desktop or laptop', 'low',
      'Decides which ad formats you get and whether app-install ads are shown.'),
    signal('Device', 'Device model', hints && hints.model ? hints.model : null, 'medium',
      'A specific model hints at income and how recently you bought your device.'),
    signal('Device', 'Screen', `${screenText} at ${window.devicePixelRatio || 1}× density`, 'medium',
      'Screen size and density narrow down your exact device.'),
    signal('Device', 'Processor cores', nav.hardwareConcurrency, 'medium',
      'Combined with other details, hardware specs help single you out.'),
    signal('Device', 'Memory', nav.deviceMemory ? `About ${nav.deviceMemory} GB` : null, 'medium',
      'A rough indicator of how high-end your device is.'),
    signal('Device', 'Touch screen', nav.maxTouchPoints > 0 ? `Yes (${nav.maxTouchPoints} touch points)` : 'No', 'low',
      'Separates touch laptops and tablets from ordinary computers.'),

    signal('Browser', 'Browser', browser, 'low',
      'Used to choose ad formats and to spot people who block ads.'),
    signal('Browser', 'Full browser identity', ua, 'medium',
      'Sent with every request you make. Rare versions make you easier to recognise.'),
    signal('Browser', 'Connection type', conn && conn.effectiveType ? conn.effectiveType.toUpperCase() : null, 'low',
      'Lets advertisers guess whether you are on Wi-Fi or mobile data.'),
    signal('Browser', 'Dark mode', media('(prefers-color-scheme: dark)') ? 'On' : 'Off', 'low',
      'A small preference, but every preference adds to your profile.'),

    signal('Location', 'Time zone', tz ? `${tz} (UTC${offset >= 0 ? '+' : ''}${offset})` : null, 'medium',
      'Places you in a region without asking for location permission.'),
    signal('Location', 'Languages', languages.join(', '), 'medium',
      'Shows your likely country and the languages ads will be written in.'),
    signal('Location', 'IP address', 'Visible to every server you contact', 'high',
      'Reveals your approximate city and internet provider. This page has no server, so it never sees it.'),

    signal('Privacy settings', 'Global Privacy Control', gpc ? 'On: you ask sites not to sell your data' : 'Off', 'low',
      'A legal opt-out signal in some places, such as California. Most sites ignore it elsewhere.'),
    signal('Privacy settings', 'Do Not Track', dnt ? 'On' : 'Off', 'low',
      'An older signal that most advertisers ignore. Turning it on can make you stand out.'),
    signal('Privacy settings', 'Cookies', nav.cookieEnabled ? 'Allowed' : 'Blocked', 'low',
      'Cookies let ad networks recognise you across sites.'),
    signal('Privacy settings', 'Page you came from', document.referrer || 'Hidden or none', 'medium',
      'Tells the site where you were just browsing.'),

    signal('Fingerprint', 'Canvas fingerprint', canvasHash, 'high',
      'Your device draws images in a slightly unique way. Trackers use this as an ID that survives clearing cookies.'),
    signal('Fingerprint', 'Graphics card', gl ? gl.renderer : null, 'high',
      'Your graphics hardware name is readable by any page and is fairly rare.'),
    signal('Fingerprint', 'Installed fonts', fonts.length ? `${fonts.length} detected: ${fonts.slice(0, 8).join(', ')}${fonts.length > 8 ? ', …' : ''}` : null, 'high',
      'The fonts you have installed reflect your software and work, and they vary a lot between people.'),
  ];

  const idParts = [ua, screenText, window.devicePixelRatio, tz, languages.join(','), nav.hardwareConcurrency, canvasHash, glHash, fonts.join(',')];
  const fingerprintId = await hash(idParts.join('||'));
  const highReadable = signals.filter((s) => s.level === 'high' && s.value !== 'Not available' && s.label !== 'IP address').length;

  return {
    signals,
    summary: { browser, os, mobile, tz, languages, fingerprintId, highReadable, highTotal: 3 },
  };
}
