import { generateEntitySecret, registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import { readFileSync, writeFileSync } from "fs";

const envFile = ".env";
const recoveryDir = "./recovery";

// Load current .env
const env = readFileSync(envFile, "utf-8");
const apiKey = env.match(/CIRCLE_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("❌ CIRCLE_API_KEY not found in .env");
  process.exit(1);
}

console.log("🔑 Generating new entity secret...");
const entitySecret = generateEntitySecret();
console.log("✅ Entity secret generated");

console.log("📝 Registering with Circle...");
const response = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryDir,
});

const recoveryFile = response.data?.recoveryFile;
if (recoveryFile) {
  console.log(`💾 Recovery file saved to: ${recoveryDir}/${recoveryFile}`);
}

// Update .env
const updated = env.replace(
  /CIRCLE_ENTITY_SECRET=.*/,
  `CIRCLE_ENTITY_SECRET=${entitySecret}`
);
writeFileSync(envFile, updated);
console.log("📄 .env updated with new CIRCLE_ENTITY_SECRET");
console.log("\n⚠️  Restart the backend for the new secret to take effect.");
