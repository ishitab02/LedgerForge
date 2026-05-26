import cors from "cors";
import express from "express";
import { isAddress } from "viem";
import { loadDb, upsertSkill, type BazaarTier } from "./db.js";
import { fetchSkillFromChain, fetchTotalSkills } from "./handlers.js";

const REGISTRY = process.env.SKILL_REGISTRY_ADDRESS as `0x${string}`;
const PORT = parseInt(process.env.BAZAAR_API_PORT ?? "3002");
const POLL_INTERVAL = 30_000;

const tierOrder: Record<BazaarTier, number> = {
  PRO: 0,
  BASIC: 1,
  FREE: 2,
};

function registryIsConfigured(): boolean {
  return Boolean(REGISTRY && isAddress(REGISTRY));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sync(): Promise<void> {
  if (!registryIsConfigured()) {
    console.warn("[Indexer] SKILL_REGISTRY_ADDRESS not set; skipping chain sync");
    return;
  }

  const db = loadDb();
  const total = await fetchTotalSkills(REGISTRY);

  for (let i = 1; i <= total; i++) {
    const skill = await fetchSkillFromChain(i, REGISTRY);
    if (skill) upsertSkill(db, skill);
    await sleep(100);
  }

  console.log(`[Indexer] Synced ${total} skills at ${new Date().toISOString()}`);
}

void sync();
setInterval(() => {
  void sync();
}, POLL_INTERVAL);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/skills", (req, res) => {
  const db = loadDb();
  const { tier, minScore, search } = req.query;

  let skills = Object.values(db).filter((skill) => skill.active);

  if (tier) {
    skills = skills.filter((skill) => skill.tier === tier);
  }

  if (minScore) {
    skills = skills.filter((skill) => skill.averageScore >= Number(minScore));
  }

  if (search) {
    const q = String(search).toLowerCase();
    skills = skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(q) ||
        skill.metadataURI.toLowerCase().includes(q) ||
        skill.endpoint.toLowerCase().includes(q),
    );
  }

  skills.sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.averageScore - a.averageScore;
  });

  res.json({ skills, total: skills.length });
});

app.get("/skills/:id", (req, res) => {
  const db = loadDb();
  const skill = db[parseInt(req.params.id, 10)];

  if (!skill) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(skill);
});

app.get("/stats", (_req, res) => {
  const db = loadDb();
  const skills = Object.values(db);

  res.json({
    totalSkills: skills.length,
    activeSkills: skills.filter((skill) => skill.active).length,
    proSkills: skills.filter((skill) => skill.tier === "PRO").length,
    totalJobs: skills.reduce((total, skill) => total + skill.totalJobs, 0),
    avgReputationScore:
      skills.length > 0
        ? Math.round(skills.reduce((total, skill) => total + skill.averageScore, 0) / skills.length)
        : 0,
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    registryConfigured: registryIsConfigured(),
  });
});

app.listen(PORT, () => {
  console.log(`[Indexer] Bazaar API running on port ${PORT}`);
});
