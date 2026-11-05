# Canara High School Old Boys' Association — Life Membership Portal

Next.js 16 · Drizzle ORM · Neon Postgres · Neon Object Storage (bucket `canara`) for photos and address proofs.

## What it does

- **New member** — the "Application for Admission as a Life Member" form plus fee payment
  (Cash / Cheque / NEFT / RTGS / G Pay-UPI). "Collected by" is filled in automatically from the login.
  Typing the pincode fills location, district and state from the India Post directory (members abroad can tick
  "Lives outside India" and type the country instead). The school is chosen from Canara High School Main, CBSE
  or Urwa, or typed in under "Others". Required: name, son of, school, year of passing, date of birth,
  address, pincode, location, state, mobile, photo, place and the payment details; e-mail, second mobile and
  address proof are optional.
- **Approval** — entries by admin / staff wait in **Approvals** until the super admin approves them; approving
  allots the next **membership ID** (`001`, `002`, …) and unlocks the receipt. The super admin's own entries are
  approved on save. The membership ID is also the application no. and the receipt no., as on the paper forms.
- **Reports** — collections by receipt date, payment mode, collector and status, with totals and an
  Excel-ready CSV download.
- **Blank forms** — empty application form and receipt for filling in by hand.
- **Print** — the application form (A4) and the "Life Membership Fees Receipt" (member + office copy on one A4).
  Use the browser's *Save as PDF* to keep a copy.
- **Search** — by membership ID (jumps straight to the member), name, father's name, school, mobile, e-mail or transaction no.
- **User access** (super admin) — create logins with a generated username + password, change roles,
  reset passwords, revoke / restore access. Revoking signs the person out immediately.
- **Settings** (super admin) — life membership fee (default ₹1000) and the number to continue numbering from
  (e.g. 227 if paper forms up to 226 were already issued). A fee change never alters issued receipts.

| Role | Can do |
| --- | --- |
| Super Admin | everything: approve / reject, edit, cancel, reports, users, fee, numbering |
| Admin | add members (sent for approval), reports, print |
| Staff | add members (sent for approval), print |
| Viewer | search, view, print |

## Setup

`.env`:

```
DATABASE_URL=postgresql://…
SESSION_SECRET=<long random string>
AWS_ENDPOINT_URL_S3=https://br-….storage.….ap-southeast-1.aws.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=…        # Neon storage credential token_id
AWS_SECRET_ACCESS_KEY=…    # Neon storage credential s3_secret_access_key
AWS_S3_BUCKET=canara
```

Photos are stored in Neon Object Storage (S3-compatible). Get the endpoint from the Neon Console → Storage,
and create a credential with `storage:read` + `storage:write` scopes. Without keys, uploads are stored in
`./.uploads` (local development only).

```
npm install
npm run db:push     # create / update tables
npm run db:seed     # first super admin → .superadmin-credentials.txt
node --env-file=.env scripts/import-pincodes.mjs <all-india-pincode.csv>   # once: pincode → location/state auto-fill
npm run dev
```

Sign in with the credentials in `.superadmin-credentials.txt`, change the password from **My Account**,
then delete that file.

When deploying (e.g. Vercel), add the same environment variables in the project settings.
