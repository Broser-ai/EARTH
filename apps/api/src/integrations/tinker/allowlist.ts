export const DEFAULT_TINKER_MODEL_REFERENCES = ['earth-tinker-base-v0'] as const;

const MODEL_REFERENCE_RE = /^[a-z0-9][a-z0-9._-]{0,118}$/i;

export function isAllowListedModelReference(
  value: string,
  allowList: readonly string[] = DEFAULT_TINKER_MODEL_REFERENCES,
): boolean {
  if (!MODEL_REFERENCE_RE.test(value)) {
    return false;
  }
  if (value.includes('://') || value.includes('..') || value.includes('/') || value.includes('\\')) {
    return false;
  }
  if (/huggingface\.co|https?:|file:/i.test(value)) {
    return false;
  }
  return allowList.includes(value);
}
