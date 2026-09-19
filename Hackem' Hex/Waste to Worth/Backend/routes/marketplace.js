import express from "express";
import {
  createListing,
  getListings,
  getListing,
  updateListingStatus
} from "../db.js";
import { optionalText, parseFiniteNumber, parseLimit, requireText } from "../utils/validation.js";

const router = express.Router();

// ============================================================================
// GET /api/marketplace
// Get all marketplace listings with optional filters
// ============================================================================

router.get("/", async (req, res, next) => {
  try {
    const { category, location, limit = 50 } = req.query;

    const listings = await getListings(
      optionalText(category, "category", { maxLength: 80 }),
      optionalText(location, "location", { maxLength: 120 }),
      parseLimit(limit, 50, 100)
    );

    res.json({
      success: true,
      data: listings,
      count: listings.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/marketplace/categories
// Get all available categories
// ============================================================================

router.get("/categories", async (req, res, next) => {
  try {
    // Common waste categories
    const categories = [
      "Furniture",
      "Electronics",
      "Clothes",
      "Books",
      "Appliances",
      "Toys",
      "Sports",
      "Home Decor",
      "Others"
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
// GET /api/marketplace/:id
// Get a specific listing
// ============================================================================

router.get("/search/:query", async (req, res, next) => {
  try {
    const query = requireText(req.params.query, "query", { maxLength: 100 }).toLowerCase();
    const allListings = await getListings(null, null, 100);
    const results = allListings.filter(item =>
      String(item.title || "").toLowerCase().includes(query) ||
      String(item.description || "").toLowerCase().includes(query)
    );
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = requireText(req.params.id, "id", { maxLength: 128 });

    const listing = await getListing(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found"
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/marketplace
// Create a new listing
// ============================================================================

router.post("/", async (req, res, next) => {
  try {
    const {
      userId,
      title,
      description,
      category,
      price,
      condition,
      location,
      contactPhone,
      imageUrl
    } = req.body || {};

    if (!title || !category || price === undefined || price === null || !location) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, category, price, location"
      });
    }

    const listing = await createListing({
      user_id: userId === undefined ? null : optionalText(userId, "userId", { maxLength: 128 }),
      title: requireText(title, "title", { maxLength: 200 }),
      description: optionalText(description, "description", { maxLength: 2000 }),
      category: requireText(category, "category", { maxLength: 80 }),
      price: parseFiniteNumber(price, { name: "price", min: 0, max: 100000000 }),
      condition: optionalText(condition, "condition", { maxLength: 80 }),
      location: requireText(location, "location", { maxLength: 200 }),
      contact_phone: optionalText(contactPhone, "contactPhone", { maxLength: 30 }),
      image_url: optionalText(imageUrl, "imageUrl", { maxLength: 2048 }),
      status: "active"
    });

    res.status(201).json({
      success: true,
      data: listing,
      message: "Listing created successfully"
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PATCH /api/marketplace/:id/status
// Update listing status (mark as sold, inactive, etc.)
// ============================================================================

router.patch("/:id/status", async (req, res, next) => {
  try {
    const id = requireText(req.params.id, "id", { maxLength: 128 });
    const { status } = req.body;

    const validStatuses = ["active", "sold", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(", ")}`
      });
    }

    const listing = await updateListingStatus(id, status);

    res.json({
      success: true,
      data: listing,
      message: `Listing marked as ${status}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
