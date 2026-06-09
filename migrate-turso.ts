import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TOKEN;

  if (!url || !url.startsWith('libsql://')) {
    console.error('DATABASE_URL is missing or not a Turso URL.');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  const sqlPath = path.resolve(process.cwd(), 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // libsql executeMultiple splits by ';' automatically
  console.log('Running migration on Turso...');
  await client.executeMultiple(sql);
  console.log('Migration completed successfully!');
}

main().catch(console.error);
