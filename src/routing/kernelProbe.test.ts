import { describe, expect, it } from 'vitest';
import { createEarthRuntime } from '../sovereign/runtime/createEarthRuntime.ts';
import { inklingLesson, probeAdapter, probeAdapters, probeModulePaths } from './kernelProbe.ts';

describe('kernelProbe', () => {
  it('reports Tinker, Inkling, and Roboflow slots', () => {
    const rows = probeAdapters();
    expect(rows.map((row) => row.id)).toEqual(['roboflow', 'inkling', 'tinker']);
    expect(probeAdapter('roboflow').id).toBe('roboflow');
  });

  it('links vision / inkling / tinker on the stock EarthRuntime', () => {
    const runtime = createEarthRuntime();
    const rows = probeAdapters(runtime);
    expect(rows.find((row) => row.id === 'roboflow')?.runtimeLinked).toBe(true);
    expect(rows.find((row) => row.id === 'roboflow')?.linkedKey).toBe('vision');
    expect(rows.find((row) => row.id === 'inkling')?.linkedKey).toBe('inkling');
    expect(rows.find((row) => row.id === 'tinker')?.linkedKey).toBe('tinker');
  });

  it('reads the Inkling default lesson from the kernel module', () => {
    const lesson = inklingLesson();
    expect(lesson?.id).toBe('lesson-prime-mission-select');
  });

  it('does not glob adapter test files into the client graph', () => {
    const paths = probeModulePaths();
    expect(paths.some((path) => path.includes('.test.'))).toBe(false);
    expect(paths.length).toBeGreaterThan(0);
  });
});
