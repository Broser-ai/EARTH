import { useState } from 'react';
import CommandBar from './components/CommandBar';
import type { EarthSection } from './components/CommandBar';
import Sidebar from './components/Sidebar';

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

const SECTION_DEFAULT_PAGE: Record<EarthSection, string> = {
  overview: 'dashboard',
  operations: 'pickup-orders',
  circular: 'reverse-logistics',
  'carbon-esg': 'carbon-accounting',
  compliance: 'compliance-dashboard',
  reports: 'reports',
};

const PAGE_TO_SECTION: Record<string, EarthSection> = {
  'dashboard': 'overview',
  'pickup-orders': 'operations',
  'container-fleet': 'operations',
  'recycler-network': 'operations',
  'route-planner': 'operations',
  'weight-scanning': 'operations',
  'reverse-logistics': 'circular',
  'take-back-programs': 'circular',
  'b2b-marketplace': 'circular',
  'material-exchange': 'circular',
  'product-passports': 'circular',
  'carbon-accounting': 'carbon-esg',
  'emissions-scope': 'carbon-esg',
  'reduction-targets': 'carbon-esg',
  'offset-credits': 'carbon-esg',
  'compliance-dashboard': 'compliance',
  'csrd-disclosure': 'compliance',
  'gri-reporting': 'compliance',
  'eudr-tracking': 'compliance',
  'audit-trail': 'compliance',
  'reports': 'reports',
  'locations': 'reports',
  'users-roles': 'reports',
  'integrations': 'reports',
  'billing': 'reports',
};

const PAGE_COMPONENTS: Record<string, () => React.JSX.Element> = {
  'dashboard': Overview,
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
  'reports': Reports,
  'locations': LocationsSettings,
  'users-roles': UsersRoles,
  'integrations': IntegrationsSettings,
  'billing': BillingSettings,
};

export default function App() {
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

  const PageComponent = PAGE_COMPONENTS[activePage] || Overview;

  return (
    <div className="flex h-screen flex-col bg-space">
      <CommandBar activeSection={activeSection} onNavigate={handleSectionChange} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={handlePageChange} />
        <main className="flex-1 overflow-y-auto p-6">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
