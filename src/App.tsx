import { useState, type JSX } from 'react';
import CommandBar from './components/CommandBar';
import { SECTION_PAGES, type EarthSection } from './components/CommandBar';
import { EarthRuntimeProvider, useEarthRuntime } from './sovereign/runtime/EarthRuntimeContext.tsx';

import Overview from './pages/Overview';
import PickupOrders from './pages/PickupOrders';
import ContainerFleet from './pages/ContainerFleet';
import RecyclerNetwork from './pages/RecyclerNetwork';
import RoutePlanner from './pages/RoutePlanner';
import WeightScanning from './pages/WeightScanning';
import ReverseLogistics from './pages/ReverseLogistics';
import TakeBackPrograms from './pages/TakeBackPrograms';
import B2BMarketplace from './pages/B2BMarketplace';
import MaterialExchange from './pages/MaterialExchange';
import ProductPassports from './pages/ProductPassports';
import CarbonAccounting from './pages/CarbonAccounting';
import EmissionsScope from './pages/EmissionsScope';
import ReductionTargets from './pages/ReductionTargets';
import OffsetCredits from './pages/OffsetCredits';
import ComplianceDashboard from './pages/ComplianceDashboard';
import CSRDDisclosure from './pages/CSRDDisclosure';
import GRIReporting from './pages/GRIReporting';
import EUDRTracking from './pages/EUDRTracking';
import AuditTrail from './pages/AuditTrail';
import Reports from './pages/Reports';
import LocationsSettings from './pages/LocationsSettings';
import UsersRoles from './pages/UsersRoles';
import IntegrationsSettings from './pages/IntegrationsSettings';
import BillingSettings from './pages/BillingSettings';
import CommandCenter from './pages/CommandCenter';
import DevSwarm from './pages/DevSwarm';
import AegisProtocol from './pages/AegisProtocol';
import WarGame from './pages/WarGame';
import UnknownPage from './pages/UnknownPage';

const SECTION_DEFAULT_PAGE: Record<EarthSection, string> = {
  overview: 'dashboard',
  operations: 'pickup-orders',
  circular: 'reverse-logistics',
  'carbon-esg': 'carbon-accounting',
  compliance: 'compliance-dashboard',
  reports: 'reports',
  mission: 'command-center',
};

const PAGE_TO_SECTION: Record<string, EarthSection> = Object.fromEntries(
  (Object.entries(SECTION_PAGES) as [EarthSection, { id: string }[]][]).flatMap(([section, pages]) =>
    pages.map((page) => [page.id, section]),
  ),
) as Record<string, EarthSection>;

const PAGE_COMPONENTS: Record<string, () => JSX.Element> = {
  dashboard: Overview,
  'pickup-orders': PickupOrders,
  'container-fleet': ContainerFleet,
  'recycler-network': RecyclerNetwork,
  'route-planner': RoutePlanner,
  'weight-scanning': WeightScanning,
  'reverse-logistics': ReverseLogistics,
  'take-back-programs': TakeBackPrograms,
  'b2b-marketplace': B2BMarketplace,
  'material-exchange': MaterialExchange,
  'product-passports': ProductPassports,
  'carbon-accounting': CarbonAccounting,
  'emissions-scope': EmissionsScope,
  'reduction-targets': ReductionTargets,
  'offset-credits': OffsetCredits,
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
};

function Shell() {
  const { runtime, generation } = useEarthRuntime();
  const [activeSection, setActiveSection] = useState<EarthSection>('overview');
  const [activePage, setActivePage] = useState('dashboard');

  const handleSectionChange = (section: EarthSection) => {
    setActiveSection(section);
    setActivePage(SECTION_DEFAULT_PAGE[section]);
  };

  const handlePageChange = (page: string) => {
    setActivePage(page);
    const section = PAGE_TO_SECTION[page];
    if (section) setActiveSection(section);
  };

  const PageComponent = PAGE_COMPONENTS[activePage];
  const hitlPending = runtime.bus
    .history()
    .filter((event) => event.type === 'hitl.requested').length
    - runtime.bus.history().filter((event) => event.type === 'hitl.approved').length;

  void generation;

  return (
    <div className="flex h-screen flex-col bg-space">
      <CommandBar
        activeSection={activeSection}
        activePage={activePage}
        onSection={handleSectionChange}
        onPage={handlePageChange}
        hitlPending={Math.max(0, hitlPending)}
        runtimeOnline={runtime.isBooted}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {PageComponent ? <PageComponent /> : <UnknownPage pageId={activePage} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <EarthRuntimeProvider>
      <Shell />
    </EarthRuntimeProvider>
  );
}
