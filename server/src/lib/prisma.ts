import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { envVars } from "../config/envVars";
import { PrismaClient } from "../generated/client";

const adapter = new PrismaPg({
  connectionString: envVars.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;