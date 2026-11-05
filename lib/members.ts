import "server-only";
import { isUniqueViolation } from "./db";
import { PAYMENT_MODES, formatMemberNo, todayISO } from "./format";
import { getNextMembershipNo } from "./settings";
import { fileExists } from "./storage";

export type MemberInput = {
  name: string;
  fatherName: string;
  school: string;
  yearOfPassing: string;
  dob: string;
  address: string;
  pincode: string;
  location: string;
  district: string;
  state: string;
  mobile1: string;
  mobile2: string;
  email: string;
  photoKey: string;
  proofKey: string;
  applicationDate: string;
  place: string;
  paymentMode: string;
  paymentRef: string;
  paymentDate: string;
  bankName: string;
  receiptDate: string;
  remarks: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// "+91 94481 21196" → "9448121196"
function mobile(v: unknown): string {
  let d = str(v).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

// Keys must point into the folder /api/upload writes that kind of file to.
function fileKey(v: unknown, folder: "photos" | "address-proofs"): string {
  const k = str(v, 300);
  return k.startsWith(`membership/${folder}/`) && !k.includes("..") ? k : "";
}

export function parseMemberInput(body: Record<string, unknown>): { data: MemberInput } | { error: string } {
  const data: MemberInput = {
    name: str(body.name, 200),
    fatherName: str(body.fatherName, 200),
    school: str(body.school, 200),
    yearOfPassing: str(body.yearOfPassing, 10),
    dob: str(body.dob, 10),
    address: str(body.address, 1000),
    pincode: str(body.pincode, 10).replace(/\s/g, ""),
    location: str(body.location, 200),
    district: str(body.district, 200),
    state: str(body.state, 200),
    mobile1: mobile(body.mobile1),
    mobile2: mobile(body.mobile2),
    email: str(body.email, 200).toLowerCase(),
    photoKey: fileKey(body.photoKey, "photos"),
    proofKey: fileKey(body.proofKey, "address-proofs"),
    applicationDate: str(body.applicationDate, 10) || todayISO(),
    place: str(body.place, 100),
    paymentMode: str(body.paymentMode, 30) || "Cash",
    paymentRef: str(body.paymentRef, 100),
    paymentDate: str(body.paymentDate, 10),
    bankName: str(body.bankName, 200),
    receiptDate: str(body.receiptDate, 10) || todayISO(),
    remarks: str(body.remarks, 500),
  };

  // Members living abroad have no Indian pincode; "state" then holds the country.
  const outsideIndia = body.outsideIndia === true;
  const thisYear = Number(todayISO().slice(0, 4));

  if (!data.name) return { error: "Name of the applicant is required" };
  if (!data.fatherName) return { error: "\"Son of\" (father's name) is required" };
  if (!data.school) return { error: "Choose the school, or type its name under Others" };
  if (!/^\d{4}$/.test(data.yearOfPassing) || +data.yearOfPassing < 1900 || +data.yearOfPassing > thisYear) {
    return { error: "Enter the year of passing (4 digits)" };
  }
  if (!data.dob) return { error: "Date of birth is required" };
  if (data.dob > todayISO()) return { error: "Date of birth can't be in the future" };
  if (!data.address) return { error: "Postal address is required" };
  if (outsideIndia) {
    data.pincode = data.pincode.slice(0, 10);
  } else if (!/^\d{6}$/.test(data.pincode)) {
    return { error: "Enter the 6-digit pincode" };
  }
  if (!data.location) return { error: "Location (town / area) is required" };
  if (!data.state) return { error: outsideIndia ? "Country is required" : "State is required" };
  if (!/^\d{10}$/.test(data.mobile1)) return { error: "Enter a valid 10-digit mobile number" };
  if (data.mobile2 && !/^\d{10}$/.test(data.mobile2)) return { error: "Second mobile number must be 10 digits" };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "Enter a valid e-mail address" };
  if (!data.photoKey) return { error: "Upload the applicant's photograph" };
  if (!data.place) return { error: "Place is required" };
  for (const [label, v] of [
    ["Date of birth", data.dob],
    ["Application date", data.applicationDate],
    ["Payment date", data.paymentDate],
    ["Receipt date", data.receiptDate],
  ] as const) {
    if (v && !ISO_DATE.test(v)) return { error: `${label} is not a valid date` };
  }
  if (!(PAYMENT_MODES as readonly string[]).includes(data.paymentMode)) return { error: "Choose a payment mode" };
  if (data.paymentMode !== "Cash" && !data.paymentRef) {
    return { error: `Enter the ${data.paymentMode === "Cheque" ? "cheque number" : "transaction / UTR number"}` };
  }
  if (data.paymentMode !== "Cash" && !data.paymentDate) {
    return { error: `Enter the ${data.paymentMode === "Cheque" ? "cheque" : "transaction"} date` };
  }
  if (["Cheque", "NEFT", "RTGS"].includes(data.paymentMode) && !data.bankName) return { error: "Enter the bank name" };
  return { data };
}

// Two people saving at the same moment can pick the same next number; the
// unique index rejects the second one and it retries with the next number.
// A fixed number (an old paper form) is tried once.
export async function withMembershipNo<T>(
  save: (membershipNo: number) => Promise<T>,
  fixedNo: number | null = null
): Promise<{ ok: T } | { error: string; status: number }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const membershipNo = fixedNo ?? (await getNextMembershipNo());
    try {
      return { ok: await save(membershipNo) };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      if (fixedNo !== null) {
        return { error: `Membership No. ${formatMemberNo(fixedNo)} is already in use`, status: 409 };
      }
    }
  }
  return { error: "Could not allot a membership number — please try again", status: 503 };
}

// Rejects photo / proof keys that don't match a file actually uploaded.
export async function checkUploads(data: MemberInput): Promise<string | null> {
  if (!(await fileExists(data.photoKey))) return "The photograph didn't upload — please choose it again";
  if (data.proofKey && !(await fileExists(data.proofKey))) return "The address proof didn't upload — please attach it again";
  return null;
}
