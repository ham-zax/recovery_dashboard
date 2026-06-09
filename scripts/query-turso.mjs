import { createClient } from '@libsql/client';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TOKEN;
  const client = createClient({ url, authToken });
  const result = await client.execute("PRAGMA table_info(Protocol)");
  console.log(result.rows);
  client.close();
}
main();
