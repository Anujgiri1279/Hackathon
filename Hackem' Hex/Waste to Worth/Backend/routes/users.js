import express from "express";
import { getUserProfile, upsertUserProfile } from "../db.js";
import { optionalText, requireText } from "../utils/validation.js";

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  try {
    const id = requireText(req.params.id, "id", { maxLength: 128 });
    const profile = await getUserProfile(id);
    if (!profile) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", error: "User profile not found." });
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = requireText(req.params.id, "id", { maxLength: 128 });
    const profile = {
      id,
      full_name: requireText(req.body?.fullName, "fullName", { maxLength: 120 }),
      email: optionalText(req.body?.email, "email", { maxLength: 254 }),
      phone: optionalText(req.body?.phone, "phone", { maxLength: 30 }),
      location: optionalText(req.body?.location, "location", { maxLength: 160 })
    };
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Enter a valid email address." });
    }
    const saved = await upsertUserProfile(profile);
    res.json({ success: true, data: saved, message: "Profile saved." });
  } catch (error) {
    next(error);
  }
});

export default router;
