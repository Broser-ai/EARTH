import { describe, expect, it, vi } from 'vitest';
import { PAGE_COMPONENTS } from './pageMap.ts';
import { routeByPath } from './catalog.ts';
import { formatCanonical } from './resolve.ts';
import {
  activateUplink,
  COMMAND_BAR_UPLINK,
  UPLINK_HINT,
  UPLINK_LABEL,
  UPLINK_PATH,
} from './uplinkControl.ts';

describe('UPLINK command-bar control', () => {
  it('is a labeled command-bar station at /uplink', () => {
    expect(COMMAND_BAR_UPLINK.placement).toBe('command-bar');
    expect(COMMAND_BAR_UPLINK.label).toBe('UPLINK');
    expect(COMMAND_BAR_UPLINK.path).toBe('/uplink');
    expect(UPLINK_LABEL).toBe('UPLINK');
    expect(UPLINK_PATH).toBe('/uplink');
    expect(UPLINK_HINT).toBe('/uplink');
  });

  it('opens the overlay and navigates to /uplink from home', () => {
    const navigate = vi.fn();
    const setOverlayOpen = vi.fn();
    activateUplink({ path: '/', navigate, setOverlayOpen });
    expect(setOverlayOpen).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledWith('/uplink');
  });

  it('opens the overlay without re-navigating when already on /uplink', () => {
    const navigate = vi.fn();
    const setOverlayOpen = vi.fn();
    activateUplink({ path: '/uplink', navigate, setOverlayOpen });
    expect(setOverlayOpen).toHaveBeenCalledWith(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('/uplink route', () => {
  it('is a known catalog station with a page component', () => {
    const route = routeByPath('/uplink');
    expect(route).toBeDefined();
    expect(route?.pageId).toBe('uplink');
    expect(route?.callsign).toBe('UPLINK');
    expect(route?.band).toBe('UPLINK');
    expect(route?.section).toBeNull();
    expect(PAGE_COMPONENTS.uplink).toBeTypeOf('function');
  });

  it('formats as origin + path on port 5180', () => {
    expect(formatCanonical('http://localhost:5180', '/uplink')).toBe(
      'http://localhost:5180/uplink',
    );
  });
});
