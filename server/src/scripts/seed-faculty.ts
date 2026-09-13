import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import prisma from "../lib/prisma";
dotenv.config();

/**
 * Create one approved faculty account for local testing, so the faculty
 * privileges can be exercised without going through signup and approval.
 */
async function seedFaculty() {
    const email = process.env.SEED_FACULTY_EMAIL || "faculty@library.com";
    const password = process.env.SEED_FACULTY_PASSWORD || "faculty123";
    const name = process.env.SEED_FACULTY_NAME || "Dr. Faculty Member";
    const facultyId = process.env.SEED_FACULTY_ID || "FAC-0001";

    console.log("🌱 Seeding faculty user...");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`  ℹ️  Faculty user already exists: ${email}`);
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const faculty = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            role: "faculty",
            facultyId,
            department: "Computer Science & Engineering",
            designation: "Assistant Professor",
            isActive: true,
            emailVerifiedAt: new Date(),
            approvalStatus: "approved",
            approvedAt: new Date(),
        },
    });

    console.log(`  ✅ Faculty created: ${faculty.email} (${faculty.id})`);
}

seedFaculty()
    .catch((error) => {
        console.error("❌ Faculty seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
