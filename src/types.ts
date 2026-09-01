// ============================================================================
// EARTH — Commercial SaaS Platform
// Central type definitions + demo mock data
// ============================================================================

// ----------------------------------------------------------------------------
// 1. NAVIGATION TYPES
// ----------------------------------------------------------------------------

export type EarthSection =
  | 'overview'
  | 'operations'
  | 'carbon-esg'
  | 'compliance'
  | 'circular'
  | 'reports';

export type EarthPage =
  // overview
  | 'overview-dashboard'
  | 'overview-tenants'
  | 'overview-billing'
  // operations
  | 'operations-pickups'
  | 'operations-recyclers'
  | 'operations-materials'
  // carbon-esg
  | 'carbon-esg-emissions'
  | 'carbon-esg-scorecard'
  | 'carbon-esg-targets'
  // compliance
  | 'compliance-frameworks'
  | 'compliance-audits'
  | 'compliance-documents'
  // circular
  | 'circular-takeback'
  | 'circular-returns'
  | 'circular-auctions'
  | 'circular-oem-contracts'
  | 'circular-replacements'
  | 'circular-ledger'
  // reports
  | 'reports-esg'
  | 'reports-financial'
  | 'reports-custom';

export const SECTION_PAGES: Record<EarthSection, EarthPage[]> = {
  overview: ['overview-dashboard', 'overview-tenants', 'overview-billing'],
  operations: ['operations-pickups', 'operations-recyclers', 'operations-materials'],
  'carbon-esg': ['carbon-esg-emissions', 'carbon-esg-scorecard', 'carbon-esg-targets'],
  compliance: ['compliance-frameworks', 'compliance-audits', 'compliance-documents'],
  circular: [
    'circular-takeback',
    'circular-returns',
    'circular-auctions',
    'circular-oem-contracts',
    'circular-replacements',
    'circular-ledger',
  ],
  reports: ['reports-esg', 'reports-financial', 'reports-custom'],
};

export const SECTION_LABELS: Record<EarthSection, string> = {
  overview: 'Overview',
  operations: 'Operations',
  'carbon-esg': 'Carbon & ESG',
  compliance: 'Compliance',
  circular: 'Circular Economy',
  reports: 'Reports',
};

// ----------------------------------------------------------------------------
// 2. DATA MODEL TYPES
// ----------------------------------------------------------------------------

export type TenantPlan = 'starter' | 'growth' | 'enterprise';
export type TenantStatus = 'active' | 'trial' | 'past-due' | 'churned';

export interface Tenant {
  id: string;
  name: string;
  plan: TenantPlan;
  locations: number;
  mrr: number;
  status: TenantStatus;
}

export type PickupStatus = 'scheduled' | 'in-transit' | 'completed' | 'cancelled';

export interface PickupOrder {
  id: string;
  location: string;
  material: string;
  weight: number; // kg
  date: string; // ISO date
  status: PickupStatus;
  recycler: string;
}

export interface ComplianceFramework {
  name: string;
  score: number; // 0-100
  deadline: string; // ISO date
  missingItems: string[];
}

export interface EmissionsData {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  period: string; // e.g. 'Q2 2026'
  unit: 'tCO2e';
}

export type TakeBackType = 'trade-in' | 'deposit' | 'epr';

export interface TakeBackProgram {
  id: string;
  name: string;
  type: TakeBackType;
  itemsReturned: number;
  creditsIssued: number;
  replacements: number;
}

export type ItemCondition = 'A' | 'B' | 'C' | 'D';
export type ReturnRoute = 'oem' | 'b2b' | 'recycle';

export interface TakeBackReturn {
  id: string;
  customer: string;
  item: string;
  sku: string;
  condition: ItemCondition;
  route: ReturnRoute;
  creditValue: number;
}

export type AuctionType = 'sealed-bid' | 'vickrey' | 'dutch';

export interface AuctionLot {
  id: string;
  title: string;
  description: string;
  weight: number; // kg
  type: AuctionType;
  reserve: number;
  currentPrice: number;
  bids: number;
  closesAt: string; // ISO datetime
}

export type OEMContractStatus = 'active' | 'pending' | 'expired';

export interface OEMContract {
  id: string;
  oem: string;
  category: string;
  itemsReturned: number;
  creditRange: string; // e.g. "€15-€120"
  status: OEMContractStatus;
}

export interface Recycler {
  id: string;
  name: string;
  materials: string[];
  tonnage: number;
  onTimeRate: number; // 0-100
}

export interface MaterialPrice {
  material: string;
  pricePerTonne: number;
  change24h: number; // percentage, can be negative
}

export type LedgerEntryType = 'credit' | 'debit';

export interface CoreLedgerEntry {
  description: string;
  amount: number;
  type: LedgerEntryType;
}

export type ReplacementOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export interface ReplacementOrder {
  id: string;
  item: string;
  replacesItem: string;
  price: number;
  creditApplied: number;
  status: ReplacementOrderStatus;
}

// ----------------------------------------------------------------------------
// 3. MOCK DATA
// ----------------------------------------------------------------------------

export const MOCK_TENANTS: Tenant[] = [
  { id: 'ten-001', name: 'Hornbach Germany', plan: 'enterprise', locations: 156, mrr: 48500, status: 'active' },
  { id: 'ten-002', name: 'Bosch Power Tools', plan: 'enterprise', locations: 42, mrr: 36200, status: 'active' },
  { id: 'ten-003', name: 'Makita Europe', plan: 'growth', locations: 28, mrr: 18900, status: 'active' },
  { id: 'ten-004', name: 'BASF Coatings', plan: 'enterprise', locations: 19, mrr: 41750, status: 'active' },
  { id: 'ten-005', name: 'OBI Baumarkt', plan: 'growth', locations: 63, mrr: 22400, status: 'active' },
  { id: 'ten-006', name: 'Toom Baumarkt', plan: 'starter', locations: 11, mrr: 6200, status: 'trial' },
  { id: 'ten-007', name: 'Stihl Group', plan: 'growth', locations: 15, mrr: 15800, status: 'active' },
  { id: 'ten-008', name: 'Würth Group', plan: 'enterprise', locations: 34, mrr: 39100, status: 'past-due' },
  { id: 'ten-009', name: 'Metabo GmbH', plan: 'starter', locations: 8, mrr: 4900, status: 'active' },
  { id: 'ten-010', name: 'Hagebau', plan: 'growth', locations: 21, mrr: 17300, status: 'churned' },
];

export const MOCK_PICKUP_ORDERS: PickupOrder[] = [
  { id: 'pu-1001', location: 'Hornbach Mannheim', material: 'Mixed Metal Scrap', weight: 4200, date: '2026-07-28', status: 'completed', recycler: 'Remondis Nord' },
  { id: 'pu-1002', location: 'Bosch Stuttgart Plant', material: 'Lithium-Ion Batteries', weight: 850, date: '2026-07-29', status: 'in-transit', recycler: 'Redwood Materials EU' },
  { id: 'pu-1003', location: 'Makita Düsseldorf DC', material: 'Cardboard & Packaging', weight: 1900, date: '2026-07-30', status: 'scheduled', recycler: 'Interzero' },
  { id: 'pu-1004', location: 'BASF Ludwigshafen', material: 'Industrial Solvents', weight: 3100, date: '2026-07-30', status: 'scheduled', recycler: 'Veolia Environnement' },
  { id: 'pu-1005', location: 'OBI Köln West', material: 'Aluminum Profiles', weight: 2650, date: '2026-07-27', status: 'completed', recycler: 'Remondis Nord' },
  { id: 'pu-1006', location: 'Hornbach Berlin', material: 'Power Tool E-Waste', weight: 1120, date: '2026-08-01', status: 'scheduled', recycler: 'ERP Deutschland' },
  { id: 'pu-1007', location: 'Stihl Waiblingen', material: 'Plastic Housings (ABS)', weight: 980, date: '2026-07-29', status: 'in-transit', recycler: 'Interzero' },
  { id: 'pu-1008', location: 'Würth Künzelsau', material: 'Steel Fasteners Scrap', weight: 5400, date: '2026-07-26', status: 'completed', recycler: 'TSR Recycling' },
  { id: 'pu-1009', location: 'Metabo Nürtingen', material: 'Copper Windings', weight: 640, date: '2026-08-02', status: 'scheduled', recycler: 'Aurubis AG' },
  { id: 'pu-1010', location: 'OBI Frankfurt', material: 'Mixed Metal Scrap', weight: 3300, date: '2026-07-25', status: 'cancelled', recycler: 'Remondis Nord' },
];

export const MOCK_COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  { name: 'EU CSRD', score: 78, deadline: '2026-12-31', missingItems: ['Scope 3 supplier data', 'Double materiality assessment sign-off'] },
  { name: 'WEEE Directive', score: 92, deadline: '2026-09-30', missingItems: ['Q3 take-back tonnage report'] },
  { name: 'EU Battery Regulation', score: 64, deadline: '2027-02-18', missingItems: ['Carbon footprint declaration', 'Due diligence policy', 'Recycled content certificate'] },
  { name: 'EPR Packaging (VerpackG)', score: 88, deadline: '2026-10-01', missingItems: ['LUCID registration update'] },
  { name: 'ISO 14001', score: 95, deadline: '2027-05-01', missingItems: [] },
  { name: 'German Supply Chain Act (LkSG)', score: 71, deadline: '2026-11-15', missingItems: ['Tier-2 supplier risk mapping', 'Grievance mechanism audit'] },
];

export const MOCK_EMISSIONS_DATA: EmissionsData[] = [
  { scope1: 1240, scope2: 3860, scope3: 18420, total: 23520, period: 'Q1 2026', unit: 'tCO2e' },
  { scope1: 1180, scope2: 3610, scope3: 17950, total: 22740, period: 'Q2 2026', unit: 'tCO2e' },
  { scope1: 1095, scope2: 3340, scope3: 17280, total: 21715, period: 'Q3 2026 (proj.)', unit: 'tCO2e' },
];

export const MOCK_TAKEBACK_PROGRAMS: TakeBackProgram[] = [
  { id: 'tbp-01', name: 'Bosch Power Tool Trade-In', type: 'trade-in', itemsReturned: 4820, creditsIssued: 312400, replacements: 3960 },
  { id: 'tbp-02', name: 'EU Battery Deposit Scheme', type: 'deposit', itemsReturned: 15680, creditsIssued: 94080, replacements: 0 },
  { id: 'tbp-03', name: 'Makita EPR Compliance Program', type: 'epr', itemsReturned: 9210, creditsIssued: 0, replacements: 0 },
  { id: 'tbp-04', name: 'Stihl Garden Equipment Trade-In', type: 'trade-in', itemsReturned: 2140, creditsIssued: 128900, replacements: 1875 },
];

export const MOCK_TAKEBACK_RETURNS: TakeBackReturn[] = [
  { id: 'ret-5001', customer: 'J. Müller', item: 'Bosch GSR 18V Cordless Drill', sku: 'BSH-GSR18V-55', condition: 'B', route: 'oem', creditValue: 42 },
  { id: 'ret-5002', customer: 'A. Schmidt', item: 'Makita DHP484 Combi Drill', sku: 'MKT-DHP484', condition: 'A', route: 'oem', creditValue: 68 },
  { id: 'ret-5003', customer: 'Bauzentrum Meier GmbH', item: 'Stihl MS 271 Chainsaw', sku: 'STH-MS271', condition: 'C', route: 'b2b', creditValue: 55 },
  { id: 'ret-5004', customer: 'K. Becker', item: 'Bosch PSB 18 LI-2 Drill', sku: 'BSH-PSB18LI2', condition: 'D', route: 'recycle', creditValue: 8 },
  { id: 'ret-5005', customer: 'Handwerk Nord eG', item: 'Metabo BS 18 LTX Drill', sku: 'MTB-BS18LTX', condition: 'B', route: 'oem', creditValue: 39 },
  { id: 'ret-5006', customer: 'T. Wagner', item: 'Makita DUR190L Grass Trimmer', sku: 'MKT-DUR190L', condition: 'A', route: 'oem', creditValue: 71 },
  { id: 'ret-5007', customer: 'S. Fischer', item: 'Bosch AdvancedImpact 18 Driver', sku: 'BSH-AI18', condition: 'C', route: 'b2b', creditValue: 24 },
];

export const MOCK_AUCTION_LOTS: AuctionLot[] = [
  { id: 'lot-2201', title: 'Grade B Aluminum Profile Bundle', description: '2.6t reclaimed aluminum extrusions from OBI Köln renovation', weight: 2650, type: 'sealed-bid', reserve: 3200, currentPrice: 3650, bids: 7, closesAt: '2026-08-02T15:00:00Z' },
  { id: 'lot-2202', title: 'Lithium-Ion Battery Pack Lot (Mixed)', description: '850kg used e-bike and power tool battery packs, tested, sorted by chemistry', weight: 850, type: 'vickrey', reserve: 5100, currentPrice: 5100, bids: 4, closesAt: '2026-08-03T12:00:00Z' },
  { id: 'lot-2203', title: 'Copper Motor Winding Scrap', description: '640kg #1 copper winding, stripped, from Metabo returns line', weight: 640, type: 'dutch', reserve: 4800, currentPrice: 4550, bids: 2, closesAt: '2026-08-01T09:00:00Z' },
  { id: 'lot-2204', title: 'ABS Plastic Housing Regrind', description: '980kg post-consumer ABS regrind, black, from power tool housings', weight: 980, type: 'sealed-bid', reserve: 1150, currentPrice: 1340, bids: 9, closesAt: '2026-08-04T16:00:00Z' },
  { id: 'lot-2205', title: 'Steel Fastener Scrap (Grade A)', description: '5.4t clean steel fastener scrap, sorted, from Würth Künzelsau', weight: 5400, type: 'sealed-bid', reserve: 2700, currentPrice: 2980, bids: 5, closesAt: '2026-08-05T10:00:00Z' },
];

export const MOCK_OEM_CONTRACTS: OEMContract[] = [
  { id: 'oem-01', oem: 'Bosch', category: 'Power Tools', itemsReturned: 4820, creditRange: '€15–€120', status: 'active' },
  { id: 'oem-02', oem: 'Makita', category: 'Power Tools & Outdoor', itemsReturned: 3160, creditRange: '€20–€150', status: 'active' },
  { id: 'oem-03', oem: 'Stihl', category: 'Garden Equipment', itemsReturned: 2140, creditRange: '€25–€180', status: 'active' },
  { id: 'oem-04', oem: 'Metabo', category: 'Power Tools', itemsReturned: 1380, creditRange: '€10–€95', status: 'active' },
  { id: 'oem-05', oem: 'Würth', category: 'Fasteners & Assembly', itemsReturned: 640, creditRange: '€5–€40', status: 'pending' },
  { id: 'oem-06', oem: 'Einhell', category: 'Power Tools', itemsReturned: 910, creditRange: '€8–€60', status: 'active' },
  { id: 'oem-07', oem: 'AEG Powertools', category: 'Power Tools', itemsReturned: 505, creditRange: '€12–€85', status: 'expired' },
];

export const MOCK_RECYCLERS: Recycler[] = [
  { id: 'rec-01', name: 'Remondis Nord', materials: ['Mixed Metal Scrap', 'Aluminum', 'Cardboard'], tonnage: 18400, onTimeRate: 96 },
  { id: 'rec-02', name: 'Interzero', materials: ['Plastic Housings', 'Packaging', 'EPR Compliance'], tonnage: 12650, onTimeRate: 94 },
  { id: 'rec-03', name: 'Redwood Materials EU', materials: ['Lithium-Ion Batteries', 'E-Waste'], tonnage: 3820, onTimeRate: 99 },
  { id: 'rec-04', name: 'Veolia Environnement', materials: ['Industrial Solvents', 'Hazardous Waste'], tonnage: 6410, onTimeRate: 91 },
  { id: 'rec-05', name: 'TSR Recycling', materials: ['Steel', 'Ferrous Scrap'], tonnage: 24900, onTimeRate: 97 },
  { id: 'rec-06', name: 'Aurubis AG', materials: ['Copper', 'Non-Ferrous Metals'], tonnage: 5320, onTimeRate: 98 },
  { id: 'rec-07', name: 'ERP Deutschland', materials: ['Power Tool E-Waste', 'WEEE'], tonnage: 4180, onTimeRate: 93 },
];

export const MOCK_MATERIAL_PRICES: MaterialPrice[] = [
  { material: 'Aluminum (Grade A)', pricePerTonne: 1380, change24h: 1.8 },
  { material: 'Copper (Bare Bright)', pricePerTonne: 8420, change24h: -0.6 },
  { material: 'Steel Scrap (HMS 1)', pricePerTonne: 295, change24h: 0.4 },
  { material: 'Lithium-Ion Battery Feedstock', pricePerTonne: 6100, change24h: 3.2 },
  { material: 'ABS Plastic Regrind', pricePerTonne: 890, change24h: -1.1 },
  { material: 'Cardboard (OCC)', pricePerTonne: 112, change24h: 0.9 },
  { material: 'PET Plastic (Clear)', pricePerTonne: 640, change24h: -2.3 },
];

export const MOCK_LEDGER_ENTRIES: CoreLedgerEntry[] = [
  { description: 'Bosch trade-in credit — GSR 18V drill (Grade B)', amount: 42, type: 'credit' },
  { description: 'Replacement order — Makita DHP484 (credit applied)', amount: 68, type: 'debit' },
  { description: 'Auction settlement — Lot 2201 Aluminum Profiles', amount: 3650, type: 'credit' },
  { description: 'Recycler payout — TSR Recycling steel scrap', amount: 1590, type: 'debit' },
  { description: 'EPR compliance credit — Makita Q2 program', amount: 2140, type: 'credit' },
  { description: 'Replacement order — Stihl MS 271 chainsaw', amount: 55, type: 'debit' },
  { description: 'Auction settlement — Lot 2204 ABS Regrind', amount: 1340, type: 'credit' },
];

export const MOCK_REPLACEMENT_ORDERS: ReplacementOrder[] = [
  { id: 'rep-901', item: 'Bosch GSR 18V-55 Drill (New)', replacesItem: 'Bosch GSR 18V Cordless Drill', price: 189, creditApplied: 42, status: 'shipped' },
  { id: 'rep-902', item: 'Makita DHP485 Combi Drill (New)', replacesItem: 'Makita DHP484 Combi Drill', price: 245, creditApplied: 68, status: 'delivered' },
  { id: 'rep-903', item: 'Stihl MS 291 Chainsaw (New)', replacesItem: 'Stihl MS 271 Chainsaw', price: 410, creditApplied: 55, status: 'processing' },
  { id: 'rep-904', item: 'Metabo BS 18 LTX BL Drill (New)', replacesItem: 'Metabo BS 18 LTX Drill', price: 199, creditApplied: 39, status: 'pending' },
  { id: 'rep-905', item: 'Makita DUR192L Grass Trimmer (New)', replacesItem: 'Makita DUR190L Grass Trimmer', price: 156, creditApplied: 71, status: 'shipped' },
];
