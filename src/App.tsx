import CommandBar from './components/CommandBar';
import { RouterProvider, useRouter } from './routing/Router.tsx';
import { PAGE_COMPONENTS } from './routing/pageMap.ts';
import UnknownPage from './pages/UnknownPage';

function Shell() {
  const { match } = useRouter();
  const PageComponent = match.kind === 'known' ? PAGE_COMPONENTS[match.route.pageId] : undefined;

  return (
    <div className="flex h-screen flex-col bg-space">
      <CommandBar />
      <main className="flex-1 overflow-y-auto p-6">
        {PageComponent ? (
          <PageComponent />
        ) : (
          <UnknownPage path={match.kind === 'unknown' ? match.path : '/'} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Shell />
    </RouterProvider>
  );
}
