import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import CommandBar from '../src/components/CommandBar';
import StatusBadge from '../src/components/StatusBadge';
import { RouterProvider } from '../src/routing/Router.tsx';

function renderAt(path: string) {
  window.history.replaceState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('EARTH SPA smoke', () => {
  it('renders the NASA command bar with DEVELOPMENT/DEMO truth badges', () => {
    renderAt('/');

    expect(screen.getByText('EARTH')).toBeInTheDocument();
    expect(screen.getByText('Hornbach Germany')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPMENT')).toBeInTheDocument();
    expect(screen.getAllByText('DEMO').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'OVERVIEW' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MISSION' })).toBeInTheDocument();
    expect(screen.getByTestId('command-bar-uplink')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('renders CommandBar navigation labels as history links', () => {
    window.history.replaceState({}, '', '/');
    render(
      <RouterProvider>
        <CommandBar />
      </RouterProvider>,
    );

    expect(screen.getByRole('link', { name: 'OPERATIONS' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CARBON' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CARBON & ESG' })).not.toBeInTheDocument();
  });

  it('renders StatusBadge with inferred success styling', () => {
    render(<StatusBadge status="healthy" />);

    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('does not fall back to Overview for an unknown flight path', () => {
    renderAt('/not-a-station');

    expect(screen.getByText('Unknown station')).toBeInTheDocument();
    expect(screen.getByText('/not-a-station')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('renders Material Opportunity Intake at /intake with DEVELOPMENT_ONLY', () => {
    renderAt('/intake');

    expect(screen.getByText('Material Opportunity Intake')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPMENT_ONLY')).toBeInTheDocument();
    expect(screen.getByText(/x-earth-org-id/)).toBeInTheDocument();
  });

  it('renders the /uplink flight-path catalog', () => {
    renderAt('/uplink');

    expect(screen.getByText('CANONICAL FLIGHT PATHS')).toBeInTheDocument();
    expect(screen.getByText('SWARM')).toBeInTheDocument();
    expect(screen.getByText('INTAKE')).toBeInTheDocument();
  });
});
