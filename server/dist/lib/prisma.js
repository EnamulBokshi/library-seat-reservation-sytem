"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = __importDefault(require("pg"));
const adapter_pg_1 = require("@prisma/adapter-pg");
const envVars_1 = require("../config/envVars");
const client_1 = require("../generated/client");
// Create explicit pg.Pool instance with extended connection timeout and keepAlive
// for Neon serverless PostgreSQL connection pooling
const pool = new pg_1.default.Pool({
    connectionString: envVars_1.envVars.DATABASE_URL,
    connectionTimeoutMillis: 20000, // 20 seconds connection timeout
    idleTimeoutMillis: 30000,
    max: 10,
});
pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
