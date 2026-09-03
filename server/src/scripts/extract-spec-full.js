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
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === "USER_INPUT" && parsed.content && parsed.content.includes("Smart Library")) {
                    console.log("Found the spec content in logs!");
                    let cleanContent = parsed.content;
                    if (cleanContent.startsWith("<USER_REQUEST>")) {
                        cleanContent = cleanContent.substring("<USER_REQUEST>".length);
                    }
                    if (cleanContent.endsWith("</USER_REQUEST>")) {
                        cleanContent = cleanContent.substring(0, cleanContent.length - "</USER_REQUEST>".length);
                    }
                    fs.writeFileSync(outputPath, cleanContent.trim(), "utf-8");
                    console.log(`Successfully wrote full spec to: ${outputPath}`);
                    return;
                }
            } catch (e) {
                // ignore JSON parse error for non-JSON lines
            }
        }
        console.log("Spec content not found in logs.");
    } catch (error) {
        console.error("Error extracting spec:", error);
    }
}

main();
