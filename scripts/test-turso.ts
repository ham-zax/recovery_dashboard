import { createClient } from "@libsql/client";
const db = createClient({
  url: "libsql://recovery-dashboard-hamzax.aws-ap-south-1.turso.io",
  authToken: process.env.TOKEN
});
async function main() {
  const result = await db.execute("SELECT COUNT(*) as count FROM Protocol;");
  console.log("Protocol count:", result.rows[0].count);
}
main().catch(console.error);
