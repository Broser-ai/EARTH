import { routeByPath, type EarthRoute } from './catalog.ts';

export type RouteMatch =
  | { kind: 'known'; path: string; route: EarthRoute }
  | { kind: 'unknown'; path: string };

export function normalizePath(raw: string): string {
  const withoutSearch = raw.split('?')[0] ?? '/';
  const withoutHash = withoutSearch.split('#')[0] ?? '/';
  const parts = withoutHash
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => part.toLowerCase());
  if (parts.length === 0) return '/';
  return `/${parts.join('/')}`;
}

export function resolvePath(raw: string): RouteMatch {
  const path = normalizePath(raw);
  const route = routeByPath(path);
  if (route) return { kind: 'known', path: route.path, route };
  return { kind: 'unknown', path };
}

export function formatCanonical(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, '');
  const normalized = normalizePath(path);
  return `${base}${normalized}`;
}

export const DEFAULT_ORIGIN = 'http://localhost:5180';
