import { findDecoder } from './classify/pixels';

interface WebRequestBody {
  formData?: Record<string, (string | ArrayBuffer)[] | undefined> | null | undefined;
  raw?: { bytes?: ArrayBuffer | null | undefined }[] | null | undefined;
}

const decoder = new TextDecoder();
const MAX_BODY = 64 * 1024;

/**
 * Decodes a request body, but only for known tracking endpoints that put
 * the event in the body. Everything else is never read.
 */
export function bodyFor(url: string, body: WebRequestBody | null | undefined): string | undefined {
  if (!body) return undefined;
  try {
    if (!findDecoder(new URL(url))) return undefined;
  } catch {
    return undefined;
  }
  if (body.formData) {
    const params = new URLSearchParams();
    for (const [key, values] of Object.entries(body.formData)) {
      for (const v of values ?? []) if (typeof v === 'string') params.append(key, v);
    }
    return params.toString();
  }
  let text = '';
  for (const part of body.raw ?? []) {
    if (part.bytes) text += decoder.decode(part.bytes, { stream: true });
    if (text.length > MAX_BODY) return undefined;
  }
  return text || undefined;
}
