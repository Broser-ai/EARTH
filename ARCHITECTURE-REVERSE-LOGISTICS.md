# EARTH Reverse Logistics Architecture

## System Topology

API-first, event-driven, microservices architecture. High-volume ingestion layer decoupled from downstream destination loops.

```
                        [ TRADERS / CONSUMERS / ENTERPRISES ]
                                        │
                                        ▼
                       [ HTTPS / TLS 1.3 Ingress Gateway ]
                                        │
                                        ▼
                   [ Global Multi-Tenant Routing Microservice ]
                                        │
         ┌──────────────────────────────┴──────────────────────────────┐
         ▼                                                             ▼
[ Event Broker: Kafka / RabbitMQ ]                       [ Multi-Tenant Core DB ]
         │                                                 • SQL: Auth & Metadata
         │                                                 • NoSQL: Dynamic Attributes
         │                                                 • Cache: Redis Bid Engine
         ▼
[ Intelligent Rules Engine ]
         │
         ├─────────────────────────────┐
         ▼                             ▼
[ LOOP A: OEM Take-Back Engine ]  [ LOOP B: B2B Wholesale Marketplace ]
         │                             │
         ├─► Electronics Module        ├─► Lot Aggregation Engine
         ├─► Automotive Core Module    ├─► Multi-Attribute Auction Service
         └─► Textile/Apparel Module    └─► Private Whitelisting Gateway
         │                             │
         ▼                             ▼
  [ Downstream APIs ]           [ Buyer Dispersal ]
  (SAP, Oracle, ERPs)            (3PL / Bulk Pickup Systems)
```

## Multi-Tenant Data Layer

Hybrid storage with Row-Level Security (RLS):
- Every table has `tenant_id` column
- Core routing = relational schemas
- Industry-specific item details = JSONB/NoSQL blocks

## Core Operational Functions

### Function 1: Unified Cross-Industry Intake API
Accepts data from any edge device (mobile, ERP, scanner). Normalizes payload with structural baseline + dynamic industry attributes in JSONB.

### Function 2: Intelligent Routing Rules Engine
Evaluates items against tenant-defined criteria:
1. Check if valid `oem_takeback_contract` is active for detected SKU
2. Evaluate physical condition rating against minimum OEM threshold
3. Verify core value offset exceeds cross-dock logistics cost
4. Route to LOOP_A_OEM or LOOP_B_B2B_MARKETPLACE

### Function 3: Loop A — OEM Take-Back & Core Ledger
- Dual-entry ledger: debit OEM structural material account, credit originating supplier
- ERP Webhook Broadcaster: notifies SAP/Oracle/NetSuite of incoming reproduction stock

### Function 4: Loop B — B2B Wholesale & Auction
- **Dynamic Lot Builder**: auto-bundles items at critical mass (pallet footprint / 500kg threshold)
- **Auction Types**:
  - Sealed-Bid/Blind: one hidden bid, highest wins (industrial scrap, raw commodities)
  - Vickrey (Second-Price): highest wins, pays second-highest (bulk electronics, fluctuating value)
  - Dutch (Declining Reserve): price drops 5%/hour until locked (high-velocity warehouse clearance)

## Data Flow Matrix

| Seq | Layer | System | Trigger | Result |
|-----|-------|--------|---------|--------|
| 101 | Edge Ingestion | Intake API | Barcode/Serial scan | Record in inventory cache |
| 102 | Processing | Rules Engine | State: Unvetted_Intake | Routed to OEM or B2B queue |
| 103A | Loop A | Core Ledger | Route: OEM_Takeback | Credit issued, manifests to OEM |
| 103B | Loop B | Lot Aggregation | Route: B2B_Queue | Items indexed into auction lots |
| 104 | Settlement | Auction Engine | Auction expiry/Buy-it-now | Invoice + 3PL pickup triggered |
