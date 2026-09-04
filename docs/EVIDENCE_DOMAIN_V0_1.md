# Evidence Domain v0.1

Evidence v0.1 stores tenant-scoped metadata and structured assertions in PostgreSQL. It does not upload, fetch, OCR, parse, or store document bytes. `source_uri` is metadata only and is never fetched by the API.

Evidence documents progress only as metadata availability. Evidence records are `INPUT_UNVERIFIED`, `ESTIMATED`, `EVIDENCE_SUBMITTED`, `REVIEWED`, or `REJECTED`; a submitted reference is not proof. `FUTURE_AI_DRAFT` is a reserved extraction method only. No AI extraction exists.

Claims begin as `DRAFT`, may be evidence-linked and submitted for review, and only become `VERIFIED` through a durable human approval with required evidence. Rejected and superseded claims retain history. Corrections create a new claim referencing `supersedes_claim_id`; historical verified/rejected/superseded values must not be rewritten.

Local examples use the DEVELOPMENT-only identity header:

```sh
curl -X POST http://localhost:3001/v1/evidence-documents \
  -H 'content-type: application/json' -H 'x-earth-user-id: 22222222-2222-2222-2222-222222222222' \
  -d '{"originalFilename":"supplier.pdf","sourceType":"SUPPLIER_DECLARATION","storageStatus":"METADATA_ONLY"}'
```

Future NanoChat extraction may create a `FUTURE_AI_DRAFT` record only; it must not verify a document or claim. Non-goals: NanoChat, LLM/RAG, upload/OCR/storage, external reporting, certificates, compliance/tax decisions, blockchain/ZK, and browser persistence.

“An approved EARTH claim is an internally reviewed, evidence-linked application record. It is not by itself a regulatory filing, tax decision, third-party certificate, legal opinion, CSRD assurance conclusion, PPWR determination, or cryptographic proof.”
