import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { envVars } from "../config/envVars";
import { PrismaClient } from "../generated/client";

// Create explicit pg.Pool instance with extended connection timeout and keepAlive
// for Neon serverless PostgreSQL connection pooling
const pool = new pg.Pool({
  connectionString: envVars.DATABASE_URL,
  connectionTimeoutMillis: 20000, // 20 seconds connection timeout
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;