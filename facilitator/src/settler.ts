import {
  getOperatorWalletClient,
  publicClient,
  SKILL_REGISTRY_ADDRESS,
  FACILITATOR_FEE_BPS,
} from "./config.js";
import type { X402PaymentDetails, X402PaymentProof } from "./types.js";
import { usedNonces } from "./verifier.js";

const TRANSFER_FROM_ABI = [
  {
    name: "transferFrom",
    type: "function",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const SKILL_REGISTRY_ABI = [
  {
    name: "recordJobCompletion",
    type: "function",
    inputs: [
      { name: "skillId", type: "uint256" },
      { name: "reputationScore", type: "uint8" },
    ],
    outputs: [],
  },
] as const;

export async function settlePayment(
  details: X402PaymentDetails,
  proof: X402PaymentProof
): Promise<`0x${string}`> {
  const walletClient = getOperatorWalletClient();
  const auth = proof.payload.authorization;

  const totalAmount = BigInt(auth.amount);
  const fee = (totalAmount * BigInt(FACILITATOR_FEE_BPS)) / 10000n;
  const providerAmount = totalAmount - fee;

  const txHash = await walletClient.writeContract({
    address: auth.token,
    abi: TRANSFER_FROM_ABI,
    functionName: "transferFrom",
    args: [auth.from, auth.to as `0x${string}`, providerAmount],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const nonceKey = `${auth.from.toLowerCase()}:${auth.nonce}`;
  usedNonces.set(nonceKey, Number(auth.validBefore));
  console.log(
    `[Facilitator] Nonce ${auth.nonce} for ${auth.from.slice(0, 8)}... marked used`
  );

  if (fee > 0n) {
    const feeTxHash = await walletClient.writeContract({
      address: auth.token,
      abi: TRANSFER_FROM_ABI,
      functionName: "transferFrom",
      args: [auth.from, walletClient.account.address, fee],
    });
    await publicClient.waitForTransactionReceipt({ hash: feeTxHash });
  }

  const signedSkillId = auth.skillId;
  if (SKILL_REGISTRY_ADDRESS && signedSkillId) {
    const score =
      proof.reputationScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(proof.reputationScore)))
        : 75;
    try {
      const repTx = await walletClient.writeContract({
        address: SKILL_REGISTRY_ADDRESS,
        abi: SKILL_REGISTRY_ABI,
        functionName: "recordJobCompletion",
        args: [BigInt(signedSkillId), score],
      });
      await publicClient.waitForTransactionReceipt({ hash: repTx });
      console.log(
        `[Facilitator] Reputation: skill ${signedSkillId} scored ${score}/100`
      );
    } catch (err) {
      console.warn("[Facilitator] Reputation write failed (non-blocking):", err);
    }
  }

  return txHash;
}
