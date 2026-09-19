import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.6-flash";
const GEMINI_VISION_MODELS = [...new Set([
  GEMINI_VISION_MODEL,
  ...(process.env.GEMINI_VISION_FALLBACK_MODELS || "gemini-3.5-flash,gemini-3-flash-preview,gemini-flash-latest").split(",").map(model => model.trim()).filter(Boolean)
])].slice(0, 3);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openAI = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const OPENAI_VISION_ENABLED = process.env.OPENAI_VISION_ENABLED !== "false";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    })
  : null;
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const openRouter = OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": "Waste2Worth"
      }
    })
  : null;
const OPENROUTER_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-exp:free";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

// ============================================================================
// WASTE ANALYSIS WITH GEMINI VISION
// ============================================================================

/**
 * Analyze a waste item image using Gemini Vision
 * Returns: item name, condition, estimated value, recommendations
 * @param {Buffer} imageBuffer - Image file buffer
 * @returns {Promise<{item: string, condition: string, estimatedValue: string, recommendation: string[], explanation: string}>}
 */
export async function analyzeWasteItem(imageBuffer, mimeType = "image/jpeg") {
  // Convert buffer to base64
  const base64Image = imageBuffer.toString("base64");

  const prompt = `Identify the main physical product in this image as accurately and specifically as possible. You are analyzing a waste item for a reuse and recycling platform.

First inspect the entire image, then:
1. Identify the object category and likely product name (include brand/model only when visible).
2. Separate the object from background, packaging, labels, and unrelated objects.
3. Use visible shape, parts, text, logo, color, and material as evidence.
4. If the exact brand or model is not readable, name the product generically (for example "stainless steel water bottle", "wireless computer mouse", or "wooden dining chair") instead of returning "Unknown".
5. Only use "Unidentified Item" when the image is blank, severely blurred, or contains no recognizable object.

Please provide your analysis in the following JSON format ONLY (no other text):
{
  "item": "Specific product name, not a generic unknown label",
  "condition": "Brief condition assessment (e.g., 'Good', 'Fair', 'Poor', 'Needs repair')",
  "estimatedValue": "Estimated value in Indian rupees (e.g., '₹500-1200')",
  "recommendation": ["Array", "of", "best", "actions"],
  "explanation": "Brief explanation of why this is the best course of action",
  "material": "Primary material, inferred from visible evidence",
  "confidence": 0.0,
  "canRepair": true/false,
  "canResell": true/false,
  "canDonate": true/false,
  "canRecycle": true/false,
  "canUpcycle": true/false
}

Available actions: Repair, Resell, Donate, Recycle, Upcycle, E-waste, Dispose safely

Be practical and focused on the Indian context. Never invent a brand or model. Return your best evidence-based product category even when the exact identity is uncertain.`;

  let lastError;
  try {
    if (!genAI) throw new Error("Gemini API key is not configured");
    const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });
    for (let attempt = 0; attempt < 1; attempt += 1) {
      try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      },
      prompt
    ]);

    const responseText = result.response.text().trim();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in Gemini response");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    const item = normalizeLabel(analysis.item, "Unidentified Item");
    const material = normalizeLabel(analysis.material, "Unknown");
    const recommendation = normalizeRecommendations(analysis.recommendation);

    if (item === "Unidentified Item" && attempt === 0) {
      continue;
    }

    return {
      item,
      condition: normalizeLabel(analysis.condition, "Needs review"),
      estimatedValue: normalizeLabel(analysis.estimatedValue, "₹100-500"),
      recommendation,
      explanation: normalizeLabel(analysis.explanation, "Review the item before choosing its next use."),
      material,
      confidence: normalizeConfidence(analysis.confidence),
      canRepair: analysis.canRepair ?? false,
      canResell: analysis.canResell ?? false,
      canDonate: analysis.canDonate ?? true,
      canRecycle: analysis.canRecycle ?? true,
      canUpcycle: analysis.canUpcycle ?? false
    };
      } catch (error) {
        lastError = error;
        console.error(`[Gemini Error attempt ${attempt + 1}]`, error.message);
      }
    }
  } catch (error) {
    lastError = error;
  }

  if (openAI) {
    try {
      return await analyzeWithOpenAI(base64Image, mimeType, prompt);
    } catch (error) {
      console.error("[OpenAI Vision Error]", error.message);
      lastError = error;
    }
  }

  if (groq) {
    try {
      return await analyzeWithOpenAICompatibleProvider(
        groq,
        GROQ_VISION_MODEL,
        base64Image,
        mimeType,
        prompt
      );
    } catch (error) {
      console.error("[Groq Vision Error]", error.message);
      lastError = error;
    }
  }

  if (groq && GROQ_TEXT_MODEL) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      });
      const content = response.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content.match(/\[[\s\S]*\]/)?.[0] || content);
      const ideas = normalizeUpcycleIdeas(Array.isArray(parsed) ? parsed : parsed.ideas);
      if (ideas.length) return ideas;
    } catch (error) {
      console.error("[Groq Error - Upcycle]", error.message);
    }
  }

  if (openRouter) {
    try {
      return await analyzeWithOpenAICompatibleProvider(
        openRouter,
        OPENROUTER_VISION_MODEL,
        base64Image,
        mimeType,
        prompt
      );
    } catch (error) {
      console.error("[OpenRouter Vision Error]", error.message);
      lastError = error;
    }
  }

  console.error("[AI Fallback]", lastError?.message || "No AI provider returned a result");
  return {
    item: "Uploaded item",
    condition: "Needs manual review",
    estimatedValue: "Add after identification",
    recommendation: ["Repair", "Resell", "Recycle"],
    explanation: "Automatic image identification is temporarily unavailable. Use the edit fields below to name the item and material before taking action.",
    material: "Material not confirmed",
    confidence: 0,
    canRepair: true,
    canResell: true,
    canDonate: true,
    canRecycle: true,
    canUpcycle: true,
    analysisStatus: "manual-review"
  };
}

async function analyzeWithOpenAI(base64Image, mimeType, prompt) {
  return analyzeWithOpenAICompatibleProvider(openAI, OPENAI_VISION_MODEL, base64Image, mimeType, prompt);
}

async function analyzeWithOpenAICompatibleProvider(client, model, base64Image, mimeType, prompt) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
      ]
    }]
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");
  const analysis = JSON.parse(content);
  const item = normalizeLabel(analysis.item, "Unidentified Item");
  if (item === "Unidentified Item") throw new Error("OpenAI could not identify the item");
  return {
    item,
    condition: normalizeLabel(analysis.condition, "Needs review"),
    estimatedValue: normalizeLabel(analysis.estimatedValue, "₹100-500"),
    recommendation: normalizeRecommendations(analysis.recommendation),
    explanation: normalizeLabel(analysis.explanation, "Review the item before choosing its next use."),
    material: normalizeLabel(analysis.material, "Unknown"),
    confidence: normalizeConfidence(analysis.confidence),
    canRepair: analysis.canRepair ?? false,
    canResell: analysis.canResell ?? false,
    canDonate: analysis.canDonate ?? true,
    canRecycle: analysis.canRecycle ?? true,
    canUpcycle: analysis.canUpcycle ?? false
  };
}

function normalizeLabel(value, fallback) {
  if (typeof value !== "string") return fallback;
  const label = value.trim();
  if (!label || /^(unknown|unknown item|unidentified|unidentified item|n\/a|not sure)$/i.test(label)) {
    return fallback;
  }
  return label.slice(0, 300);
}

function normalizeRecommendations(value) {
  const allowed = new Set(["Repair", "Resell", "Donate", "Recycle", "Upcycle", "E-waste", "Dispose safely"]);
  const recommendations = Array.isArray(value)
    ? value.filter(item => typeof item === "string").map(item => item.trim()).filter(item => allowed.has(item))
    : [];
  return recommendations.length ? recommendations : ["Recycle", "Dispose safely"];
}

function normalizeConfidence(value) {
  const confidence = Number(value);
  return Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null;
}

// ============================================================================
// GENERATE UPCYCLE IDEAS
// ============================================================================

/**
 * Generate upcycle ideas for a specific item using Gemini
 * @param {string} itemName - Name of the item
 * @param {string} material - Material of the item
 * @returns {Promise<string[]>}
 */
export async function generateUpcycleIdeas(itemName, material) {
  const prompt = `Generate 4-5 creative and practical upcycling ideas for a ${itemName} made of ${material}. 
These should be things an average person in India could do at home with minimal additional materials.
Return ONLY a JSON array of objects like:
[{"title":"Window herb planter","purpose":"Grow herbs in a small space","difficulty":"Easy","time":"20 minutes","materials":["clean bottle","soil","seeds"],"steps":["Step one","Step two","Step three"],"safety":"Use scissors carefully."}]
Each object must include title, purpose, difficulty (Easy, Medium, or Advanced), time, materials, steps, and safety.
No other text.`;

  if (genAI) {
    try {
      if (!genAI) throw new Error("Gemini API key is not configured");
      const result = await genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL }).generateContent(prompt);
      return normalizeUpcycleIdeas(JSON.parse(result.response.text().match(/\[[\s\S]*\]/)?.[0] || "[]"));
    } catch (error) {
      console.error("[Gemini Error - Upcycle]", error.message);
    }

  }

  if (openAI) {
    try {
      const response = await openAI.chat.completions.create({
        model: OPENAI_VISION_MODEL,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      });
      const content = response.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || "{}");
      return normalizeUpcycleIdeas(Array.isArray(parsed) ? parsed : parsed.ideas);
    } catch (error) {
      console.error("[OpenAI Error - Upcycle]", error.message);
    }
  }

  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: process.env.OPENROUTER_TEXT_MODEL || OPENROUTER_VISION_MODEL,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      });
      const content = response.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content || "{}");
      return normalizeUpcycleIdeas(Array.isArray(parsed) ? parsed : parsed.ideas);
    } catch (error) {
      console.error("[OpenRouter Error - Upcycle]", error.message);
    }
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!response.ok) throw new Error(`Claude returned HTTP ${response.status}`);
      const payload = await response.json();
      const content = payload.content?.find(part => part.type === "text")?.text || "";
      return normalizeUpcycleIdeas(JSON.parse(content.match(/\[[\s\S]*\]/)?.[0] || "[]"));
    } catch (error) {
      console.error("[Claude Error - Upcycle]", error.message);
    }
  }

  return fallbackUpcycleIdeas(itemName, material);
}

export async function generateUpcycleIdeasFromImage(imageBuffer, mimeType = "image/jpeg") {
  const base64Image = imageBuffer.toString("base64");
  const prompt = `Inspect this image and identify every distinct reusable or upcyclable object or material.
Return ONLY JSON in this shape:
{"items":[{"name":"object name","material":"primary material"}],"ideas":[{"title":"project title","scope":"combined or individual","items":["object names"],"purpose":"useful result","difficulty":"Easy","time":"30 minutes","materials":["materials"],"steps":["step 1","step 2"],"safety":"safety note"}]}
Include ideas that combine multiple objects and ideas for individual objects. Use generic names when details are unclear. Return at most 8 items and 8 ideas.`;
  const providers = [
    ...(genAI ? GEMINI_VISION_MODELS.map(model => ({
      name: `Gemini (${model})`,
      run: async () => (await genAI.getGenerativeModel({ model }).generateContent([{ inlineData: { data: base64Image, mimeType } }, prompt])).response.text()
    })) : []),
    openAI && OPENAI_VISION_ENABLED && { name: "OpenAI", run: async () => (await openAI.chat.completions.create({ model: OPENAI_VISION_MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }] }] })).choices?.[0]?.message?.content },
    groq && GROQ_VISION_MODEL && !/not-available/i.test(GROQ_VISION_MODEL) && { name: "Groq", run: async () => (await groq.chat.completions.create({ model: GROQ_VISION_MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }] }] })).choices?.[0]?.message?.content },
    openRouter && { name: "OpenRouter", run: async () => (await openRouter.chat.completions.create({ model: OPENROUTER_VISION_MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }] }] })).choices?.[0]?.message?.content }
  ].filter(Boolean);
  for (const provider of providers) {
    try {
      const parsed = JSON.parse(String(await provider.run()).match(/\{[\s\S]*\}/)?.[0] || "{}");
      const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 8).map(item => ({ name: normalizeLabel(item?.name, "Reusable item"), material: normalizeLabel(item?.material, "Unknown") })) : [];
      const ideas = normalizeUpcycleIdeas(parsed.ideas).slice(0, 8);
      if (items.length || ideas.length) {
        if (!ideas.length && items.length && groq && GROQ_TEXT_MODEL) {
          const itemSummary = items.map(item => `${item.name} (${item.material})`).join(", ");
          const generated = await generateUpcycleIdeas(itemSummary, "mixed reusable materials");
          return { items, ideas: generated.slice(0, 8).map(idea => ({ ...idea, scope: "combined", items: items.map(item => item.name) })), provider: `${provider.name}+text` };
        }
        return { items, ideas, provider: provider.name };
      }
    } catch (error) {
      console.error(`[${provider.name} Upcycle Image Error]`, error.message);
    }
  }
  try {
    const singleItem = await analyzeWasteItem(imageBuffer, mimeType);
    const item = singleItem?.item;
    const material = singleItem?.material;
    const isUsable = item && !/^unidentified|unknown/i.test(item) && !/animal|living|person|human|pet|kitten|puppy/i.test(`${item} ${material}`);
    if (isUsable) {
      const ideas = await generateUpcycleIdeas(item, material || "mixed material");
      return {
        items: [{ name: item, material: material || "Unknown" }],
        ideas: ideas.slice(0, 8).map(idea => ({ ...idea, scope: "individual", items: [item] })),
        provider: "Gemini single-item fallback"
      };
    }
  } catch (error) {
    console.error("[Single-item upcycle fallback error]", error.message);
  }
  return { items: [], ideas: [], provider: "fallback" };
}

function normalizeUpcycleIdeas(value) {
  if (!Array.isArray(value)) return [];
  return value.map((idea) => ({
    title: normalizeLabel(idea?.title, "Practical reuse idea"),
    purpose: normalizeLabel(idea?.purpose, "Give this item a useful second life."),
    difficulty: ["Easy", "Medium", "Advanced"].includes(idea?.difficulty) ? idea.difficulty : "Easy",
    time: normalizeLabel(idea?.time, "30 minutes"),
    materials: Array.isArray(idea?.materials) ? idea.materials.filter(Boolean).map(String).slice(0, 10) : [],
    steps: Array.isArray(idea?.steps) ? idea.steps.filter(Boolean).map(String).slice(0, 8) : [],
    safety: normalizeLabel(idea?.safety, "Use tools carefully and work in a ventilated area."),
    scope: idea?.scope === "combined" ? "combined" : "individual",
    items: Array.isArray(idea?.items) ? idea.items.filter(Boolean).map(String).slice(0, 8) : []
  })).filter((idea) => idea.title && idea.steps.length);
}

function fallbackUpcycleIdeas(itemName, material) {
  const subject = `${itemName} (${material})`;
  return [
    { title: `Organiser from ${itemName}`, purpose: `Keep small items tidy by reusing this ${subject}.`, difficulty: "Easy", time: "20 minutes", materials: [itemName, "cleaning cloth", "labels"], steps: ["Clean and dry the item.", "Add labels or compartments.", "Use it for small everyday items."], safety: "Remove sharp edges before use." },
    { title: `Decorative display from ${itemName}`, purpose: `Turn the item into a useful decorative piece.`, difficulty: "Easy", time: "30 minutes", materials: [itemName, "paint or fabric", "glue"], steps: ["Clean and prepare the surface.", "Decorate with reclaimed materials.", "Let it dry fully before placing it indoors."], safety: "Use non-toxic materials and adequate ventilation." },
    { title: `Gift-ready reuse project`, purpose: `Make a thoughtful item instead of sending the material to waste.`, difficulty: "Medium", time: "45 minutes", materials: [itemName, "ribbon or paper", "basic craft tools"], steps: ["Choose a practical purpose.", "Finish and decorate the item.", "Check that it is clean, stable, and ready to share."], safety: "Use scissors and adhesives with care." }
  ];
}

// ============================================================================
// ESTIMATE ITEM VALUE
// ============================================================================

/**
 * Get more detailed value estimation for an item
 * @param {string} itemName
 * @param {string} condition
 * @returns {Promise<{minPrice: number, maxPrice: number, marketDemand: string}>}
 */
export async function estimateItemValue(itemName, condition) {
  if (!genAI) throw new Error("Gemini API key is not configured");
  const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });

  const prompt = `Estimate the resale/second-hand market value for a "${condition}" ${itemName} in India.
Return ONLY a JSON object with no other text:
{
  "minPrice": 100,
  "maxPrice": 500,
  "marketDemand": "Medium",
  "notes": "Brief note about pricing"
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[Gemini Error - Valuation]", error.message);
    return {
      minPrice: 100,
      maxPrice: 500,
      marketDemand: "Unknown",
      notes: "Could not estimate value"
    };
  }
}

export default { analyzeWasteItem, generateUpcycleIdeas, estimateItemValue };
