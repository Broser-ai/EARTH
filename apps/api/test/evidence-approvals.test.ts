import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { createPool, createTestApp, DEV_ORG, devHeaders, otherHeaders } from './helpers.js';

const reviewerId = '66666666-6666-6666-6666-666666666666';
const reviewerHeaders = { 'x-earth-user-id': reviewerId };

describe('evidence and durable human approvals', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = await createPool();
    await pool.query(`INSERT INTO users (id,organization_id,email,role) VALUES ($1,$2,'dev-reviewer@earth.local','REVIEWER') ON CONFLICT (id) DO NOTHING`, [reviewerId, DEV_ORG]);
    await pool.query(`INSERT INTO organization_memberships (id,organization_id,user_id,role,status) VALUES (gen_random_uuid(),$1,$2,'REVIEWER','ACTIVE') ON CONFLICT (organization_id,user_id) DO UPDATE SET role='REVIEWER',status='ACTIVE'`, [DEV_ORG, reviewerId]);
    app = await createTestApp(pool);
  });

  afterAll(async () => { await app.close(); await pool.end(); });
  beforeEach(async () => { await pool.query('TRUNCATE approval_decisions, approval_requests, claim_evidence, evidence_records, evidence_documents, claims CASCADE'); });

  it('requires evidence and a different authorized reviewer before verifying a claim', async () => {
    const document = await app.inject({ method: 'POST', url: '/v1/evidence-documents', headers: devHeaders, payload: { originalFilename: 'supplier.pdf', sourceType: 'SUPPLIER_DECLARATION', storageStatus: 'METADATA_ONLY' } });
    expect(document.statusCode).toBe(201);
    const record = await app.inject({ method: 'POST', url: '/v1/evidence-records', headers: devHeaders, payload: { documentId: document.json().document.id, fieldName: 'recycled_content_pct', value: 32, unit: 'percent', extractionMethod: 'MANUAL', extractionVersion: 'manual-v0.1', confidence: 0.8 } });
    expect(record.json().record.verificationStatus).toBe('INPUT_UNVERIFIED');
    const storedRecord = await pool.query<{ verification_status: string; organization_id: string }>(
      'SELECT verification_status, organization_id FROM evidence_records WHERE id = $1',
      [record.json().record.id],
    );
    expect(storedRecord.rows[0]?.verification_status).toBe('INPUT_UNVERIFIED');
    expect(storedRecord.rows[0]?.organization_id).toBe(DEV_ORG);
    const evidenceAudit = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM audit_events WHERE organization_id = $1 AND event_type IN ('EVIDENCE_DOCUMENT_CREATED', 'EVIDENCE_RECORD_CREATED')`,
      [DEV_ORG],
    );
    expect(evidenceAudit.rows.map((row) => row.event_type)).toEqual(
      expect.arrayContaining(['EVIDENCE_DOCUMENT_CREATED', 'EVIDENCE_RECORD_CREATED']),
    );
    const claim = await app.inject({ method: 'POST', url: '/v1/claims', headers: devHeaders, payload: { claimType: 'RECYCLED_CONTENT', statement: 'Batch has at least 30 percent recycled content.', value: { recycledContentPct: 32 }, unit: 'percent', confidence: 0.8 } });
    expect(claim.json().claim.status).toBe('DRAFT');
    const claimId = claim.json().claim.id;
    const link = await app.inject({ method: 'POST', url: `/v1/claims/${claimId}/evidence`, headers: devHeaders, payload: { evidenceRecordId: record.json().record.id, relationType: 'SUPPORTS', required: true } });
    expect(link.statusCode).toBe(201);
    const approval = await app.inject({ method: 'POST', url: '/v1/approval-requests', headers: devHeaders, payload: { claimId, requestType: 'CLAIM_VERIFICATION', requiredRoles: ['OWNER', 'REVIEWER'] } });
    expect(approval.json().request.state).toBe('PENDING');
    const self = await app.inject({ method: 'POST', url: `/v1/approval-requests/${approval.json().request.id}/decision`, headers: devHeaders, payload: { decision: 'APPROVED' } });
    expect(self.statusCode).toBe(403);
    expect(self.json().error.code).toBe('APPROVAL_SELF_REVIEW_FORBIDDEN');
    const decided = await app.inject({ method: 'POST', url: `/v1/approval-requests/${approval.json().request.id}/decision`, headers: reviewerHeaders, payload: { decision: 'APPROVED', comment: 'Evidence reviewed.' } });
    expect(decided.statusCode).toBe(200);
    const verified = await app.inject({ method: 'GET', url: `/v1/claims/${claimId}`, headers: reviewerHeaders });
    expect(verified.json().claim.status).toBe('VERIFIED');
    const foreign = await app.inject({ method: 'GET', url: `/v1/claims/${claimId}`, headers: otherHeaders });
    expect(foreign.statusCode).toBe(404);
  });
});