import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { ShieldCheck, Hash, KeyRound, Eye, Fingerprint } from 'lucide-react';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
import { truncHash } from '../sovereign/crypto/sha256.ts';
import type { SelectiveDisclosure } from '../sovereign/identity/HashChainLedger.ts';

export default function AegisProtocol() {
  const { runtime, generation } = useEarthRuntime();
  const [verifyMsg, setVerifyMsg] = useState<string>('No verification yet');
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null);
  const [disclosure, setDisclosure] = useState<SelectiveDisclosure | null>(null);
  const [busy, setBusy] = useState(false);
  void generation;

  const chain = runtime.ledger.chain();
  const did = runtime.operatorDid;

  async function commitSample() {
    setBusy(true);
    const entry = await runtime.ledger.append({
      kind: 'aegis.commitment',
      note: 'operator-initiated SHA-256 commitment',
      supplier: 'SUP-DE-044',
      tonnes: 15.2,
      priceEur: 1847,
    });
    runtime.bus.emit({
      type: 'ledger.appended',
      source: 'aegis',
      message: `committed ${truncHash(entry.digest)}`,
      payload: { id: entry.id },
    });
    setBusy(false);
  }

  async function verifyHead() {
    const head = chain.at(-1);
    if (!head) {
      setVerifyOk(false);
      setVerifyMsg('Ledger is empty — nothing to verify');
      return;
    }
    const ok = await runtime.ledger.verify(head.payload, head.prevHash, head.digest);
    setVerifyOk(ok);
    setVerifyMsg(ok ? `SHA-256 match for ${head.id}` : `VERIFY FAILED for ${head.id}`);
  }

  function discloseHead() {
    const head = chain.at(-1);
    if (!head) {
      setDisclosure(null);
      return;
    }
    setDisclosure(runtime.ledger.disclose(head.id, ['kind', 'supplier', 'tonnes', 'note']));
  }

  return (
    <div className="w-full text-text-primary">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck size={22} className="text-accent" />
          <h1 className="font-mono text-lg uppercase tracking-widest">Aegis ledger</h1>
        </div>
        <p className="text-sm text-text-secondary">
          SHA-256 hash-chain commitments and a DID document interface. In-tab runtime — not a
          ZK-STARK prover, not a durable audit log.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-accent/20 bg-white/[0.03] px-5 py-4 backdrop-blur">
        <div className="font-mono text-sm tracking-widest text-accent">COMMITMENT GRID: SHA-256</div>
        <div className="mt-1 font-mono text-[10px] text-text-muted">
          prove = digest(payload ‖ prevHash) · verify = recompute · selective disclosure = subset reveal
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <Label icon={Fingerprint} title="Operator DID" />
          <p className="mb-3 font-mono text-xs text-accent">{did.id}</p>
          <p className="text-xs leading-relaxed text-text-secondary">
            W3C-shaped document. Verification method is a placeholder JWK — no key ceremony has
            run.
          </p>
          <div className="mt-auto space-y-1.5 border-t border-white/5 pt-3 font-mono text-[11px]">
            <Row label="method" value={did.verificationMethod[0]?.type ?? '—'} />
            <Row label="controller" value={did.controller} />
          </div>
        </Card>

        <Card>
          <Label icon={Hash} title="Hash-chain" />
          <p className="mb-4 text-xs leading-relaxed text-text-secondary">
            Append-only SHA-256 chain. Genesis prevHash is 64 zero nibbles.
          </p>
          <button
            onClick={() => {
              void commitSample();
            }}
            disabled={busy}
            className="mb-3 rounded-md border border-accent/40 bg-accent/10 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:bg-accent/20"
          >
            {busy ? 'Committing…' : 'Append commitment'}
          </button>
          <button
            onClick={() => {
              void verifyHead();
            }}
            className="rounded-md border border-white/10 bg-white/[0.04] py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:bg-white/[0.06]"
          >
            Verify head
          </button>
          <p
            className={clsx(
              'mt-3 font-mono text-[11px]',
              verifyOk === true && 'text-success',
              verifyOk === false && 'text-danger',
              verifyOk === null && 'text-text-muted',
            )}
          >
            {verifyMsg}
          </p>
        </Card>

        <Card>
          <Label icon={Eye} title="Selective disclosure" />
          <p className="mb-4 text-xs leading-relaxed text-text-secondary">
            Reveal a field subset. Merkle inclusion proofs are later — this is an interface.
          </p>
          <button
            onClick={discloseHead}
            className="mb-3 rounded-md border border-amber/40 bg-amber/10 py-2 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/20"
          >
            Disclose subset
          </button>
          {disclosure ? (
            <pre className="overflow-x-auto rounded-md bg-black/20 p-2 font-mono text-[10px] text-text-secondary">
              {JSON.stringify(
                {
                  method: disclosure.method,
                  revealed: disclosure.revealed,
                  redacted: disclosure.redacted,
                  inclusionProof: disclosure.inclusionProof,
                },
                null,
                2,
              )}
            </pre>
          ) : (
            <p className="font-mono text-[11px] text-text-muted">No disclosure yet</p>
          )}
        </Card>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <KeyRound className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[11px] font-semibold tracking-wider">CHAIN</span>
          <span className="ml-auto font-mono text-[10px] text-text-muted">{chain.length} entries</span>
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          {chain.length === 0 && (
            <p className="font-mono text-[11px] text-text-muted">Empty chain — append a commitment or run a mission.</p>
          )}
          {chain.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-2 rounded-md border border-white/5 bg-black/20 px-3 py-2 font-mono text-[11px]"
            >
              <div className="flex justify-between text-text-secondary">
                <span>{entry.id}</span>
                <span>#{entry.index}</span>
              </div>
              <div className="mt-1 text-accent">{truncHash(entry.digest)}</div>
              <div className="text-text-muted">prev {truncHash(entry.prevHash)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-white/5 bg-white/[0.03] p-5 backdrop-blur">
      {children}
    </div>
  );
}

function Label({ icon: Icon, title }: { icon: typeof Hash; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon size={16} className="text-accent" />
      <h2 className="font-mono text-xs uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
