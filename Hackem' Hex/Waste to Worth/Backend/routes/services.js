import express from "express";
import { getServicesByType, getServiceTypes } from "../db.js";
import { optionalText, parseFiniteNumber, requireText } from "../utils/validation.js";

const router = express.Router();

// ============================================================================
// GET /api/services
// Get services with optional filters
// ============================================================================

router.get("/", async (req, res, next) => {
  try {
    const { type, location } = req.query;

    const services = await getServicesByType(
      optionalText(type, "type", { maxLength: 80 }),
      optionalText(location, "location", { maxLength: 120 })
    );

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/services/types
// Get all available service types
// ============================================================================

router.get("/types", async (req, res, next) => {
  try {
    const types = await getServiceTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/services/by-type/:type
// Get services of a specific type
// ============================================================================

router.get("/by-type/:type", async (req, res, next) => {
  try {
    const type = requireText(req.params.type, "type", { maxLength: 80 });
    const { location } = req.query;

    const services = await getServicesByType(type, location);

    res.json({
      success: true,
      type,
      data: services,
      count: services.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/services/recommendations/:actionType
// Get recommended services for a specific action
// ============================================================================

router.get("/recommendations/:actionType", async (req, res, next) => {
  try {
    const { actionType } = req.params;
    const { location } = req.query;

    // Map action types to service types
    const serviceTypeMap = {
      repair: "Repair",
      resell: "Reseller",
      donate: "Donation",
      recycle: "Recycler",
      upcycle: "Upcycler",
      "e-waste": "E-waste"
    };

    const serviceType = serviceTypeMap[actionType.toLowerCase()];
    if (!serviceType) {
      return res.status(400).json({
        success: false,
        error: "Unknown action type"
      });
    }

    const services = await getServicesByType(serviceType, location);

    res.json({
      success: true,
      actionType,
      serviceType,
      data: services.slice(0, 5), // Return top 5
      count: Math.min(services.length, 5)
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/services/nearest
// Get nearest services by location (requires location data)
// ============================================================================

router.get("/nearest", async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    let safeLatitude;
    let safeLongitude;
    let safeRadius;
    try {
      safeLatitude = parseFiniteNumber(latitude, { name: "latitude", min: -90, max: 90 });
      safeLongitude = parseFiniteNumber(longitude, { name: "longitude", min: -180, max: 180 });
      safeRadius = parseFiniteNumber(radius, { name: "radius", min: 0, max: 1000 });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!Number.isFinite(safeLatitude) || !Number.isFinite(safeLongitude)) {
      return res.status(400).json({
        success: false,
        error: "Please provide latitude and longitude"
      });
    }

    // Get all services
    const allServices = await getServicesByType();

    // In production, use PostGIS or similar for actual geo-distance calculation
    // For now, filter by proximity (simplified)
    const nearby = allServices.slice(0, 10);

    res.json({
      success: true,
      data: nearby,
      count: nearby.length,
      radius: safeRadius,
      note: "Simplified proximity filter; use PostGIS for accurate geo-distance"
    });
  } catch (error) {
    next(error);
  }
});

export default router;
