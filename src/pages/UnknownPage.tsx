import { EarthLink } from '../routing/EarthLink.tsx';

export default function UnknownPage({ path, pageId }: { path?: string; pageId?: string }) {
  const station = path ?? (pageId ? `/${pageId}` : '/unknown');

  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 p-6 backdrop-blur">
      <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Unknown station</p>
      <h1 className="mt-2 font-mono text-lg text-text-primary">{station}</h1>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">
        No module is registered for this flight path. EARTH does not fall back to Overview for dead
        navigation items.
      </p>
      <EarthLink
        to="/uplink"
        className="mt-4 inline-block font-mono text-[11px] tracking-wider text-accent hover:underline"
      >
        OPEN UPLINK MANIFEST
      </EarthLink>
    </div>
  );
}
