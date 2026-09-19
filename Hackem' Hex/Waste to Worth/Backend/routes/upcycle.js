import express from "express";
import { getUpcycleIdeas } from "../db.js";
import { generateUpcycleIdeas, generateUpcycleIdeasFromImage } from "../gemini.js";
import { parseFiniteNumber, requireText } from "../utils/validation.js";

const router = express.Router();

// ============================================================================
// POST /api/upcycle/generate
// Generate new upcycle ideas using Gemini
// ============================================================================

router.post("/generate", async (req, res, next) => {
  try {
    const { itemName, material, quantity = 5 } = req.body || {};
    if (!itemName || !material) return res.status(400).json({ success: false, error: "Missing required fields: itemName, material" });
    const safeItemName = requireText(itemName, "itemName", { maxLength: 200 });
    const safeMaterial = requireText(material, "material", { maxLength: 100 });
    const safeQuantity = parseFiniteNumber(quantity, { name: "quantity", min: 1, max: 10 });
    if (!Number.isInteger(safeQuantity)) return res.status(400).json({ success: false, error: "quantity must be an integer" });
    const ideas = await generateUpcycleIdeas(safeItemName, safeMaterial);
    res.json({ success: true, data: { itemName: safeItemName, material: safeMaterial, ideas: ideas.slice(0, safeQuantity) } });
  } catch (error) { next(error); }
});

router.post("/generate-from-image", async (req, res, next) => {
  try {
    req.uploadSingle(req, res, async error => {
      if (error) return next(error);
      if (!req.file) return res.status(400).json({ success: false, error: "Upload an image first." });
      const data = await generateUpcycleIdeasFromImage(req.file.buffer, req.file.mimetype);
      if (!data.items.length && !data.ideas.length) {
        return res.status(503).json({
          success: false,
          code: "AI_UNAVAILABLE",
          error: "No vision provider returned usable results. Check the configured AI provider and model."
        });
      }
      res.json({ success: true, data });
    });
  } catch (error) { next(error); }
});

// ============================================================================
// GET /api/upcycle/categories
// Get all item categories with upcycle ideas
// ============================================================================

router.get("/", async (req, res, next) => {
  try {
    // Common categories with upcycling potential
    const categories = [
      "Plastic Bottle",
      "Wooden Chair",
      "Used Clothes",
      "Old Books",
      "Glass Jar",
      "Metal Cans",
      "Wooden Pallet",
      "Old Tires",
      "Cardboard Box",
      "Cork",
      "Denim Jeans",
      "T-shirt"
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/upcycle/popular
// Get most popular upcycle ideas
// ============================================================================

router.get("/popular", async (req, res, next) => {
  try {
    // Return popular upcycling projects
    const popular = [
      {
        id: 1,
        idea: "Planter from Plastic Bottle",
        item: "Plastic Bottle",
        difficulty: "Easy",
        views: 1245
      },
      {
        id: 2,
        idea: "Storage from Wooden Crate",
        item: "Wooden Box",
        difficulty: "Easy",
        views: 987
      },
      {
        id: 3,
        idea: "Tote Bag from Old T-shirt",
        item: "Old T-shirt",
        difficulty: "Medium",
        views: 856
      },
      {
        id: 4,
        idea: "Wall Art from Cork",
        item: "Cork",
        difficulty: "Easy",
        views: 723
      },
      {
        id: 5,
        idea: "Bird Feeder from Plastic Bottle",
        item: "Plastic Bottle",
        difficulty: "Easy",
        views: 654
      }
    ];

    res.json({
      success: true,
      data: popular
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/upcycle/tutorial/:ideaId
// Get detailed tutorial for an upcycle idea
// ============================================================================

router.get("/tutorial/:ideaId", async (req, res, next) => {
  try {
    const { ideaId } = req.params;

    // Mock tutorial data
    const tutorial = {
      id: ideaId,
      title: "How to Make a Planter from a Plastic Bottle",
      difficulty: "Easy",
      timeRequired: "15 minutes",
      materialsNeeded: [
        "1 plastic bottle",
        "Soil",
        "Seeds or small plant",
        "Scissors or knife"
      ],
      steps: [
        "Cut the plastic bottle in half",
        "Make drainage holes at the bottom",
        "Fill with soil",
        "Plant your seeds or transplant a small plant",
        "Water and place in sunlight"
      ],
      tips: [
        "Use recycled soil for better sustainability",
        "Paint or decorate the bottle for aesthetics",
        "Ensure proper drainage to prevent root rot"
      ],
      ecoImpact: {
        wasteReduced: "1 plastic bottle",
        plasticSaved: "25g"
      }
    };

    res.json({
      success: true,
      data: tutorial
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:itemCategory", async (req, res, next) => {
  try {
    const itemCategory = requireText(req.params.itemCategory, "itemCategory", { maxLength: 100 });
    const ideas = await getUpcycleIdeas(itemCategory);
    res.json({ success: true, itemCategory, data: ideas, count: ideas.length });
  } catch (error) {
    next(error);
  }
});

export default router;
