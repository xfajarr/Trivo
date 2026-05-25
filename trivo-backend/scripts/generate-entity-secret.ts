#!/usr/bin/env node
/**
 * Circle Entity Secret Generator
 * 
 * Generates and registers an entity secret for Circle Developer-Controlled Wallets.
 * 
 * Usage:
 *   1. Set your API key: export CIRCLE_API_KEY="TEST_API_KEY:..."
 *   2. Run: npx tsx scripts/generate-entity-secret.ts
 */

import { generateEntitySecret, registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing CIRCLE_API_KEY environment variable");
  console.log("\n📋 Set your API key:");
  console.log("   export CIRCLE_API_KEY='TEST_API_KEY:...'");
  console.log("\n💡 Get your API key from: https://console.circle.com/");
  process.exit(1);
}

// Recovery file output directory
const RECOVERY_DIR = path.join(process.cwd(), "recovery");

async function main() {
  console.log("🔐 Circle Entity Secret Generator");
  console.log("================================\n");

  // Step 1: Generate entity secret (captured from stdout)
  console.log("📌 Step 1: Generating entity secret...");
  
  const output = execSync("node -e \"require('@circle-fin/developer-controlled-wallets').generateEntitySecret()\"", {
    encoding: "utf8",
  });

  // Parse entity secret from output
  const match = output.match(/ENTITY SECRET:\s*([a-f0-9]+)/i);
  if (!match) {
    console.error("❌ Could not parse entity secret from output");
    console.log("Raw output:", output);
    process.exit(1);
  }

  const entitySecret = match[1];
  console.log("✅ Entity secret generated!");
  console.log(`   Value: ${entitySecret.substring(0, 20)}...`);

  // Save to .env.local for convenience
  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  
  if (envContent.includes("CIRCLE_ENTITY_SECRET")) {
    envContent = envContent.replace(/CIRCLE_ENTITY_SECRET=.*/g, `CIRCLE_ENTITY_SECRET=${entitySecret}`);
  } else {
    envContent = envContent.trim() + `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`   💾 Saved to .env.local`);

  // Step 2: Register entity secret
  console.log("\n📌 Step 2: Registering entity secret with Circle...");

  // Create recovery directory if it doesn't exist
  if (!fs.existsSync(RECOVERY_DIR)) {
    fs.mkdirSync(RECOVERY_DIR, { recursive: true });
  }

  try {
    const response = await registerEntitySecretCiphertext({
      apiKey: API_KEY,
      entitySecret: entitySecret,
      recoveryFileDownloadPath: RECOVERY_DIR,
    });

    console.log("✅ Entity secret registered successfully!");
    console.log(`\n📁 Recovery file saved to: ${RECOVERY_DIR}`);
    
    if (response.data?.recoveryFile) {
      console.log(`   Recovery File ID: ${response.data.recoveryFile.id}`);
      console.log(`   Created At: ${response.data.recoveryFile.createdAt}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Setup complete!");
    console.log("=".repeat(50));
    console.log("\n📋 Next steps:");
    console.log("   1. Store your entity secret securely (see below)");
    console.log("   2. Backup your recovery file to a safe location");
    console.log("   3. Add variables to your .env:");
    console.log(`      CIRCLE_API_KEY=${API_KEY.substring(0, 20)}...`);
    console.log(`      CIRCLE_ENTITY_SECRET=${entitySecret.substring(0, 20)}...`);
    
    console.log("\n⚠️  IMPORTANT - Security Reminders:");
    console.log("   • Never commit .env or entity secrets to git");
    console.log("   • Store entity secret in a secrets manager (AWS Secrets, HashiCorp Vault, etc.)");
    console.log("   • Backup recovery file to a separate, secure location");
    console.log("   • Circle cannot recover your entity secret if lost");
    
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown } };
    console.error("❌ Registration failed:", err.message);
    if (err.response?.data) {
      console.error("   Details:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
