#!/usr/bin/env node
/**
 * Circle Entity Secret Generator & Registrar
 * 
 * Usage: node scripts/register-entity-secret.mjs
 * 
 * Generates a 32-byte hex secret, fetches Circle's public key,
 * encrypts with RSA-OAEP (SHA-256), and outputs the ciphertext
 * to register at https://console.circle.com/wallets/dev/configurator
 */

import { randomBytes } from "node:crypto";
import { publicEncrypt, constants } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const env = readFileSync(envPath, "utf-8");
const apiKey = env.match(/CIRCLE_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("❌ CIRCLE_API_KEY not found in .env");
  process.exit(1);
}

console.log("══════════════════════════════════════════");
console.log("  Circle Entity Secret Registration");
console.log("══════════════════════════════════════════\n");

// Step 1: Generate 32-byte hex secret
const entitySecret = randomBytes(32).toString("hex");
console.log("🔑 Entity Secret (hex):");
console.log(`   ${entitySecret}\n`);

// Step 2: Fetch public key
console.log("📡 Fetching entity public key...");
const pkRes = await fetch("https://api.circle.com/v1/w3s/config/entity/publicKey", {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const pkData = await pkRes.json();
const publicKey = pkData.data?.publicKey;

if (!publicKey) {
  console.error("❌ Failed to get public key:", JSON.stringify(pkData, null, 2));
  process.exit(1);
}
console.log("✅ Public key obtained\n");

// Step 3: Encrypt with RSA-OAEP (SHA-256)
console.log("🔐 Encrypting with RSA-OAEP...");
const encrypted = publicEncrypt(
  {
    key: publicKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  Buffer.from(entitySecret, "hex"),
);
const ciphertext = encrypted.toString("base64");
console.log("✅ Encrypted\n");

// Step 4: Update .env
const updated = env.replace(
  /CIRCLE_ENTITY_SECRET=.*/,
  `CIRCLE_ENTITY_SECRET=${entitySecret}`,
);
writeFileSync(envPath, updated);
console.log("📄 .env updated with new entity secret\n");

// Step 5: Output ciphertext for manual registration
console.log("══════════════════════════════════════════");
console.log("  COPY THIS CIPHERTEXT:");
console.log("══════════════════════════════════════════\n");
console.log(ciphertext);
console.log("\n══════════════════════════════════════════");
console.log("  STEPS TO COMPLETE:");
console.log("══════════════════════════════════════════");
console.log("1. Go to: https://console.circle.com/wallets/dev/configurator");
console.log("2. Paste the ciphertext above");
console.log('3. Click "Register"');
console.log("4. Restart the backend (pnpm run dev)");
console.log("══════════════════════════════════════════\n");
