import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
  throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
}

// This client is server-only. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function signUpUser(email, password, profile = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile.fullName || "",
        phone: profile.phone || "",
        location: profile.location || ""
      },
      emailRedirectTo: `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify.html?verified=1`
    }
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function resendSignupEmail(email) {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify.html?verified=1`
    }
  });
  if (error) throw error;
  return data;
}

export async function upsertUserProfile(profile) {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email || null,
      phone: profile.phone || null,
      location: profile.location || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserProfile(id) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Upload an image to Supabase Storage
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(imageBuffer, filename, contentType = "image/jpeg") {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Image data is required");
  }
  if (typeof filename !== "string" || !filename.trim()) {
    throw new Error("Image filename is required");
  }
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120);
  const storagePath = `waste-uploads/${timestamp}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from("waste-images")
    .upload(storagePath, imageBuffer, {
      contentType,
      upsert: false
    });

  if (error) throw error;

  const {
    data: { publicUrl }
  } = supabase.storage.from("waste-images").getPublicUrl(storagePath);

  return { url: publicUrl, path: storagePath };
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(storagePath) {
  const { error } = await supabase.storage
    .from("waste-images")
    .remove([storagePath]);

  if (error) throw error;
}

// ============================================================================
// ANALYSIS TABLE FUNCTIONS
// ============================================================================

/**
 * Save analysis result to database
 */
export async function saveAnalysis(analysisData) {
  const { data, error } = await supabase
    .from("analyses")
    .insert([{
      ...analysisData,
      created_at: new Date().toISOString()
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function updateAnalysis(id, userId, updates) {
  let query = supabase
    .from("analyses")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select().maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get user's analysis history
 */
export async function getUserAnalyses(userId, limit = 20) {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 20)));

  if (error) throw error;
  return data || [];
}

// ============================================================================
// MARKETPLACE TABLE FUNCTIONS
// ============================================================================

/**
 * Create a marketplace listing
 */
export async function createListing(listingData) {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert([{
      ...listingData,
      created_at: new Date().toISOString()
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Get all marketplace listings with filters
 */
export async function getListings(category = null, location = null, limit = 50) {
  let query = supabase
    .from("marketplace_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 50)));

  if (category) query = query.eq("category", category);
  if (location) query = query.ilike("location", `%${location}%`);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single listing
 */
export async function getListing(id) {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

/**
 * Update listing status
 */
export async function updateListingStatus(id, status, userId) {
  let query = supabase
    .from("marketplace_listings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select();

  if (error) throw error;
  return data?.[0];
}

// ============================================================================
// SERVICES TABLE FUNCTIONS
// ============================================================================

/**
 * Get services by type
 */
export async function getServicesByType(type = null, location = null) {
  let query = supabase
    .from("services")
    .select("*")
    .order("rating", { ascending: false });

  if (type) query = query.eq("type", type);
  if (location) query = query.ilike("location", `%${location}%`);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get all service types
 */
export async function getServiceTypes() {
  const { data, error } = await supabase
    .from("services")
    .select("type");

  if (error) throw error;
  return [...new Set((data || []).map(d => d.type).filter(Boolean))];
}

// ============================================================================
// UPCYCLE IDEAS TABLE FUNCTIONS
// ============================================================================

/**
 * Get upcycle ideas for an item category
 */
export async function getUpcycleIdeas(itemCategory) {
  const { data, error } = await supabase
    .from("upcycle_ideas")
    .select("*")
    .eq("item_category", itemCategory)
    .order("difficulty", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add upcycle idea (admin)
 */
export async function addUpcycleIdea(ideaData) {
  const { data, error } = await supabase
    .from("upcycle_ideas")
    .insert([ideaData])
    .select();

  if (error) throw error;
  return data?.[0];
}

// ============================================================================
// IMPACT TRACKING TABLE FUNCTIONS
// ============================================================================

/**
 * Record user action for impact tracking
 */
export async function recordAction(actionData) {
  const { data, error } = await supabase
    .from("user_actions")
    .insert([{
      ...actionData,
      created_at: new Date().toISOString()
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Get user impact stats
 */
export async function getUserImpactStats(userId) {
  const { data, error } = await supabase
    .from("user_actions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  // Calculate aggregates
  const stats = {
    wasteDivertedKg: 0,
    valueRecovered: 0,
    itemsReused: 0,
    landfillAvoidedKg: 0,
    actionCount: data?.length || 0
  };

  data?.forEach(action => {
    const weight = Number(action.weight_kg);
    const value = Number(action.value_recovered);
    const landfill = Number(action.landfill_avoided_kg);
    stats.wasteDivertedKg += Number.isFinite(weight) ? weight : 0;
    stats.valueRecovered += Number.isFinite(value) ? value : 0;
    stats.itemsReused += action.action_type === "reused" ? 1 : 0;
    stats.landfillAvoidedKg += Number.isFinite(landfill) ? landfill : 0;
  });

  return stats;
}

// ============================================================================
// EXPORT DB CLIENT
// ============================================================================

export default supabase;
