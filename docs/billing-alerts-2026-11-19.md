# Billing alert preparation — 19 November 2026, Cairo

The owner requested server-renewal and audio-provider billing alerts, then deferred
the Contabo renewal date and confirmed OpenAI has not been funded. No renewal date,
payment, budget amount or available-credit value has been assumed.

## Contabo

A Codex reminder was created with id `oraliq` and status **PAUSED**. The prepared
schedule is 10:00 in the owner's local timezone, Africa/Cairo, with reminders seven,
three and one day before a confirmed renewal date. It is not active, and no billing
notification has been sent. Its instructions prohibit inventing dates, repeating
the same reminder stage, buying renewals, enabling automatic payments, or treating
a Codex notification as a delivered email.

After the owner supplies the next date from Contabo, record its source, put the
actual date into the reminder instructions, verify the timezone, and activate it.
Do not roll the date to another month without confirming the next renewal. This
reminder is in Codex; the existing SMTP incident monitor is a separate channel.

Contabo also documents provider-side reminder emails before service renewal.
The real next service-renewal date is in its Customer Control Panel. Do not
substitute the monthly invoice creation date or a server installation timestamp.

## OpenAI

No OpenAI account settings have been changed. There is no funded balance or billing
integration to monitor yet, and no OpenAI key was requested or saved for this task.
The current OralIQ ASR provider remains Groq.

Once funded, review organization/project Spend settings with the owner. Proposed
notification stages are 80% and 90% of a confirmed monthly spend budget; its dollar
amount is intentionally unset. These are **spend alerts**, not live remaining-credit
readings. A top-up, other projects, grants or prior usage can make the two differ.
Do not report that a low-balance alert is active based only on this preparation.

Review any hard spend cap separately: it can stop API traffic. The owner has not
authorized automatic top-ups; do not enable them. The prepaid purchase screen may
default auto-reload to on, so review that choice when funding is actually completed.

Prepared state is recorded in `ops/monitor/billing-plan.json`; it is a handoff record,
not configuration consumed by the production incident checker. No server deployment
or new live polling was needed for this preparation.

Official references checked on this date:

- [Contabo renewal reminders and renewal dates](https://help.contabo.com/en/support/solutions/articles/103000269313-what-happens-if-i-miss-a-payment-)
- [OpenAI spend alerts and hard limits](https://developers.openai.com/api/docs/guides/spend-limits)
- [OpenAI prepaid billing and auto-reload](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing)
