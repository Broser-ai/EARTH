import CommandBar from './components/CommandBar';
import { EarthRuntimeProvider, useEarthRuntime } from './sovereign/runtime/EarthRuntimeContext.tsx';
import { RouterProvider, useRouter } from './routing/Router.tsx';
import { PAGE_COMPONENTS } from './routing/pageMap.ts';
import UnknownPage from './pages/UnknownPage';

function Shell() {
  const { runtime, generation } = useEarthRuntime();
  const { match } = useRouter();
  void generation;

  const hitlPending =
    runtime.bus.history().filter((event) => event.type === 'hitl.requested').length -
    runtime.bus.history().filter((event) => event.type === 'hitl.approved').length;

  const page =
    match.kind === 'known' ? PAGE_COMPONENTS[match.route.pageId] : undefined;
  const PageComponent = page;

  return (
    <div className="flex h-screen flex-col bg-space">
      <CommandBar hitlPending={Math.max(0, hitlPending)} runtimeOnline={runtime.isBooted} />
      <main className="flex-1 overflow-y-auto p-6">
        {PageComponent ? (
          <PageComponent />
        ) : (
          <UnknownPage path={match.kind === 'unknown' ? match.path : match.route.path} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <EarthRuntimeProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </EarthRuntimeProvider>
  );
}
