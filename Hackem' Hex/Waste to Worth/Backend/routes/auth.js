import express from "express";
import { resendSignupEmail, signInUser, signUpUser } from "../db.js";
import { requireText } from "../utils/validation.js";

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const email = requireText(req.body?.email, "email", { maxLength: 254 });
    const password = requireText(req.body?.password, "password", { maxLength: 128 });
    const fullName = requireText(req.body?.fullName, "fullName", { maxLength: 120 });
    const phone = requireText(req.body?.phone, "phone", { maxLength: 30 });
    const location = requireText(req.body?.location, "location", { maxLength: 160 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Enter a valid email address." });
    }
    if (password.length < 8) return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Password must be at least 8 characters." });
    const result = await signUpUser(email, password, { fullName, phone, location });
    res.status(201).json({
      success: true,
      data: result,
      message: result.session ? "Account created and signed in." : "Account created. Check your email to verify it before signing in."
    });
  } catch (error) {
    if (/confirm|verif/i.test(error.message || "")) {
      return res.status(401).json({ success: false, code: "AUTH_UNVERIFIED", error: "Verify your email before signing in." });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = requireText(req.body?.email, "email", { maxLength: 254 });
    const password = requireText(req.body?.password, "password", { maxLength: 128 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Enter a valid email address." });
    }
    const result = await signInUser(email, password);
    if (!result.session) return res.status(401).json({ success: false, code: "AUTH_UNVERIFIED", error: "Verify your email before signing in." });
    res.json({ success: true, data: result, message: "Signed in successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/resend-verification", async (req, res, next) => {
  try {
    const email = requireText(req.body?.email, "email", { maxLength: 254 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, code: "REQUEST_INVALID", error: "Enter a valid email address." });
    }
    await resendSignupEmail(email);
    res.json({ success: true, message: "Verification email sent. Check your inbox and spam folder." });
  } catch (error) {
    next(error);
  }
});

export default router;
