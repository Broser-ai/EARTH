export const UPLINK_PATH = '/uplink' as const;
export const UPLINK_LABEL = 'UPLINK' as const;
export const UPLINK_HINT = '/uplink';

export const COMMAND_BAR_UPLINK = {
  label: UPLINK_LABEL,
  path: UPLINK_PATH,
  hint: UPLINK_HINT,
  placement: 'command-bar',
} as const;

export function activateUplink(input: {
  path: string;
  navigate: (next: string) => void;
  setOverlayOpen: (open: boolean) => void;
}): void {
  input.setOverlayOpen(true);
  if (input.path !== UPLINK_PATH) {
    input.navigate(UPLINK_PATH);
  }
}
