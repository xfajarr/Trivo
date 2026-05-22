import { generateEntitySecret, registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

async function main() {
  console.log("🔑 Generating entity secret...\n");
  generateEntitySecret();

  console.log("\n📝 Enter the ENTITY SECRET printed above:");
  const secret = process.env.CIRCLE_ENTITY_SECRET;
  if (!secret) {
    console.log("\n❌ CIRCLE_ENTITY_SECRET not set.");
    console.log("Copy the secret printed above and set it:");
    console.log("  export CIRCLE_ENTITY_SECRET=0x...");
    console.log("  npx tsx scripts/register-entity-secret.ts");
    return;
  }

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.log("❌ CIRCLE_API_KEY not set.");
    return;
  }

  console.log("📝 Registering entity secret with Circle...\n");
  try {
    const response = await registerEntitySecretCiphertext({
      apiKey,
      entitySecret: secret,
      recoveryFileDownloadPath: "./recovery",
    });
    console.log("✅ Entity secret registered!");
    console.log("Recovery file saved to: ./recovery");
  } catch (err: any) {
    console.error("❌ Registration failed:", err.message || err);
  }
}

main().catch(console.error);
