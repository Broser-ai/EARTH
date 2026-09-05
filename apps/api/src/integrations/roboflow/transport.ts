/**
 * Injected HTTP port for the Roboflow adapter.
 * Default is null — the adapter must not call global fetch or any network.
 */
export interface RoboflowTransport {
  request(url: string, init: RequestInit): Promise<{
    status: number;
    json(): Promise<unknown>;
  }>;
}

export const ROBOFLOW_HEALTH_URL = 'https://api.roboflow.com/';
export const ROBOFLOW_INFER_URL = 'https://detect.roboflow.com/earth-material-draft/1';
