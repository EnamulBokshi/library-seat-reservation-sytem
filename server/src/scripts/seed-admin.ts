import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import prisma from "../lib/prisma";
dotenv.config();


async function seedAdmin() {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@library.com";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123";
    const adminName = process.env.SUPER_ADMIN_NAME || "System Admin";

    console.log("🌱 Seeding admin user...");

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
        console.log(`  ℹ️  Admin user already exists: ${adminEmail}`);
        return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
        data: {
            name: adminName,
            email: adminEmail,
            passwordHash,
            role: "admin",
        },
    });

    console.log(`  ✅ Admin created: ${admin.email} (${admin.id})`);
}

async function seedZones() {
    console.log("🌱 Seeding zones...");

    const zones = [
        { name: "Silent Zone", description: "Quiet study area — no talking allowed", color: "#4F46E5" },
        { name: "Group Study Zone", description: "Collaborative work and group discussions", color: "#059669" },
        { name: "Computer Zone", description: "Desktops and charging stations available", color: "#D97706" },
        { name: "Reading Zone", description: "Casual reading with comfortable seating", color: "#DC2626" },
    ];

    for (const zone of zones) {
        const existing = await prisma.zone.findUnique({ where: { name: zone.name } });
        if (existing) {
            console.log(`  ℹ️  Zone already exists: ${zone.name}`);
            continue;
        }

        const created = await prisma.zone.create({ data: zone });
        console.log(`  ✅ Zone created: ${created.name} (${created.id})`);
    }
}

async function seedSeats() {
    console.log("🌱 Seeding seats...");

    const zones = await prisma.zone.findMany();
    for (const zone of zones) {
        const existingSeats = await prisma.seat.count({ where: { zoneId: zone.id } });
        if (existingSeats > 0) {
            console.log(`  ℹ️  Seats already exist for zone: ${zone.name} (${existingSeats} seats)`);
            continue;
        }

        // Create 10 seats per zone (A-01 through A-10)
        const seats = Array.from({ length: 10 }, (_, i) => ({
            seatNumber: `A-${String(i + 1).padStart(2, "0")}`,
            zoneId: zone.id,
        }));

        await prisma.seat.createMany({ data: seats });
        console.log(`  ✅ Created ${seats.length} seats for zone: ${zone.name}`);
    }
}

async function seedSchedules() {
    console.log("🌱 Seeding schedule slots (today + 7 days)...");

    const slots: Array<"morning" | "noon" | "afternoon" | "evening"> = ["morning", "noon", "afternoon", "evening"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let created = 0;
    let skipped = 0;

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset);

        for (const slot of slots) {
            const existing = await prisma.schedule.findUnique({
                where: { date_slot: { date, slot } },
            });

            if (existing) {
                skipped++;
                continue;
            }

            await prisma.schedule.create({
                data: { date, slot, isOpen: true },
            });
            created++;
        }
    }

    console.log(`  ✅ Schedules: ${created} created, ${skipped} already existed`);
}

async function seedSettings() {
    console.log("🌱 Seeding system settings...");
    await prisma.setting.upsert({
        where: { key: "CHECKIN_GRACE_PERIOD_MINUTES" },
        update: {},
        create: {
            key: "CHECKIN_GRACE_PERIOD_MINUTES",
            value: "15",
            description: "Check-in grace period in minutes before auto-cancellation",
        },
    });
    console.log("  ✅ Setting 'CHECKIN_GRACE_PERIOD_MINUTES' set to 15");
}

async function main() {
    console.log("═══════════════════════════════════════");
    console.log("  Smart Library — Database Seed");
    console.log("═══════════════════════════════════════\n");

    try {
        await seedAdmin();
        await seedZones();
        await seedSeats();
        await seedSchedules();
        await seedSettings();

        console.log("\n✅ Seeding complete!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
main();

