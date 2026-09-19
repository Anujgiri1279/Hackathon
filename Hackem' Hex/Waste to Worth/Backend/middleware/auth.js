import { supabase } from "../db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ success: false, code: "AUTH_REQUIRED", error: "Sign in to continue." });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ success: false, code: "AUTH_INVALID", error: "Your session has expired. Sign in again." });
    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}
