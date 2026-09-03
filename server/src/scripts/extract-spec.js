const fs = require("fs");
const path = require("path");

async function main() {
    const logPath = "/home/nullpointer/.gemini/antigravity/brain/767a6ce3-7bf1-4750-b5ff-f43055375861/.system_generated/logs/overview.txt";
    const outputPath = path.resolve(process.cwd(), "spec.md");

    try {
        console.log(`Reading log file from: ${logPath}`);
        if (!fs.existsSync(logPath)) {
            console.error(`Log file does not exist at: ${logPath}`);
            return;
        }
        const content = fs.readFileSync(logPath, "utf-8");
        const lines = content.split("\n");

        for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = JSON.parse(line);
            if (parsed.type === "USER_INPUT" && parsed.content && parsed.content.includes("Smart Library")) {
                console.log("Found the spec content in logs!");
                // Extract clean text (strip the <USER_REQUEST> tags if present)
                let cleanContent = parsed.content;
                if (cleanContent.startsWith("<USER_REQUEST>")) {
                    cleanContent = cleanContent.replace("<USER_REQUEST>\n", "").replace("\n</USER_REQUEST>", "");
                }
                fs.writeFileSync(outputPath, cleanContent, "utf-8");
                console.log(`Successfully wrote spec to: ${outputPath}`);
                return;
            }
        }
        console.log("Spec content not found in logs.");
    } catch (error) {
        console.error("Error extracting spec:", error);
    }
}

main();
