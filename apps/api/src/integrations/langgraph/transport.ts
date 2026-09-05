export interface LangGraphTransport {
  request(
    url: string,
    init?: { method?: string; headers?: Record<string, string> },
  ): Promise<{ status: number; json: () => Promise<unknown> }>;
}
