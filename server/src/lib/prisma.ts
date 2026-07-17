import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg";
import { envVars } from "../config/envVars";
import { PrismaClient } from "../generated/client";
const connectionString = envVars.DATABASE_URL;

const adapter = new PrismaPg({
    connectionString,
})

const prisma = new PrismaClient({ adapter });

export default prisma;