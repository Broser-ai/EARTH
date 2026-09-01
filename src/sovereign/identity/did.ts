export interface DidVerificationMethod {
  id: string;
  type: 'JsonWebKey2020';
  controller: string;
  publicKeyJwk: JsonWebKey;
}

export interface DidDocument {
  id: `did:earth:${string}`;
  controller: `did:earth:${string}`;
  verificationMethod: DidVerificationMethod[];
}

export function issueDid(suffix: string): DidDocument {
  const id = `did:earth:${suffix}` as const;
  return {
    id,
    controller: id,
    verificationMethod: [
      {
        id: `${id}#key-0`,
        type: 'JsonWebKey2020',
        controller: id,
        // Interface only — no key ceremony, no live KMS.
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: '', y: '' },
      },
    ],
  };
}
