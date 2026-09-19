import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

const providerFields = {
  gemini: ["GEMINI_API_KEY", "GEMINI_VISION_MODEL"],
  openai: ["OPENAI_API_KEY", "OPENAI_VISION_MODEL"],
  groq: ["GROQ_API_KEY", "GROQ_VISION_MODEL"],
  openrouter: ["OPENROUTER_API_KEY", "OPENROUTER_VISION_MODEL", "OPENROUTER_TEXT_MODEL", "OPENROUTER_SITE_URL"],
  claude: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"],
  supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
  server: ["FRONTEND_URL", "PORT", "ADMIN_PASSWORD"]
};

function requireAdmin(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const suppliedPassword = req.get("x-admin-password") || req.body?.adminPassword;
  if (!configuredPassword) {
    return res.status(503).json({ success: false, code: "ADMIN_NOT_CONFIGURED", error: "Set ADMIN_PASSWORD in Backend/.env before using admin settings." });
  }
  if (!suppliedPassword || suppliedPassword !== configuredPassword) {
    return res.status(401).json({ success: false, code: "ADMIN_UNAUTHORIZED", error: "Invalid admin password." });
  }
  next();
}

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}${"*".repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).filter(line => line && !line.startsWith("#")).map(line => {
    const index = line.indexOf("=");
    return index < 0 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
  }));
}

function serializeEnv(values) {
  return `${Object.entries(values).filter(([, value]) => value !== "").map(([key, value]) => `${key}=${String(value).replace(/\r?\n/g, "")}`).join("\n")}\n`;
}

router.get("/providers", requireAdmin, async (req, res, next) => {
  try {
    const values = parseEnv(await fs.readFile(envPath, "utf8").catch(() => ""));
    const configured = Object.fromEntries(Object.entries(providerFields).map(([provider, fields]) => [
      provider,
      fields.reduce((result, field) => ({ ...result, [field]: field.endsWith("KEY") ? mask(values[field]) : values[field] || "" }), {})
    ]));
    res.json({ success: true, data: configured, restartRequired: true });
  } catch (error) {
    next(error);
  }
});

router.put("/providers/:provider", requireAdmin, async (req, res, next) => {
  try {
    const fields = providerFields[req.params.provider];
    if (!fields) return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Unknown provider." });
    const existing = parseEnv(await fs.readFile(envPath, "utf8").catch(() => ""));
    fields.forEach(field => {
      if (typeof req.body?.[field] === "string" && !req.body[field].includes("*")) existing[field] = req.body[field].trim();
    });
    if (typeof req.body?.clear === "boolean" && req.body.clear) fields.forEach(field => { delete existing[field]; });
    await fs.writeFile(envPath, serializeEnv(existing), "utf8");
    res.json({ success: true, message: `${req.params.provider} settings saved. Restart the backend to apply changes.`, restartRequired: true });
  } catch (error) {
    next(error);
  }
});

export default router;
