import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock the index.js environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to read the file and eval the extractMeta function since it's not exported
const indexCode = fs.readFileSync(path.join(__dirname, 'src', 'index.js'), 'utf8');
const extractMetaMatch = indexCode.match(/function extractMeta\(html, url\) \{([\s\S]*?)return \{/);

if (!extractMetaMatch) {
    console.error("Failed to find extractMeta function");
    process.exit(1);
}

// Recreate the function
const bodyP1 = extractMetaMatch[1];
const bodyP2 = indexCode.substring(indexCode.indexOf('return {', extractMetaMatch.index));
const functionBody = bodyP1 + bodyP2.substring(0, bodyP2.indexOf('}') + 1);

const extractMeta = new Function('html', 'url', functionBody);


async function testExtraction() {
    console.log("Testing extractMeta with diverse URLs...");

    const testCases = [
        { name: "YouTube Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { name: "GitHub Repo", url: "https://github.com/facebook/react" },
        { name: "News Article", url: "https://www.theverge.com/2024/1/17/24042409/apple-watch-blood-oxygen-ban-sales-resume-appeal-denied" }
    ];

    for (const testCase of testCases) {
        console.log(`\n--- Fetching ${testCase.name}: ${testCase.url} ---`);
        try {
            const res = await fetch(testCase.url, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            const html = await res.text();
            
            const meta = extractMeta(html, testCase.url);
            
            // Clean up output for console
            const displayMeta = { ...meta };
            if (displayMeta.description && displayMeta.description.length > 100) {
                displayMeta.description = displayMeta.description.substring(0, 100) + "...";
            }
            
            console.log(displayMeta);
        } catch (e) {
            console.error(`Failed to fetch or parse ${testCase.name}:`, e.message);
        }
    }
}

testExtraction();
