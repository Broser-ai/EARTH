export type EarthSection =
  | 'overview'
  | 'operations'
  | 'carbon-esg'
  | 'compliance'
  | 'circular'
  | 'reports'
  | 'mission';

export type EarthPageId =
  | 'dashboard'
  | 'pickup-orders'
  | 'container-fleet'
  | 'recycler-network'
  | 'route-planner'
  | 'weight-scanning'
  | 'reverse-logistics'
  | 'take-back-programs'
  | 'b2b-marketplace'
  | 'material-exchange'
  | 'product-passports'
  | 'carbon-accounting'
  | 'emissions-scope'
  | 'reduction-targets'
  | 'offset-credits'
  | 'compliance-dashboard'
  | 'csrd-disclosure'
  | 'gri-reporting'
  | 'eudr-tracking'
  | 'audit-trail'
  | 'reports'
  | 'locations'
  | 'users-roles'
  | 'integrations'
  | 'billing'
  | 'command-center'
  | 'dev-swarm'
  | 'aegis'
  | 'war-game'
  | 'vision'
  | 'prime'
  | 'uplink';

export type EarthBand =
  | 'OVERVIEW'
  | 'OPERATIONS'
  | 'CIRCULAR'
  | 'CARBON'
  | 'COMPLIANCE'
  | 'REPORTS'
  | 'MISSION'
  | 'UPLINK';

export interface EarthRoute {
  path: string;
  pageId: EarthPageId;
  section: EarthSection | null;
  band: EarthBand;
  callsign: string;
  label: string;
  blurb: string;
}

export const EARTH_ROUTES: readonly EarthRoute[] = [
  {
    path: '/',
    pageId: 'dashboard',
    section: 'overview',
    band: 'OVERVIEW',
    callsign: 'HOME',
    label: 'Command overview',
    blurb: 'Mission-control home — Hornbach spine, not a marketing dashboard',
  },
  {
    path: '/ops',
    pageId: 'pickup-orders',
    section: 'operations',
    band: 'OPERATIONS',
    callsign: 'PICKUP',
    label: 'Pickup orders',
    blurb: 'Live intake queue',
  },
  {
    path: '/ops/fleet',
    pageId: 'container-fleet',
    section: 'operations',
    band: 'OPERATIONS',
    callsign: 'FLEET',
    label: 'Container fleet',
    blurb: 'Asset positions',
  },
  {
    path: '/ops/recyclers',
    pageId: 'recycler-network',
    section: 'operations',
    band: 'OPERATIONS',
    callsign: 'RECYCLERS',
    label: 'Recycler network',
    blurb: 'Downstream partners',
  },
  {
    path: '/ops/routes',
    pageId: 'route-planner',
    section: 'operations',
    band: 'OPERATIONS',
    callsign: 'ROUTES',
    label: 'Route planner',
    blurb: 'Haul planning',
  },
  {
    path: '/ops/scan',
    pageId: 'weight-scanning',
    section: 'operations',
    band: 'OPERATIONS',
    callsign: 'SCAN',
    label: 'Weight & scanning',
    blurb: 'Mass + scan events',
  },
  {
    path: '/circular',
    pageId: 'reverse-logistics',
    section: 'circular',
    band: 'CIRCULAR',
    callsign: 'REVERSE',
    label: 'Reverse logistics',
    blurb: 'Return spine',
  },
  {
    path: '/circular/takeback',
    pageId: 'take-back-programs',
    section: 'circular',
    band: 'CIRCULAR',
    callsign: 'TAKEBACK',
    label: 'Take-back',
    blurb: 'OEM / EPR programs',
  },
  {
    path: '/circular/market',
    pageId: 'b2b-marketplace',
    section: 'circular',
    band: 'CIRCULAR',
    callsign: 'MARKET',
    label: 'B2B marketplace',
    blurb: 'Secondary lots',
  },
  {
    path: '/circular/exchange',
    pageId: 'material-exchange',
    section: 'circular',
    band: 'CIRCULAR',
    callsign: 'EXCHANGE',
    label: 'Material exchange',
    blurb: 'Spot materials',
  },
  {
    path: '/circular/passports',
    pageId: 'product-passports',
    section: 'circular',
    band: 'CIRCULAR',
    callsign: 'PASSPORTS',
    label: 'Product passports',
    blurb: 'Identity of goods',
  },
  {
    path: '/carbon',
    pageId: 'carbon-accounting',
    section: 'carbon-esg',
    band: 'CARBON',
    callsign: 'CARBON',
    label: 'Carbon accounting',
    blurb: 'E-liability spine total',
  },
  {
    path: '/carbon/scope',
    pageId: 'emissions-scope',
    section: 'carbon-esg',
    band: 'CARBON',
    callsign: 'SCOPE',
    label: 'Scope 1/2/3',
    blurb: 'GHG breakdown',
  },
  {
    path: '/carbon/targets',
    pageId: 'reduction-targets',
    section: 'carbon-esg',
    band: 'CARBON',
    callsign: 'TARGETS',
    label: 'Reduction targets',
    blurb: 'Trajectory vs floor',
  },
  {
    path: '/carbon/offsets',
    pageId: 'offset-credits',
    section: 'carbon-esg',
    band: 'CARBON',
    callsign: 'OFFSETS',
    label: 'Offset credits',
    blurb: 'Credit inventory',
  },
  {
    path: '/compliance',
    pageId: 'compliance-dashboard',
    section: 'compliance',
    band: 'COMPLIANCE',
    callsign: 'COMPLIANCE',
    label: 'Compliance',
    blurb: 'Gate status',
  },
  {
    path: '/compliance/csrd',
    pageId: 'csrd-disclosure',
    section: 'compliance',
    band: 'COMPLIANCE',
    callsign: 'CSRD',
    label: 'CSRD',
    blurb: 'E1-6 disclosure',
  },
  {
    path: '/compliance/gri',
    pageId: 'gri-reporting',
    section: 'compliance',
    band: 'COMPLIANCE',
    callsign: 'GRI',
    label: 'GRI',
    blurb: 'GRI pack',
  },
  {
    path: '/compliance/eudr',
    pageId: 'eudr-tracking',
    section: 'compliance',
    band: 'COMPLIANCE',
    callsign: 'EUDR',
    label: 'EUDR',
    blurb: 'Deforestation index',
  },
  {
    path: '/audit',
    pageId: 'audit-trail',
    section: 'compliance',
    band: 'COMPLIANCE',
    callsign: 'AUDIT',
    label: 'Audit trail',
    blurb: 'Who changed what',
  },
  {
    path: '/reports',
    pageId: 'reports',
    section: 'reports',
    band: 'REPORTS',
    callsign: 'REPORTS',
    label: 'Reports',
    blurb: 'Exports',
  },
  {
    path: '/settings/locations',
    pageId: 'locations',
    section: 'reports',
    band: 'REPORTS',
    callsign: 'SITES',
    label: 'Locations',
    blurb: 'Site registry',
  },
  {
    path: '/settings/roles',
    pageId: 'users-roles',
    section: 'reports',
    band: 'REPORTS',
    callsign: 'ROLES',
    label: 'Users & roles',
    blurb: 'Access',
  },
  {
    path: '/settings/integrations',
    pageId: 'integrations',
    section: 'reports',
    band: 'REPORTS',
    callsign: 'UPLINKS',
    label: 'Integrations',
    blurb: 'External stations',
  },
  {
    path: '/settings/billing',
    pageId: 'billing',
    section: 'reports',
    band: 'REPORTS',
    callsign: 'BILLING',
    label: 'Billing',
    blurb: 'Tenant plan',
  },
  {
    path: '/mission',
    pageId: 'command-center',
    section: 'mission',
    band: 'MISSION',
    callsign: 'COMMAND',
    label: 'Command center',
    blurb: 'Kernel HUD — bus, COMPASS, swarm, Prime, ledger',
  },
  {
    path: '/mission/swarm',
    pageId: 'dev-swarm',
    section: 'mission',
    band: 'MISSION',
    callsign: 'SWARM',
    label: 'Dev swarm',
    blurb: 'Prime → H-Agent → S-Agents live run',
  },
  {
    path: '/mission/aegis',
    pageId: 'aegis',
    section: 'mission',
    band: 'MISSION',
    callsign: 'AEGIS',
    label: 'Aegis ledger',
    blurb: 'DID + SHA-256 hash chain',
  },
  {
    path: '/mission/wargame',
    pageId: 'war-game',
    section: 'mission',
    band: 'MISSION',
    callsign: 'WARGAME',
    label: 'War game',
    blurb: 'COMPASS deny / allow crisis',
  },
  {
    path: '/mission/vision',
    pageId: 'vision',
    section: 'mission',
    band: 'MISSION',
    callsign: 'VISION',
    label: 'Vision',
    blurb: 'Roboflow adapter surface — observations for S-Agent vision.infer',
  },
  {
    path: '/mission/prime',
    pageId: 'prime',
    section: 'mission',
    band: 'MISSION',
    callsign: 'PRIME',
    label: 'Prime policy',
    blurb: 'Inkling brain + Tinker fine-tune — untrained until weights exist',
  },
  {
    path: '/uplink',
    pageId: 'uplink',
    section: null,
    band: 'UPLINK',
    callsign: 'UPLINK',
    label: 'Uplink',
    blurb: 'Canonical flight paths as they look in the address bar',
  },
] as const;

const BY_PATH = new Map(EARTH_ROUTES.map((route) => [route.path, route]));
const BY_PAGE = new Map(EARTH_ROUTES.map((route) => [route.pageId, route]));

export const SECTION_HOME: Record<EarthSection, string> = {
  overview: '/',
  operations: '/ops',
  circular: '/circular',
  'carbon-esg': '/carbon',
  compliance: '/compliance',
  reports: '/reports',
  mission: '/mission',
};

export const BAND_ORDER: readonly EarthBand[] = [
  'OVERVIEW',
  'OPERATIONS',
  'CIRCULAR',
  'CARBON',
  'COMPLIANCE',
  'REPORTS',
  'MISSION',
  'UPLINK',
];

export function routeByPath(path: string): EarthRoute | undefined {
  return BY_PATH.get(path);
}

export function routeByPage(pageId: string): EarthRoute | undefined {
  return BY_PAGE.get(pageId as EarthPageId);
}

export function routesForSection(section: EarthSection): EarthRoute[] {
  return EARTH_ROUTES.filter((route) => route.section === section);
}

export function routesForBand(band: EarthBand): EarthRoute[] {
  return EARTH_ROUTES.filter((route) => route.band === band);
}

export function allCanonicalPaths(): string[] {
  return EARTH_ROUTES.map((route) => route.path);
}
