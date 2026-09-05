/**
 * Outbound provider call probe.
 * Adapters must record through this helper if they ever attempt HTTP.
 * The control plane and DisabledAdapter never increment it.
 */
export const providerOutboundProbe = {
  calls: 0,
  lastUrl: null as string | null,
  reset(): void {
    this.calls = 0;
    this.lastUrl = null;
  },
  record(url: string): void {
    this.calls += 1;
    this.lastUrl = url;
  },
};
