import type { EarthEvent, EarthEventInput, EarthEventType } from '../types.ts';

type Handler = (event: EarthEvent) => void;

export class EarthBus {
  private readonly events: EarthEvent[] = [];
  private readonly listeners = new Map<EarthEventType | '*', Set<Handler>>();
  private seq = 0;

  emit(input: EarthEventInput): EarthEvent {
    this.seq += 1;
    const event: EarthEvent = {
      id: input.id ?? `evt-${this.seq.toString().padStart(4, '0')}`,
      ts: input.ts ?? new Date().toISOString(),
      type: input.type,
      source: input.source,
      message: input.message,
      payload: input.payload ?? {},
    };
    this.events.push(event);
    this.notify(event.type, event);
    this.notify('*', event);
    return event;
  }

  on(type: EarthEventType | '*', handler: Handler): () => void {
    const bucket = this.listeners.get(type) ?? new Set<Handler>();
    bucket.add(handler);
    this.listeners.set(type, bucket);
    return () => {
      bucket.delete(handler);
    };
  }

  history(): readonly EarthEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }

  private notify(type: EarthEventType | '*', event: EarthEvent): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const handler of bucket) handler(event);
  }
}
