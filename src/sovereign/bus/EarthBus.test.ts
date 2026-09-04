import { describe, expect, it } from 'vitest';
import { EarthBus } from './EarthBus.ts';

describe('EarthBus', () => {
  it('delivers typed events to subscribers and records history', () => {
    const bus = new EarthBus();
    const seen: string[] = [];
    bus.on('action.proposed', (event) => {
      seen.push(event.type);
    });

    bus.emit({
      type: 'action.proposed',
      source: 'test',
      message: 'propose intake',
      payload: { actionId: 'act-1' },
    });

    expect(seen).toEqual(['action.proposed']);
    expect(bus.history()).toHaveLength(1);
    expect(bus.history()[0]?.type).toBe('action.proposed');
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new EarthBus();
    let count = 0;
    const off = bus.on('*', () => {
      count += 1;
    });

    bus.emit({
      type: 'runtime.booted',
      source: 'test',
      message: 'boot',
      payload: {},
    });
    off();
    bus.emit({
      type: 'runtime.halted',
      source: 'test',
      message: 'halt',
      payload: { reason: 'test' },
    });

    expect(count).toBe(1);
    expect(bus.history()).toHaveLength(2);
  });
});
