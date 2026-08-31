// Applies db/init.sql against DATABASE_URL. Only needed if you're not using
// the docker-compose Postgres (that one runs init.sql automatically).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }

  const sql = readFileSync(join(process.cwd(), "db", "init.sql"), "utf-8");
  const pool = new Pool({ connectionString });

  console.log("Applying db/init.sql...");
  try {
    await pool.query(sql);
    console.log("done");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
