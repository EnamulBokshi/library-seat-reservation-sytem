"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function main() {
    const logPath = "/home/nullpointer/.gemini/antigravity/brain/767a6ce3-7bf1-4750-b5ff-f43055375861/.system_generated/logs/overview.txt";
    const outputPath = path_1.default.resolve(process.cwd(), "spec.md");
    try {
        console.log(`Reading log file from: ${logPath}`);
        const content = fs_1.default.readFileSync(logPath, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
            if (!line.trim())
                continue;
            const parsed = JSON.parse(line);
            if (parsed.type === "USER_INPUT" && parsed.content && parsed.content.includes("Smart Library")) {
                console.log("Found the spec content in logs!");
                fs_1.default.writeFileSync(outputPath, parsed.content, "utf-8");
                console.log(`Successfully wrote spec to: ${outputPath}`);
                return;
            }
        }
        console.log("Spec content not found in logs.");
    }
    catch (error) {
        console.error("Error extracting spec:", error);
    }
}
main();
