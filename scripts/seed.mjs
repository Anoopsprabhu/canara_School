// Creates the first super admin (only if none exists) and the default fee.
// Run once after `npm run db:push`:  npm run db:seed
// The generated password is written to .superadmin-credentials.txt — sign in,
// change it from "My Account", then delete that file.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { writeFileSync } from "fs";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  await sql`
    insert into settings (key, value) values ('membership_fee', '1000')
    on conflict (key) do nothing`;

  const [existing] = await sql`select username from users where role = 'super_admin' and active limit 1`;
  if (existing) {
    console.log(`A super admin already exists (${existing.username}). Nothing to do.`);
  } else {
    const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
    const letters = "abcdefghjkmnpqrstuvwxyz";
    const password =
      process.env.SUPER_ADMIN_PASSWORD ||
      `canara${randomInt(1000, 10000)}${letters[randomInt(23)]}${letters[randomInt(23)]}`;
    const hash = await bcrypt.hash(password, 10);
    await sql`
      insert into users (name, username, password_hash, role)
      values ('Super Admin', ${username}, ${hash}, 'super_admin')
      on conflict (username) do update
        set password_hash = excluded.password_hash, role = 'super_admin', active = true,
            session_version = users.session_version + 1`;
    writeFileSync(
      ".superadmin-credentials.txt",
      `Canara Membership Portal — super admin\n\nUsername: ${username}\nPassword: ${password}\n\nChange this password after signing in (My Account), then delete this file.\n`
    );
    console.log(`Created super admin "${username}". Password saved to .superadmin-credentials.txt`);
  }
} finally {
  await sql.end();
}
