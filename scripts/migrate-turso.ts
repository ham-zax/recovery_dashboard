import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TOKEN;

  if (!url || (!url.includes('turso.io') && !url.includes('libsql'))) {
    console.error('DATABASE_URL is not set or not a Turso URL');
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _turso_migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const appliedRes = await client.execute('SELECT id FROM _turso_migrations');
    const applied = new Set(appliedRes.rows.map(r => r[0] as string));

    const migrationsDir = path.join(__dirname, '../prisma/migrations');
    const dirs = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
    
    dirs.sort();

    let appliedCount = 0;

    for (const dir of dirs) {
      if (applied.has(dir)) continue;

      const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        
        console.log(`Applying migration: ${dir}`);
        
        for (const stmt of statements) {
          try {
            await client.execute(stmt);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            if (!message.includes('already exists') && !message.includes('duplicate column')) {
              throw e;
            }
          }
        }

        await client.execute({
          sql: 'INSERT INTO _turso_migrations (id) VALUES (?)',
          args: [dir]
        });
        
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      console.log('Database is already up to date!');
    } else {
      console.log(`Successfully applied ${appliedCount} migrations to Turso!`);
    }

  } catch (err) {
    console.error('Error applying migrations:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
