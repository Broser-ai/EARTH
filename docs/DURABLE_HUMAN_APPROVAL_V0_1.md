# Durable Human Approval v0.1

Approval requests are durable PostgreSQL records for one claim or one workflow session. A request captures server-generated SHA-256 digests of canonical claim and linked-evidence snapshots. The digest prevents accidentally approving content that changed after review began; it is not blockchain, a legal signature, a Merkle proof, or cryptographic certification.

Only a `PENDING`, non-expired request can be decided. The decision compares current snapshots with the captured values and fails with `APPROVAL_SNAPSHOT_STALE` if evidence or claim data changed. Decisions are immutable and store actor ID, auth mode, correlation ID, comment, and snapshot digests.

OWNER and ESG_LEAD can request and decide. OPERATIONS can request but cannot decide. REVIEWER can decide only when explicitly included in `required_roles`. VIEWER is read-only. Request creators and claim creators cannot decide their own claim review. An approved `CLAIM_VERIFICATION` request sets a claim to `VERIFIED` only when required evidence links exist; a rejection sets it to `REJECTED` while retaining history.

Create an approval request after linking evidence:

```sh
curl -X POST http://localhost:3001/v1/approval-requests \
  -H 'content-type: application/json' -H 'x-earth-user-id: 22222222-2222-2222-2222-222222222222' \
  -d '{"claimId":"<claim-id>","requestType":"CLAIM_VERIFICATION","requiredRoles":["REVIEWER"]}'
```

No approval endpoint creates a CSRD, PPWR, tax, certificate, or legal compliance decision. DEVELOPMENT headers remain local-only and are not production authentication.

“An approved EARTH claim is an internally reviewed, evidence-linked application record. It is not by itself a regulatory filing, tax decision, third-party certificate, legal opinion, CSRD assurance conclusion, PPWR determination, or cryptographic proof.”
