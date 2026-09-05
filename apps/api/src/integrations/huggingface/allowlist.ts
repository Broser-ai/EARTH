const HF_MODEL_ID_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?$/;

const SSRF_RE =
  /https?:\/\/|file:|huggingface\.co|hf\.co|\.\.\/|\/\.\.|%2e%2e|%2f|127\.0\.0\.1|0\.0\.0\.0|localhost|169\.254\.169\.254|\[::1\]|metadata\.google/i;

const SECRET_LIKE_RE = /^(sk-|rf_|hf_|hg_|Bearer\s)/i;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const HF_UNSAFE_KEYS = new Set([
  'text',
  'input',
  'inputs',
  'messages',
  'code',
  'image',
  'audio',
  'raw',
  'prompt',
  'document',
  'documents',
  'endpoint',
  'url',
  'uri',
  'host',
  'space',
  'spaceid',
  'space_id',
]);

export function isSafeHuggingFaceModelId(modelId: string): boolean {
  if (!HF_MODEL_ID_RE.test(modelId)) {
    return false;
  }
  const segments = modelId.split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

export function sanitizeAllowListedModelIds(modelIds: readonly string[] | undefined): string[] {
  if (!modelIds || modelIds.length === 0) {
    return [];
  }
  const unique: string[] = [];
  for (const raw of modelIds) {
    const modelId = raw.trim();
    if (!isSafeHuggingFaceModelId(modelId)) {
      continue;
    }
    if (!unique.includes(modelId)) {
      unique.push(modelId);
    }
  }
  return unique;
}

export function isAllowListedModelId(modelId: string, allowListedModelIds: readonly string[]): boolean {
  return allowListedModelIds.includes(modelId);
}

export function payloadContainsSsrf(value: unknown): boolean {
  if (typeof value === 'string') {
    return SSRF_RE.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => payloadContainsSsrf(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => payloadContainsSsrf(item))
      || SSRF_RE.test(JSON.stringify(value));
  }
  return false;
}

export function looksLikeSecretText(value: string): boolean {
  if (SHA256_HEX_RE.test(value)) {
    return false;
  }
  if (SECRET_LIKE_RE.test(value)) {
    return true;
  }
  if (value.length >= 24 && /^[A-Za-z0-9_\-]{24,}$/.test(value)) {
    return true;
  }
  return false;
}

export function findHuggingFaceUnsafeField(payload: Record<string, unknown>): string | null {
  if (payloadContainsSsrf(payload)) {
    return 'url';
  }
  for (const [key, value] of Object.entries(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (HF_UNSAFE_KEYS.has(normalized) || HF_UNSAFE_KEYS.has(key.toLowerCase())) {
      return key;
    }
    if (typeof value === 'string' && (payloadContainsSsrf(value) || looksLikeSecretText(value))) {
      return key;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = findHuggingFaceUnsafeField(value as Record<string, unknown>);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}
