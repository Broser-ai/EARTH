import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { snapshotDigest } from './digest.js';
import { canReadEvidence, canWriteEvidence } from './authorization.js';
import { modeEnvelope, modeError } from '../http.js';
import { insertAuditEvent } from '../prime/audit.js';

const confidence = z.number().min(0).max(1).optional();
const documentSchema = z.object({ materialBatchId: z.string().uuid().optional(), originalFilename: z.string().min(1), mediaType: z.string().optional(), sourceType: z.enum(['USER_UPLOAD','ERP_EXPORT','SUPPLIER_DECLARATION','THIRD_PARTY_CERTIFICATE','SENSOR_MEASUREMENT','MANUAL_ENTRY','SYSTEM_GENERATED']), storageStatus: z.enum(['METADATA_ONLY','PENDING_UPLOAD','AVAILABLE','UNAVAILABLE']), contentDigestSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), sourceUri: z.string().optional(), issuedAt: z.string().datetime().optional(), expiresAt: z.string().datetime().optional() });
const recordSchema = z.object({ documentId: z.string().uuid().optional(), materialBatchId: z.string().uuid().optional(), fieldName: z.string().min(1), value: z.unknown(), unit: z.string().optional(), extractionMethod: z.enum(['MANUAL','SYSTEM_RULE','FUTURE_AI_DRAFT','IMPORT']), extractionVersion: z.string().min(1), confidence, sourceLocator: z.string().optional() });
const claimSchema = z.object({ materialBatchId: z.string().uuid().optional(), claimType: z.enum(['MATERIAL_COMPOSITION','RECYCLED_CONTENT','MATERIAL_QUANTITY','EMISSION_ACTIVITY','EMISSION_CALCULATION','CIRCULARITY_OUTCOME','RECYCLER_CAPABILITY','SUPPLIER_DECLARATION','OTHER']), statement: z.string().min(1), value: z.unknown(), unit: z.string().optional(), calculationMethod: z.string().optional(), calculationVersion: z.string().optional(), emissionFactorReference: z.string().optional(), confidence, uncertaintyNote: z.string().optional() });

export function registerEvidenceRoutes(app: FastifyInstance, pool: Pool): void {
  const error = (request: Parameters<FastifyInstance['get']>[1] extends infer T ? never : never, code: string, message: string) => void request;
  app.post('/v1/evidence-documents', async (request, reply) => {
    try { canWriteEvidence(request.earthTenant); } catch { return reply.status(403).send(modeError(request.server.earthAuthMode, 'FORBIDDEN', 'You do not have permission to perform this action.', { correlationId: request.id })); }
    const input = documentSchema.safeParse(request.body); if (!input.success) return reply.status(400).send(modeError(request.server.earthAuthMode, 'VALIDATION_ERROR', 'Invalid evidence document.', { correlationId: request.id }));
    const id = randomUUID(); const value = input.data;
    await pool.query(`INSERT INTO evidence_documents (id,organization_id,material_batch_id,original_filename,media_type,source_type,storage_status,content_digest_sha256,source_uri,issued_at,expires_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id, request.earthTenant.organizationId, value.materialBatchId ?? null, value.originalFilename, value.mediaType ?? null, value.sourceType, value.storageStatus, value.contentDigestSha256 ?? null, value.sourceUri ?? null, value.issuedAt ?? null, value.expiresAt ?? null, request.earthTenant.actorId]);
    await audit(pool, request, 'EVIDENCE_DOCUMENT_CREATED', id, value); return reply.status(201).send(modeEnvelope(request.server.earthAuthMode, { document: { id, ...value }, verificationStatus: 'INPUT_UNVERIFIED', limitation: 'Metadata only; not verified evidence.' }));
  });
  app.post('/v1/evidence-records', async (request, reply) => {
    try { canWriteEvidence(request.earthTenant); } catch { return reply.status(403).send(modeError(request.server.earthAuthMode, 'FORBIDDEN', 'You do not have permission to perform this action.', { correlationId: request.id })); }
    const input = recordSchema.safeParse(request.body); if (!input.success) return reply.status(400).send(modeError(request.server.earthAuthMode, 'VALIDATION_ERROR', 'Invalid evidence record.', { correlationId: request.id }));
    const id=randomUUID(), value=input.data; const status=value.extractionMethod==='FUTURE_AI_DRAFT'?'INPUT_UNVERIFIED':'INPUT_UNVERIFIED';
    await pool.query(`INSERT INTO evidence_records (id,organization_id,document_id,material_batch_id,field_name,value_json,unit,extraction_method,extraction_version,confidence,verification_status,source_locator,created_by) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13)`,[id,request.earthTenant.organizationId,value.documentId??null,value.materialBatchId??null,value.fieldName,JSON.stringify(value.value),value.unit??null,value.extractionMethod,value.extractionVersion,value.confidence??null,status,value.sourceLocator??null,request.earthTenant.actorId]);
    await audit(pool,request,'EVIDENCE_RECORD_CREATED',id,value); return reply.status(201).send(modeEnvelope(request.server.earthAuthMode,{record:{id,...value,verificationStatus:status}}));
  });
  app.post('/v1/claims', async (request, reply) => {
    try { canWriteEvidence(request.earthTenant); } catch { return reply.status(403).send(modeError(request.server.earthAuthMode, 'FORBIDDEN', 'You do not have permission to perform this action.', { correlationId: request.id })); }
    const input=claimSchema.safeParse(request.body); if(!input.success)return reply.status(400).send(modeError(request.server.earthAuthMode,'VALIDATION_ERROR','Invalid claim.',{correlationId:request.id}));
    const id=randomUUID(),value=input.data; await pool.query(`INSERT INTO claims (id,organization_id,material_batch_id,claim_type,statement,value_json,unit,calculation_method,calculation_version,emission_factor_reference,confidence,uncertainty_note,status,created_by) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,'DRAFT',$13)`,[id,request.earthTenant.organizationId,value.materialBatchId??null,value.claimType,value.statement,JSON.stringify(value.value),value.unit??null,value.calculationMethod??null,value.calculationVersion??null,value.emissionFactorReference??null,value.confidence??null,value.uncertaintyNote??null,request.earthTenant.actorId]);
    await audit(pool,request,'CLAIM_CREATED',id,value); return reply.status(201).send(modeEnvelope(request.server.earthAuthMode,{claim:{id,...value,status:'DRAFT'}}));
  });
  app.get('/v1/claims/:claimId', async (request, reply) => { try { canReadEvidence(request.earthTenant); } catch { return reply.status(403).send(modeError(request.server.earthAuthMode,'FORBIDDEN','You do not have permission to perform this action.',{correlationId:request.id})); } const row=await pool.query(`SELECT * FROM claims WHERE id=$1 AND organization_id=$2`,[(request.params as {claimId:string}).claimId,request.earthTenant.organizationId]); if(!row.rows[0])return reply.status(404).send(modeError(request.server.earthAuthMode,'CLAIM_NOT_FOUND','Resource not found.',{correlationId:request.id})); return reply.send(modeEnvelope(request.server.earthAuthMode,{claim:row.rows[0]})); });
}

async function audit(pool: Pool, request: any, eventType: string, resourceId: string, input: unknown): Promise<void> { const client=await pool.connect(); try { await insertAuditEvent(client,{organizationId:request.earthTenant.organizationId,actorType:'USER',actorId:request.earthTenant.actorId,authMode:request.earthTenant.authMode,correlationId:request.earthTenant.correlationId,eventType,input,metadata:{resourceId}}); } finally { client.release(); } }