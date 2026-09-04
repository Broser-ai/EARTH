import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_START_BODY,
  DEVELOPMENT_HEADERS,
  DEVELOPMENT_ONLY,
  DEV_ORG_ID,
  DEV_USER_ID,
  startBodySchema,
  startMaterialOpportunity,
} from './client.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Material Opportunity Intake client', () => {
  it('keeps curl field names character-for-character', () => {
    expect(Object.keys(DEFAULT_START_BODY).sort()).toEqual(
      ['baseline', 'dataClassification', 'evidence', 'idempotencyKey', 'materialBatch'].sort(),
    );
    expect(Object.keys(DEFAULT_START_BODY.materialBatch).sort()).toEqual(
      ['availableFrom', 'externalReference', 'facilityName', 'materialClass', 'quantityKg'].sort(),
    );
    expect(Object.keys(DEFAULT_START_BODY.baseline).sort()).toEqual(['co2eKg', 'disposalCostDkk'].sort());
    expect(Object.keys(DEFAULT_START_BODY.evidence).sort()).toEqual(
      ['documentIds', 'extractionRequested'].sort(),
    );
    expect(DEFAULT_START_BODY).toEqual({
      idempotencyKey: 'demo-hdpe-2026-001',
      materialBatch: {
        externalReference: 'BATCH-2026-001',
        materialClass: 'HDPE_OFFCUTS',
        quantityKg: 15200,
        facilityName: 'Demo Factory Aarhus',
        availableFrom: '2026-09-03T12:00:00.000Z',
      },
      baseline: {
        disposalCostDkk: 38400,
        co2eKg: 4800,
      },
      evidence: {
        documentIds: [],
        extractionRequested: false,
      },
      dataClassification: 'CONFIDENTIAL',
    });
    expect(startBodySchema.parse(DEFAULT_START_BODY)).toEqual(DEFAULT_START_BODY);
  });

  it('sends x-earth-* DEVELOPMENT headers on start', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      text: async () =>
        JSON.stringify({
          mode: DEVELOPMENT_ONLY,
          session: {
            id: 'sess-1',
            state: 'RUNNING',
            workflowType: 'MATERIAL_OPPORTUNITY_INTAKE',
            workflowVersion: '0.1',
            reasonCodes: ['EVIDENCE_MISSING'],
          },
          tasks: [],
          nextRecommendedAction: 'UPLOAD_EVIDENCE',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await startMaterialOpportunity(DEFAULT_START_BODY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/v1/material-opportunities/start');
    expect(init.method).toBe('POST');
    const headers = init.headers as typeof DEVELOPMENT_HEADERS;
    expect(headers['x-earth-org-id']).toBe(DEV_ORG_ID);
    expect(headers['x-earth-user-id']).toBe(DEV_USER_ID);
    expect(headers['x-earth-user-role']).toBe('OWNER');
    expect(JSON.parse(String(init.body))).toEqual(DEFAULT_START_BODY);
  });
});
