import express from "express";
import { analyzeWasteItem, generateUpcycleIdeas } from "../gemini.js";
import { saveAnalysis, updateAnalysis, uploadImage } from "../db.js";
import { parseFiniteNumber, requireText } from "../utils/validation.js";

const router = express.Router();

router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseFiniteNumber(req.params.id, { name: "id", min: 1, max: Number.MAX_SAFE_INTEGER });
    const item = requireText(req.body?.item, "item", { maxLength: 200 });
    const material = requireText(req.body?.material, "material", { maxLength: 120 });
    const analysis = await updateAnalysis(id, undefined, {
      item_name: item,
      material
    });

    if (!analysis) {
      return res.status(404).json({ success: false, error: "Analysis not found" });
    }

    res.json({
      success: true,
      data: analysis,
      message: "Analysis labels updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/analyze
// Upload image and get AI analysis
// ============================================================================

router.post("/", async (req, res, next) => {
  try {
    // Use multer middleware to handle file
    req.uploadSingle(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ success: false, error: "No image provided" });
        }

        const userId = null;
        const analysis = await analyzeWasteItem(req.file.buffer, req.file.mimetype);
        const { url: imageUrl, path: storagePath } = await uploadImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        let upcycleIdeas = [];
        if (analysis.canUpcycle) {
          upcycleIdeas = await generateUpcycleIdeas(analysis.item, analysis.material);
        }

        const saved = await saveAnalysis({
          user_id: userId,
          item_name: analysis.item,
          condition: analysis.condition,
          estimated_value: analysis.estimatedValue,
          material: analysis.material,
          recommendation: analysis.recommendation.join(", "),
          image_url: imageUrl,
          storage_path: storagePath,
          gemini_response: analysis
        });

        return res.json({
          success: true,
          data: {
            id: saved?.id,
            ...analysis,
            imageUrl,
            upcycleIdeas,
            analyzedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        return next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/analyze/batch
// Analyze multiple preset items (for demo/testing)
// ============================================================================

router.post("/batch", async (req, res, next) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Provide array of items" });
    }

    const results = [];

    for (const item of items.slice(0, 5)) { // Limit to 5 for demo
      if (!item || typeof item !== "object" || typeof item.imageBase64 !== "string" ||
          !item.imageBase64.trim() || item.imageBase64.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: "Each item needs a valid imageBase64 value" });
      }
      const imageBuffer = Buffer.from(item.imageBase64, "base64");
      if (imageBuffer.length === 0) {
        return res.status(400).json({ success: false, error: "Each item needs non-empty image data" });
      }
      const analysis = await analyzeWasteItem(imageBuffer);
      results.push({
        item: typeof item.name === "string" ? item.name.slice(0, 200) : "Unknown Item",
        analysis
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
