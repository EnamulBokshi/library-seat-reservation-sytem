import prisma from "../lib/prisma";

const ZONE_RULES: Record<string, string[]> = {
    "Silent Zone": [
        "Maintain absolute silence at all times",
        "Mobile phones must be on silent mode",
        "No group discussions or conversations",
        "Use headphones for any audio content",
        "No food or beverages except water bottles",
        "Keep personal belongings in designated spaces",
    ],
    "Group Study Zone": [
        "Discussions must be kept at a reasonable volume",
        "Maximum group size of 6 people per table",
        "Book group tables in advance during peak hours",
        "Clean up the table area after each session",
        "No monopolizing power outlets — share with others",
        "Respect other groups' space and privacy",
    ],
    "Computer Zone": [
        "Do not install unauthorized software on library PCs",
        "Report any hardware issues immediately to staff",
        "Limit sessions to 2 hours during peak times",
        "No downloading or streaming copyrighted content",
        "Log out of all accounts before leaving",
        "Printing is limited to 20 pages per session",
    ],
    "Reading Zone": [
        "Keep noise to an absolute minimum",
        "Return borrowed books and magazines to shelves",
        "No marking or highlighting on library materials",
        "Food and drinks are not permitted in this zone",
        "Handle all reading materials with care",
        "Personal seating cushions and blankets are allowed",
    ],
};

async function seedZoneRules() {
    console.log("🌱 Seeding zone rules...\n");

    for (const [zoneName, rules] of Object.entries(ZONE_RULES)) {
        const zone = await prisma.zone.findUnique({ where: { name: zoneName } });
        if (zone) {
            await prisma.zone.update({
                where: { id: zone.id },
                data: { rules },
            });
            console.log(`  ✅ Updated "${zoneName}" with ${rules.length} rules`);
        } else {
            console.log(`  ⏭️  Zone "${zoneName}" not found — skipping`);
        }
    }

    console.log("\n✨ Zone rules seeded successfully!");
}

seedZoneRules()
    .catch(console.error);

