import { ethers } from "ethers";

export function generateSignMessage(input: string) {
  // Step 1: Build the raw EIP-191 prefixed string
  const prefix = `\x19Ethereum Signed Message:\n${input.length}`;
  const rawEIP191Message = prefix + input;

  // Step 2: Turn that into a Buffer
  const messageBuffer = Buffer.from(rawEIP191Message, "utf8");

  console.log("Raw EIP-191 string:", rawEIP191Message);
  console.log("Buffer:", messageBuffer);
  console.log("Hex:", messageBuffer.toString("hex"));

  return messageBuffer;
}
