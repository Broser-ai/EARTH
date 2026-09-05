const SECRET_KEY_RE =
  /api[_-]?key|token|secret|password|authorization|bearer|private[_-]?key|hf_token/i;

export function containsSecretMaterial(value: unknown, extraNeedles: string[] = []): boolean {
  const text = JSON.stringify(value) ?? '';
  if (SECRET_KEY_RE.test(text)) {
    return true;
  }
  for (const needle of extraNeedles) {
    if (needle && needle.length > 0 && text.includes(needle)) {
      return true;
    }
  }
  return false;
}

export function assertNoSecretMaterial(
  value: unknown,
  extraNeedles: string[] = [],
  label = 'payload',
): void {
  if (containsSecretMaterial(value, extraNeedles)) {
    throw new Error(`${label} contains secret-like material and must not be emitted`);
  }
}
