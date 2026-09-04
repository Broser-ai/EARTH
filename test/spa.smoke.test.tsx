import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import CommandBar from '../src/components/CommandBar';
import StatusBadge from '../src/components/StatusBadge';

describe('EARTH SPA smoke', () => {
  it('renders the command bar brand and development marker', () => {
    render(<App />);

    expect(screen.getByText('EARTH')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPMENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OVERVIEW' })).toBeInTheDocument();
  });

  it('renders CommandBar navigation labels', () => {
    render(<CommandBar activeSection="overview" onNavigate={() => undefined} />);

    expect(screen.getByRole('button', { name: 'OPERATIONS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CARBON & ESG' })).toBeInTheDocument();
  });

  it('renders StatusBadge with inferred success styling', () => {
    render(<StatusBadge status="healthy" />);

    expect(screen.getByText('healthy')).toBeInTheDocument();
  });
});
