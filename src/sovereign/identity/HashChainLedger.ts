import { canonicalJson, sha256Hex } from '../crypto/sha256.ts';

const GENESIS = '0'.repeat(64);

export interface LedgerEntry {
  id: string;
  index: number;
  ts: string;
  payload: Record<string, unknown>;
  prevHash: string;
  digest: string;
}

export interface LedgerProof {
  id: string;
  digest: string;
  prevHash: string;
  payload: Record<string, unknown>;
  index: number;
}

export interface SelectiveDisclosure {
  entryId: string;
  revealed: Record<string, unknown>;
  redacted: string[];
  method: 'subset-reveal';
  inclusionProof: null;
  digest: string;
}

export class HashChainLedger {
  private readonly entries: LedgerEntry[] = [];

  async append(payload: Record<string, unknown>): Promise<LedgerEntry> {
    const prevHash = this.entries.at(-1)?.digest ?? GENESIS;
    const ts = new Date().toISOString();
    const digest = await sha256Hex(canonicalJson({ payload, prevHash }));
    const entry: LedgerEntry = {
      id: `led-${this.entries.length.toString().padStart(4, '0')}`,
      index: this.entries.length,
      ts,
      payload,
      prevHash,
      digest,
    };
    this.entries.push(entry);
    return entry;
  }

  prove(entryId: string): LedgerProof {
    const entry = this.entries.find((item) => item.id === entryId);
    if (!entry) throw new Error(`unknown ledger entry ${entryId}`);
    return {
      id: entry.id,
      digest: entry.digest,
      prevHash: entry.prevHash,
      payload: entry.payload,
      index: entry.index,
    };
  }

  async verify(
    payload: Record<string, unknown>,
    prevHash: string,
    digest: string,
  ): Promise<boolean> {
    const expected = await sha256Hex(canonicalJson({ payload, prevHash }));
    return expected === digest;
  }

  disclose(entryId: string, fields: string[]): SelectiveDisclosure {
    const entry = this.entries.find((item) => item.id === entryId);
    if (!entry) throw new Error(`unknown ledger entry ${entryId}`);
    const revealed: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in entry.payload) revealed[field] = entry.payload[field];
    }
    const redacted = Object.keys(entry.payload).filter((key) => !fields.includes(key));
    return {
      entryId,
      revealed,
      redacted,
      method: 'subset-reveal',
      inclusionProof: null,
      digest: entry.digest,
    };
  }

  chain(): readonly LedgerEntry[] {
    return this.entries;
  }

  get length(): number {
    return this.entries.length;
  }
}
