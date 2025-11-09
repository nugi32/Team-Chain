import { run } from "hardhat";

export async function verify(address: string, constructorArguments: any[] = [], extraRunArgs: Record<string, any> = {}) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
      ...extraRunArgs,
    });
    console.log("Contract at", address, "verified!");
  } catch (err: any) {
    const msg = (err && err.message) ? err.message.toLowerCase() : '';
    if (msg.includes("already verified")) {
      console.log("Contract at", address, "is already verified!");
    } else {
      console.error("Error verifying contract at", address, ":", err);
      throw err;
    }
  }
}