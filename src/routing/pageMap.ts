import type { JSX } from 'react';
import type { EarthPageId } from './catalog.ts';

import Overview from '../pages/Overview';
import MaterialOpportunityIntake from '../pages/MaterialOpportunityIntake';
import PickupOrders from '../pages/PickupOrders';
import ContainerFleet from '../pages/ContainerFleet';
import RecyclerNetwork from '../pages/RecyclerNetwork';
import RoutePlanner from '../pages/RoutePlanner';
import WeightScanning from '../pages/WeightScanning';
import ReverseLogistics from '../pages/ReverseLogistics';
import TakeBackPrograms from '../pages/TakeBackPrograms';
import B2BMarketplace from '../pages/B2BMarketplace';
import MaterialExchange from '../pages/MaterialExchange';
import ProductPassports from '../pages/ProductPassports';
import CarbonAccounting from '../pages/CarbonAccounting';
import EmissionsScope from '../pages/EmissionsScope';
import ReductionTargets from '../pages/ReductionTargets';
import OffsetCredits from '../pages/OffsetCredits';
import ComplianceDashboard from '../pages/ComplianceDashboard';
import CSRDDisclosure from '../pages/CSRDDisclosure';
import GRIReporting from '../pages/GRIReporting';
import EUDRTracking from '../pages/EUDRTracking';
import AuditTrail from '../pages/AuditTrail';
import Reports from '../pages/Reports';
import LocationsSettings from '../pages/LocationsSettings';
import UsersRoles from '../pages/UsersRoles';
import IntegrationsSettings from '../pages/IntegrationsSettings';
import BillingSettings from '../pages/BillingSettings';
import CommandCenter from '../pages/CommandCenter';
import DevSwarm from '../pages/DevSwarm';
import AegisProtocol from '../pages/AegisProtocol';
import WarGame from '../pages/WarGame';
import ChronosOracle from '../pages/ChronosOracle';
import HyperMatrix from '../pages/HyperMatrix';
import VisionSurface from '../pages/VisionSurface';
import PrimePolicy from '../pages/PrimePolicy';
import Uplink from '../pages/Uplink';

export const PAGE_COMPONENTS: Record<EarthPageId, () => JSX.Element> = {
  dashboard: Overview,
  'material-opportunity-intake': MaterialOpportunityIntake,
  'pickup-orders': PickupOrders,
  'container-fleet': ContainerFleet,
  'recycler-network': RecyclerNetwork,
  'route-planner': RoutePlanner,
  'weight-scanning': WeightScanning,
  'reverse-logistics': ReverseLogistics,
  'take-back-programs': TakeBackPrograms,
  'b2b-marketplace': B2BMarketplace,
  'carbon-accounting': CarbonAccounting,
  'emissions-scope': EmissionsScope,
  'reduction-targets': ReductionTargets,
  'offset-credits': OffsetCredits,
  'material-exchange': MaterialExchange,
  'product-passports': ProductPassports,
  'compliance-dashboard': ComplianceDashboard,
  'csrd-disclosure': CSRDDisclosure,
  'gri-reporting': GRIReporting,
  'eudr-tracking': EUDRTracking,
  'audit-trail': AuditTrail,
  reports: Reports,
  locations: LocationsSettings,
  'users-roles': UsersRoles,
  integrations: IntegrationsSettings,
  billing: BillingSettings,
  'command-center': CommandCenter,
  'dev-swarm': DevSwarm,
  aegis: AegisProtocol,
  'war-game': WarGame,
  chronos: ChronosOracle,
  'hyper-matrix': HyperMatrix,
  vision: VisionSurface,
  prime: PrimePolicy,
  uplink: Uplink,
};
