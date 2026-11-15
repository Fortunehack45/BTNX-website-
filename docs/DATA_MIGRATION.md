# BTNX Historical Order & Identity Data Migration Guide

## 1. Overview & Objective

Prior to this architectural hardening, customer orders were in some cases created without storing a canonical Firebase Authentication `userId` (or referencing historical emails without explicit UID bindings).

The migration script located at [scripts/migrate-order-ownership.ts](file:///c:/Users/USER%20PC/Desktop/BTNX/scripts/migrate-order-ownership.ts) safely reconciles orphaned or unassigned orders by matching verified customer email addresses to their canonical Firebase UID in the `users` collection.

---

## 2. Execution Modes

The script supports three distinct operational modes:

### Mode 1: Dry-Run Simulation (Default)
Inspects all order records, compares against user profiles, and outputs the proposed reconciliation plan without modifying any records in Firestore.

```bash
npx tsx scripts/migrate-order-ownership.ts --dry-run
```

### Mode 2: Apply Migration
Commits reconciliations to Firestore by setting the canonical `userId` and timestamping `ownershipReconciledAt`. Before modifying data, it automatically writes a JSON rollback journal to `scripts/migration-rollback-<timestamp>.json`.

```bash
npx tsx scripts/migrate-order-ownership.ts --apply
```

### Mode 3: Rollback
Reads an existing rollback journal file and restores the previous `userId` values for every modified order.

```bash
npx tsx scripts/migrate-order-ownership.ts --rollback scripts/migration-rollback-<timestamp>.json
```

---

## 3. Safety Guarantees

1. **Exact Email Matching:** The script matches `customerEmail` or `userEmail` strictly against indexed user records in `users/{uid}`. If an email belongs to multiple accounts or cannot be resolved, the order is left untouched and flagged for human review.
2. **Audit Trail:** Every updated order receives an `ownershipReconciledAt` ISO timestamp documenting when the record was canonically bound.
3. **Rollback Journaling:** A full snapshot of original values (`orderId`, `previousUserId`, `newUserId`) is generated locally prior to write operations.
