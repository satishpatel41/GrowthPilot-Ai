import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

/** Creates the first Super Admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. Safe to re-run. */
async function main() {
  try { process.loadEnvFile('.env'); } catch { /* env may come from the shell */ }
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 10 characters)');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 12));
  const r = await pool.query(
    `INSERT INTO users(email, name, password_hash, role, email_verified) VALUES ($1,'Super Admin',$2,'SUPER_ADMIN',true)
     ON CONFLICT (email) DO NOTHING RETURNING id`, [email.toLowerCase(), hash]);
  console.log(r.rowCount ? `Created Super Admin ${email}` : `Super Admin ${email} already exists`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
