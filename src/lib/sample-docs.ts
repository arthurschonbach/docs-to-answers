// Sample corpus, bundled in code so it works everywhere — including
// hosts with a read-only filesystem (Vercel), where data/*.md files
// wouldn't be deployed. This is the single source of truth; the eval
// set in data/eval-set.json is graded against this exact text (keywords,
// dashes, accents), so edit both together.
export interface SampleDoc {
  name: string;
  text: string;
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    name: "policies.md",
    text: `# Acme Studio - Customer Policies

## Refund policy

We offer a 30-day money-back guarantee on all plans. To request a refund,
email support@acme.example with your invoice number. Refunds are issued to
the original payment method within 5 business days.

Subscriptions can be cancelled at any time from the billing page. Cancelling
stops future charges but does not automatically refund the current period -
request that separately if you are within the 30-day window.

## Shipping

Physical orders ship within 2 business days from our Lyon warehouse.
Delivery takes 3–5 business days in France and 7–12 days internationally.
Shipping is free for orders over €50, otherwise a flat €4.90 applies.

## Support hours

Our support team answers Monday to Friday, 9:00–18:00 CET. Average first
response time is under 4 hours on business days.`,
  },
  {
    name: "handbook.md",
    text: `# Acme Studio - Employee Handbook (excerpt)

## Onboarding

New joiners get a buddy for their first two weeks. Day one covers accounts,
hardware, and a tour of the codebase. By the end of week one, every newcomer
ships a small first task to production.

## Remote work

The team is remote-first. Core collaboration hours are 10:00–15:00 CET.
Meetings need an agenda shared at least 24 hours in advance, otherwise anyone
can decline without explanation.

## Time off

Everyone gets 30 days of paid time off per year, plus local public holidays.
Request leave in the HR tool at least one week ahead for absences longer than
two days. Unused days do not roll over to the next year.`,
  },
];
