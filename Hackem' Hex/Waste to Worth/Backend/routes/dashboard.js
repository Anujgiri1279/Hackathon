import express from "express";
import { getUserImpactStats, recordAction, getUserAnalyses } from "../db.js";
import { parseFiniteNumber, parseLimit, requireText } from "../utils/validation.js";

const router = express.Router();

// ============================================================================
// GET /api/dashboard/stats/:userId
// Get user impact statistics
// ============================================================================

router.get("/stats/:userId", async (req, res, next) => {
  try {
    const userId = requireText(req.params.userId, "userId", { maxLength: 128 });

    const stats = await getUserImpactStats(userId);

    res.json({
      success: true,
      data: {
        wasteDivertedKg: stats.wasteDivertedKg,
        valueRecovered: stats.valueRecovered,
        itemsReused: stats.itemsReused,
        landfillAvoidedKg: stats.landfillAvoidedKg,
        totalActions: stats.actionCount,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/dashboard/activity/:userId
// Get user's activity log
// ============================================================================

router.get("/activity/:userId", async (req, res, next) => {
  try {
    const userId = requireText(req.params.userId, "userId", { maxLength: 128 });
    const { limit = 20 } = req.query;

    const analyses = await getUserAnalyses(userId, parseLimit(limit));

    // Format as activity log
    const activity = analyses.map(analysis => ({
      id: analysis.id,
      item: analysis.item_name,
      action: analysis.recommendation,
      status: analysis.status || "Pending",
      date: analysis.created_at,
      imageUrl: analysis.image_url
    }));

    res.json({
      success: true,
      data: activity,
      count: activity.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/dashboard/action
// Record a waste action (for impact tracking)
// ============================================================================

router.post("/action", async (req, res, next) => {
  try {
    const {
      userId,
      item,
      actionType,
      weightKg = 0,
      valueRecovered = 0,
      landfillAvoidedKg = 0
    } = req.body || {};

    if (!userId || !item || !actionType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, item, actionType"
      });
    }

    const action = await recordAction({
      user_id: requireText(userId, "userId", { maxLength: 128 }),
      item_name: requireText(item, "item", { maxLength: 200 }),
      action_type: requireText(actionType, "actionType", { maxLength: 50 }),
      weight_kg: parseFiniteNumber(weightKg, { name: "weightKg", min: 0, max: 100000 }),
      value_recovered: parseFiniteNumber(valueRecovered, { name: "valueRecovered", min: 0, max: 100000000 }),
      landfill_avoided_kg: parseFiniteNumber(landfillAvoidedKg, { name: "landfillAvoidedKg", min: 0, max: 100000 })
    });

    res.status(201).json({
      success: true,
      data: action,
      message: "Action recorded successfully"
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/dashboard/overview/:userId
// Get complete dashboard overview
// ============================================================================

router.get("/overview/:userId", async (req, res, next) => {
  try {
    const userId = requireText(req.params.userId, "userId", { maxLength: 128 });

    const stats = await getUserImpactStats(userId);
    const recentAnalyses = await getUserAnalyses(userId, 5);

    res.json({
      success: true,
      data: {
        stats: {
          wasteDivertedKg: stats.wasteDivertedKg,
          valueRecovered: stats.valueRecovered,
          itemsReused: stats.itemsReused,
          landfillAvoidedKg: stats.landfillAvoidedKg
        },
        recentActivity: recentAnalyses.map(a => ({
          item: a.item_name,
          condition: a.condition,
          value: a.estimated_value,
          date: a.created_at
        })),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/dashboard/leaderboard
// Global leaderboard (top users by impact)
// ============================================================================

router.get("/leaderboard", async (req, res, next) => {
  try {
    // In production, implement this with aggregation queries
    // For now, return mock data
    const leaderboard = [
      {
        rank: 1,
        userName: "Eco Warrior",
        wasteDivertedKg: 156,
        itemsReused: 42
      },
      {
        rank: 2,
        userName: "Green Champion",
        wasteDivertedKg: 124,
        itemsReused: 38
      },
      {
        rank: 3,
        userName: "Sustainability Hero",
        wasteDivertedKg: 98,
        itemsReused: 29
      }
    ];

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
});

export default router;
