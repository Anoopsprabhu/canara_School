// One-time import of the India Post pincode directory (data.gov.in "All India
// Pincode Directory" CSV) into the pincodes table, for the pincode → location /
// district / state auto-fill on the application form.
//   node --env-file=.env scripts/import-pincodes.mjs <path-to-csv>
// Re-running replaces the table contents.
import fs from "fs";
import readline from "readline";
import postgres from "postgres";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node --env-file=.env scripts/import-pincodes.mjs <path-to-csv>");
  process.exit(1);
}

// Handles quoted fields: "Kodialbail S.O",575003,…
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "," && !inQuote) {
      fields.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

const sql = postgres(process.env.DATABASE_URL, { max: 3, prepare: false });
const BATCH = 2000;

try {
  // Clear first: the reader must not start until it can be consumed, or the
  // lines stream past while this await is pending.
  await sql`truncate pincodes restart identity`;
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath), crlfDelay: Infinity });
  let header = null;
  let batch = [];
  let total = 0;
  for await (const line of rl) {
    const f = parseCsvLine(line);
    if (!header) {
      header = Object.fromEntries(f.map((name, i) => [name.toLowerCase(), i]));
      for (const col of ["officename", "pincode", "officetype", "district", "statename"]) {
        if (!(col in header)) throw new Error(`CSV is missing the "${col}" column`);
      }
      continue;
    }
    const row = {
      pincode: f[header.pincode] ?? "",
      officename: f[header.officename] ?? "",
      officetype: (f[header.officetype] || "BO").slice(0, 5),
      district: f[header.district] ?? "",
      statename: f[header.statename] ?? "",
    };
    if (!/^\d{6}$/.test(row.pincode) || !row.officename || !row.district || !row.statename) continue;
    batch.push(row);
    if (batch.length >= BATCH) {
      await sql`insert into pincodes ${sql(batch, "pincode", "officename", "officetype", "district", "statename")}`;
      total += batch.length;
      process.stdout.write(`\r  Imported ${total.toLocaleString()} post offices…`);
      batch = [];
    }
  }
  if (batch.length) {
    await sql`insert into pincodes ${sql(batch, "pincode", "officename", "officetype", "district", "statename")}`;
    total += batch.length;
  }
  console.log(`\nDone: ${total.toLocaleString()} post offices.`);
} finally {
  await sql.end();
}
