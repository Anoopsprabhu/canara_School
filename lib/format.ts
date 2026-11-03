// Shared by server and client code.

export const PAYMENT_MODES = ["Cash", "Cheque", "NEFT", "RTGS", "G Pay / UPI"] as const;

// Membership IDs print as at least three digits: 8 → "008", 226 → "226".
// Entries awaiting approval have no number yet.
export function formatMemberNo(n: number | null | undefined): string {
  return n == null ? "—" : String(n).padStart(3, "0");
}

// Upper bounds keep values inside the database's integer columns.
export const MAX_MEMBERSHIP_NO = 999_999;
export const MAX_AMOUNT = 10_00_000;

export function isValidMembershipNo(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_MEMBERSHIP_NO;
}

export function isValidAmount(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= MAX_AMOUNT;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending approval",
  active: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_BADGES: Record<string, string> = {
  pending: "badge-amber",
  active: "badge-green",
  rejected: "badge-red",
  cancelled: "badge-red",
};

// "2022-09-06" → "06/09/2022"
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

// Timestamps (entered, approved, last sign-in) in the same dd/mm/yyyy style, IST.
export function formatDateTime(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  });
}

export function todayISO(): string {
  // Dates are entered in India; build the YYYY-MM-DD from IST, not UTC.
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function ageFrom(dobISO: string, onISO?: string): number | null {
  const dob = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobISO);
  if (!dob) return null;
  const on = onISO && /^\d{4}-\d{2}-\d{2}$/.test(onISO) ? onISO : todayISO();
  const [y, m, d] = on.split("-").map(Number);
  let age = y - Number(dob[1]);
  if (m < Number(dob[2]) || (m === Number(dob[2]) && d < Number(dob[3]))) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function formatRupees(n: number): string {
  return n.toLocaleString("en-IN");
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? ONES[h] + " Hundred" : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

// Indian numbering: 1,50,000 → "One Lakh Fifty Thousand Only"
export function amountInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(belowThousand(crore) + " Crore");
  if (lakh) parts.push(belowHundred(lakh) + " Lakh");
  if (thousand) parts.push(belowHundred(thousand) + " Thousand");
  if (n) parts.push(belowThousand(n));
  return parts.join(" ") + " Only";
}

// "Kodialbail, Dakshina Kannada, Karnataka – 575003"
export function formatPlace(m: { location: string; district: string; state: string; pincode: string }): string {
  // Skip the district when it just repeats the town ("Mangalore, Mangalore").
  const parts = [m.location, m.district !== m.location ? m.district : "", m.state].filter(Boolean).join(", ");
  return [parts, m.pincode].filter(Boolean).join(" – ");
}

// One of the two authorised signatories set up in Settings. Active ones are
// printed on the application form and the receipt.
export type Signature = { name: string; title: string; imageKey: string; active: boolean };
