import express from "express";
import cors from "cors";
import helmet from "helmet";
import { verifyPaymentProof } from "./verifier.js";
import { settlePayment } from "./settler.js";
import { PORT } from "./config.js";
import type { FacilitateRequest, FacilitateResponse } from "./types.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: "mantle",
    chainId: 5000,
    version: "1.0.0",
  });
});

// Services call this to get payment requirements for a resource
app.get("/payment-details", (req, res) => {
  const { resource, skillId, amount, asset } = req.query;

  res.json({
    scheme: "exact",
    network: "eip155:5000",
    maxAmountRequired: amount ?? "1000000",
    resource: resource ?? "",
    description: "LedgerForge x402 payment on Mantle",
    mimeType: "application/json",
    payTo: process.env.OPERATOR_ADDRESS ?? "",
    maxTimeoutSeconds: 60,
    asset: asset ?? process.env.USDC_ADDRESS,
    skillId: parseInt((skillId as string) ?? "0"),
    extra: { name: "LedgerForge", version: "1.0.0" },
  });
});

// Core facilitation endpoint — verify EIP-712 proof, then settle via transferFrom
app.post("/facilitate", async (req, res) => {
  const body = req.body as FacilitateRequest;

  if (!body.paymentDetails || !body.paymentProof) {
    res.status(400).json({
      success: false,
      error: "Missing paymentDetails or paymentProof",
    } as FacilitateResponse);
    return;
  }

  try {
    const { valid, error } = await verifyPaymentProof(
      body.paymentDetails,
      body.paymentProof
    );

    if (!valid) {
      res.status(402).json({ success: false, error } as FacilitateResponse);
      return;
    }

    const txHash = await settlePayment(body.paymentDetails, body.paymentProof);

    console.log(
      `[Facilitator] Settled: ${txHash} | Skill: ${body.paymentDetails.skillId}`
    );

    res.json({
      success: true,
      settlementTxHash: txHash,
      accessToken: `settled:${txHash}:${Date.now()}`,
    } as FacilitateResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Facilitator] Settlement error:", message);
    res.status(500).json({ success: false, error: message } as FacilitateResponse);
  }
});

app.listen(PORT, () => {
  console.log(
    `[Facilitator] LedgerForge x402 facilitator running on port ${PORT}`
  );
  console.log(`[Facilitator] Network: Mantle mainnet (chainId 5000)`);
  console.log(`[Facilitator] Health: http://localhost:${PORT}/health`);
});

export default app;
