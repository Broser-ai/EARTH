import { describe, expect, it } from 'vitest';
import { HashChainLedger } from './HashChainLedger.ts';
import { issueDid } from './did.ts';

describe('identity / ledger', () => {
  it('issues an EARTH DID document without claiming a live key ceremony', () => {
    const doc = issueDid('operator');
    expect(doc.id).toBe('did:earth:operator');
    expect(doc.verificationMethod).toHaveLength(1);
  });

  it('links entries with SHA-256 and verifies commitments', async () => {
    const ledger = new HashChainLedger();
    const first = await ledger.append({ kind: 'intake', batch: 'MB-1' });
    const second = await ledger.append({ kind: 'compass', actionId: 'act-1' });

    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(second.prevHash).toBe(first.digest);
    expect(second.index).toBe(1);

    const proof = ledger.prove(first.id);
    expect(proof.digest).toBe(first.digest);
    await expect(ledger.verify(proof.payload, first.prevHash, first.digest)).resolves.toBe(true);
    await expect(ledger.verify({ tampered: true }, first.prevHash, first.digest)).resolves.toBe(false);
  });

  it('selectively discloses a field subset without claiming a STARK proof', async () => {
    const ledger = new HashChainLedger();
    const entry = await ledger.append({ supplier: 'SUP-DE-044', tonnes: 15.2, priceEur: 1847 });

    const revealed = ledger.disclose(entry.id, ['supplier', 'tonnes']);
    expect(revealed.revealed).toEqual({ supplier: 'SUP-DE-044', tonnes: 15.2 });
    expect(revealed.redacted).toEqual(['priceEur']);
    expect(revealed.method).toBe('subset-reveal');
    expect(revealed.inclusionProof).toBeNull();
  });
});
