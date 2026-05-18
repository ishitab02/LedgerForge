import express from "express";
import cors from "cors";
import helmet from "helmet";

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

app.listen(port, () => {
  console.log(`facilitator listening on ${port}`);
});

export default app;
