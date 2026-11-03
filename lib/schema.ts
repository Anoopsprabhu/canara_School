import { pgTable, serial, text, integer, boolean, timestamp, varchar, index } from "drizzle-orm/pg-core";

// role: 'super_admin' | 'admin' | 'staff' | 'viewer'
// sessionVersion is bumped on revoke / password reset so existing logins stop
// working immediately instead of waiting for the cookie to expire.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  createdBy: integer("created_by"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per life member. membershipNo doubles as the application number and
// the receipt number, matching the paper forms (Application No. = Receipt No.).
// The fee is copied onto the row so a later price change never alters an
// already-issued receipt.
// status: 'pending' | 'active' | 'rejected' | 'cancelled'
// Entries by anyone but the super admin start 'pending' with no number; the
// number is allotted when the super admin approves, so rejected entries never
// leave gaps in the numbering.
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  membershipNo: integer("membership_no").unique(),
  name: text("name").notNull(),
  fatherName: text("father_name").notNull().default(""),
  yearOfPassing: text("year_of_passing").notNull().default(""),
  dob: text("dob").notNull().default(""), // YYYY-MM-DD
  address: text("address").notNull().default(""),
  pincode: text("pincode").notNull().default(""),
  // Filled from the pincode directory (editable); state also holds the
  // country for members living outside India.
  location: text("location").notNull().default(""),
  district: text("district").notNull().default(""),
  state: text("state").notNull().default(""),
  mobile1: text("mobile1").notNull().default(""),
  mobile2: text("mobile2").notNull().default(""),
  email: text("email").notNull().default(""),
  photoKey: text("photo_key").notNull().default(""),
  proofKey: text("proof_key").notNull().default(""),
  applicationDate: text("application_date").notNull().default(""), // YYYY-MM-DD
  place: text("place").notNull().default(""),

  amount: integer("amount").notNull(),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  paymentRef: text("payment_ref").notNull().default(""),
  paymentDate: text("payment_date").notNull().default(""), // YYYY-MM-DD
  bankName: text("bank_name").notNull().default(""),
  receiptDate: text("receipt_date").notNull().default(""), // YYYY-MM-DD
  remarks: text("remarks").notNull().default(""),

  status: text("status").notNull().default("pending"),
  cancelReason: text("cancel_reason").notNull().default(""), // also holds the rejection reason
  createdBy: integer("created_by").references(() => users.id), // "collected by"
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Global key/value config — membership_fee, membership_no_start, etc.
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// India Post pincode directory — imported once from the data.gov.in CSV
// (scripts/import-pincodes.mjs). Several rows per pincode, one per post office.
export const pincodes = pgTable(
  "pincodes",
  {
    id: serial("id").primaryKey(),
    pincode: varchar("pincode", { length: 6 }).notNull(),
    officename: text("officename").notNull(),
    officetype: varchar("officetype", { length: 5 }).notNull().default("BO"),
    district: text("district").notNull(),
    statename: text("statename").notNull(),
  },
  (t) => [index("idx_pincodes_pincode").on(t.pincode)]
);
