import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const db = createClient({
  url: "libsql://recovery-dashboard-hamzax.aws-ap-south-1.turso.io",
  authToken: process.env.TOKEN
});

async function main() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const dirs = fs.readdirSync(migrationsDir).filter(d => fs.statSync(path.join(migrationsDir, d)).isDirectory());
  
  // Sort migrations chronologically
  dirs.sort();

  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    if (fs.existsSync(sqlPath)) {
      console.log(`Applying migration ${dir}...`);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      
      // Split statements since libsql might not support multiple statements in execute()
      // But batch() supports an array of statements
      const statements = sql
        .replace(/--.*$/gm, '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      try {
        await db.batch(statements, "write");
      } catch (e) {
        console.log(`Skipping or failed on ${dir} (might already be applied):`, (e as Error).message);
      }
    }
  }
  
  console.log("Done.");
}

main().catch(console.error);
