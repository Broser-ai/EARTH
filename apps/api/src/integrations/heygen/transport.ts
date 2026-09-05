export interface HeyGenTransport {
  request(
    url: string,
    init?: RequestInit,
  ): Promise<{
    status: number;
    json(): Promise<unknown>;
  }>;
}

/** Reserved `.test` host — never a live HeyGen endpoint. */
export const HEYGEN_HEALTH_URL = 'https://heygen.test/v1/health';

/** Draft-request only. No publish, distribute, or webhook path. */
export const HEYGEN_DRAFT_REQUEST_URL = 'https://heygen.test/v1/video/draft-request';
