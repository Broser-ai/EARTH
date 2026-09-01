import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createEarthRuntime } from './createEarthRuntime.ts';
import type { EarthRuntime } from './EarthRuntime.ts';

interface RuntimeContextValue {
  runtime: EarthRuntime;
  generation: number;
  reset: () => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function EarthRuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState(() => createEarthRuntime());
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    return runtime.bus.on('*', () => {
      setGeneration((n) => n + 1);
    });
  }, [runtime]);

  const value = useMemo(
    () => ({
      runtime,
      generation,
      reset: () => {
        setRuntime(createEarthRuntime());
        setGeneration(0);
      },
    }),
    [runtime, generation],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useEarthRuntime(): RuntimeContextValue {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('useEarthRuntime must be used within EarthRuntimeProvider');
  return value;
}
