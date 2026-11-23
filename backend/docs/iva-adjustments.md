# Additional IVA after registration payment

## Deployment

1. Back up the target database through the normal operational process.
2. Run `backend/sql/07-iva-adjustment.sql` once, before starting the new backend.
   It adds one nullable JSON column to `registrations`; existing payments and totals
   are not changed. Do not rely on Sequelize startup sync for this migration.
3. Deploy backend and rebuild/deploy frontend. No environment changes are needed.

## Administrative workflow

Open Participants > Review payment for the paid registration. In Review summary,
select **Preview additional IVA**, review the original base and 19% charge, provide
a reason, and select **Confirm additional IVA charge** with the participant's agreement.
Preview does not write anything. Confirmation records the charge but does not
automatically charge a card, generate a checkout, or send an email.

The participant signs in and opens Payments. The balance now contains only the
additional IVA. They can generate a new Cobru checkout or a bank transfer and upload
its receipt. Cobru reconciliation or administrative transfer approval settles the
balance through the existing payment flow.

For an originally paid USD 350 registration:

- Original payments remain USD 350, approved, with their original tax flags.
- Original base is fixed at USD 350; additional IVA is USD 66.50.
- New registration total is USD 416.50; new outstanding balance is USD 66.50.
- The subsequent payment records `includesTax = true`, `taxAmount = amountUsd` and
  `providerResponseJson.purpose = 'iva_adjustment'`, plus the adjustment UUID.
- COP uses the latest stored eligible exchange rate when creating the new payment;
  Cobru amounts are rounded to integer COP before persistence and submission.

## Eligibility and safeguards

Only administrators can preview or confirm. The registration must have a positive
stored total, zero pending balance and approved payments exactly covering that
total. Existing IVA, an existing adjustment, coupons or any active pending payment
block the operation. Reconcile payments already paid in Cobru; expire or cancel
unused payments by their normal workflow before continuing. Coupon cases require
an accounting decision on the taxable base and are deliberately not automated.

The adjustment lives on the registration row in `iva_adjustment`, with UUID, base,
rate, amount, total, original payment IDs, administrator, timestamp and reason.
Confirmation locks that registration row and writes the charge and audit record in
one transaction. Repeat confirmations return 409. Confirmation also checks the
previewed amounts against fresh server-side amounts. A failed transaction rolls
back both the charge and audit; no payment is changed during confirmation.

Recalculation uses the stored adjustment snapshot, even after tariffs expire or
change, and subtracts approved payments. It does not add IVA twice or rewrite old
paper charges. Pricing options and paper additions/removals are locked after the
adjustment; personal information can still be edited. Disabling IVA and using
coupons to pay this charge are blocked. If an original payment is subsequently
refunded, new IVA payment creation is blocked for accounting review.

The charge has no self-service reversal or editing endpoint. A mistaken confirmed
charge needs an audited accounting correction; do not delete payments or toggle
`requires_invoice` in SQL to undo it.

## Endpoints (authenticated administrators only)

- `POST /api/registrations/:id/iva-adjustment/preview`
- `POST /api/registrations/:id/iva-adjustment`
  with `{ "expectedBaseAmount": 350, "expectedTaxAmount": 66.5, "reason": "Participant requested invoice" }`.

Verification: `node --test test/iva-adjustment.test.js` plus pricing, registration
editing, coupon and payment tests. These use simulated persistence/HTTP; production
Cobru charges and real MySQL concurrency are not exercised by this suite. Perform
a staging flow after the migration before using this in production.
