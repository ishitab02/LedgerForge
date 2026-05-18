import express from "express";
import cors from "cors";
import helmet from "helmet";
import { verifyPaymentProof } from "./verifier.js";
import type { FacilitateRequest, FacilitateResponse } from "./types.js";

const app = express();
const port = Number(process.env.FACILITATOR_PORT ?? 3001);

app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: "mantle",
    chainId: 5000,
  });
});

app.get("/payment-details", (req, res) => {
  const { resource, skillId, amount, asset } = req.query;

  res.json({
    scheme: "exact",
    network: "eip155:5000",
    resource: resource ?? "",
    skillId: Number(skillId ?? 0),
    amount: amount ?? "1000000",
    asset: asset ?? process.env.USDC_ADDRESS ?? "",
  });
});

app.post("/facilitate", async (req, res) => {
  const body = req.body as FacilitateRequest;

  if (!body.paymentDetails || !body.paymentProof) {
    res.status(400).json({
      success: false,
      error: "Missing paymentDetails or paymentProof",
    } as FacilitateResponse);
    return;
  }

  const { valid, error } = await verifyPaymentProof(
    body.paymentDetails,
    body.paymentProof
  );

  if (!valid) {
    res.status(402).json({ success: false, error } as FacilitateResponse);
    return;
  }

  res.json({
    success: true,
    settlementTxHash: "0xpending",
    accessToken: `preview:${Date.now()}`,
  } as FacilitateResponse);
});

app.listen(port, () => {
  console.log(`facilitator listening on ${port}`);
});

export default app;
