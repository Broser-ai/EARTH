import { describe, expect, it } from 'vitest';
import { allCanonicalPaths, EARTH_ROUTES, routeByPage, SECTION_HOME } from './catalog.ts';
import { PAGE_COMPONENTS } from './pageMap.ts';
import { formatCanonical, normalizePath, resolvePath } from './resolve.ts';

describe('normalizePath', () => {
  it('collapses trailing slashes and lowercases', () => {
    expect(normalizePath('/mission/swarm/')).toBe('/mission/swarm');
    expect(normalizePath('/MISSION/AEGIS')).toBe('/mission/aegis');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });

  it('strips query and hash', () => {
    expect(normalizePath('/carbon/scope?from=hud#spine')).toBe('/carbon/scope');
  });
});

describe('resolvePath', () => {
  it('resolves known paths including nested mission routes', () => {
    expect(resolvePath('/').kind).toBe('known');

    const swarm = resolvePath('/mission/swarm');
    expect(swarm.kind).toBe('known');
    if (swarm.kind === 'known') {
      expect(swarm.route.pageId).toBe('dev-swarm');
      expect(swarm.route.callsign).toBe('SWARM');
    }

    const mission = resolvePath('/mission');
    expect(mission.kind).toBe('known');
    if (mission.kind === 'known') expect(mission.route.pageId).toBe('command-center');

    const aegis = resolvePath('/mission/aegis/');
    expect(aegis.kind).toBe('known');
    if (aegis.kind === 'known') expect(aegis.route.pageId).toBe('aegis');

    const vision = resolvePath('/mission/vision');
    expect(vision.kind).toBe('known');
    if (vision.kind === 'known') expect(vision.route.pageId).toBe('vision');

    const prime = resolvePath('/mission/prime');
    expect(prime.kind).toBe('known');
    if (prime.kind === 'known') expect(prime.route.pageId).toBe('prime');
  });

  it('maps ops / carbon / intake / uplink grammar', () => {
    const cases: [string, string][] = [
      ['/ops', 'pickup-orders'],
      ['/intake', 'material-opportunity-intake'],
      ['/carbon', 'carbon-accounting'],
      ['/compliance', 'compliance-dashboard'],
      ['/audit', 'audit-trail'],
      ['/uplink', 'uplink'],
    ];
    for (const [path, pageId] of cases) {
      const match = resolvePath(path);
      expect(match.kind).toBe('known');
      if (match.kind === 'known') expect(match.route.pageId).toBe(pageId);
    }
  });

  it('sends unknown paths to UnknownPage — never Overview', () => {
    const ghost = resolvePath('/not-a-station');
    expect(ghost.kind).toBe('unknown');
    if (ghost.kind === 'unknown') expect(ghost.path).toBe('/not-a-station');

    const nestedGhost = resolvePath('/mission/nope');
    expect(nestedGhost.kind).toBe('unknown');
    if (nestedGhost.kind === 'unknown') expect(nestedGhost.path).toBe('/mission/nope');

    const overviewLookalike = resolvePath('/overview');
    expect(overviewLookalike.kind).toBe('unknown');
  });

  it('covers every catalog path as known', () => {
    for (const path of allCanonicalPaths()) {
      const match = resolvePath(path);
      expect(match.kind, path).toBe('known');
    }
  });
});

describe('catalog integrity', () => {
  it('maps every pageId to a component', () => {
    for (const route of EARTH_ROUTES) {
      expect(PAGE_COMPONENTS[route.pageId], route.path).toBeTypeOf('function');
    }
  });

  it('keeps unique paths and pageIds', () => {
    const paths = EARTH_ROUTES.map((route) => route.path);
    const pages = EARTH_ROUTES.map((route) => route.pageId);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it('has a section home for every EarthSection', () => {
    for (const [section, path] of Object.entries(SECTION_HOME)) {
      const match = resolvePath(path);
      expect(match.kind, section).toBe('known');
      if (match.kind === 'known') expect(match.route.section).toBe(section);
    }
  });

  it('round-trips pageId → path → pageId', () => {
    for (const route of EARTH_ROUTES) {
      expect(routeByPage(route.pageId)?.path).toBe(route.path);
      const match = resolvePath(route.path);
      expect(match.kind).toBe('known');
      if (match.kind === 'known') expect(match.route.pageId).toBe(route.pageId);
    }
  });
});

describe('formatCanonical', () => {
  it('joins origin and path-absolute on port 5180', () => {
    expect(formatCanonical('http://localhost:5180', '/mission/swarm')).toBe(
      'http://localhost:5180/mission/swarm',
    );
    expect(formatCanonical('http://localhost:5180/', '/')).toBe('http://localhost:5180/');
    expect(formatCanonical('http://localhost:5180', '/carbon')).toBe('http://localhost:5180/carbon');
    expect(formatCanonical('http://localhost:5180', '/uplink')).toBe('http://localhost:5180/uplink');
    expect(formatCanonical('http://localhost:5180', '/mission/vision')).toBe(
      'http://localhost:5180/mission/vision',
    );
  });
});
