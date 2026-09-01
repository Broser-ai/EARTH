export default function UnknownPage({ pageId }: { pageId: string }) {
  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 p-6 backdrop-blur">
      <p className="font-mono text-[11px] uppercase tracking-widest text-amber">Unknown page</p>
      <h1 className="mt-2 font-mono text-lg text-text-primary">{pageId}</h1>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">
        No module is registered for this route. EARTH does not fall back to Overview for dead
        navigation items.
      </p>
    </div>
  );
}
