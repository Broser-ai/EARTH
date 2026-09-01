import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_ORIGIN, formatCanonical, normalizePath, resolvePath, type RouteMatch } from './resolve.ts';

export interface RouterValue {
  path: string;
  match: RouteMatch;
  origin: string;
  canonical: string;
  navigate: (next: string) => void;
  copyCanonical: () => Promise<boolean>;
}

const RouterContext = createContext<RouterValue | null>(null);

function readWindowPath(): string {
  if (typeof window === 'undefined') return '/';
  return normalizePath(window.location.pathname);
}

function readWindowOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_ORIGIN;
  return window.location.origin || DEFAULT_ORIGIN;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readWindowPath);
  const [origin, setOrigin] = useState(readWindowOrigin);

  useEffect(() => {
    const normalized = normalizePath(window.location.pathname);
    if (normalized !== window.location.pathname) {
      window.history.replaceState(window.history.state, '', normalized);
    }
    setPath(normalized);
    setOrigin(readWindowOrigin());

    const onPop = () => {
      setPath(normalizePath(window.location.pathname));
      setOrigin(readWindowOrigin());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: string) => {
    const normalized = normalizePath(next);
    if (normalized !== window.location.pathname) {
      window.history.pushState({}, '', normalized);
    }
    setPath(normalized);
  }, []);

  const match = useMemo(() => resolvePath(path), [path]);
  const canonical = useMemo(
    () => formatCanonical(origin, match.kind === 'known' ? match.route.path : match.path),
    [origin, match],
  );

  const copyCanonical = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      return true;
    } catch {
      return false;
    }
  }, [canonical]);

  const value = useMemo(
    () => ({ path, match, origin, canonical, navigate, copyCanonical }),
    [path, match, origin, canonical, navigate, copyCanonical],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used within RouterProvider');
  return value;
}
