-- ============================================================================
-- WASTE2WORTH DATABASE SCHEMA
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================================

-- ============================================================================
-- ANALYSES TABLE
-- Stores all waste item analysis records
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================================================

CREATE TABLE IF NOT EXISTS analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  item_name TEXT NOT NULL,
  condition TEXT,
  estimated_value TEXT,
  material TEXT,
  recommendation TEXT,
  explanation TEXT,
  image_url TEXT,
  storage_path TEXT,
  gemini_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- ============================================================================
-- MARKETPLACE_LISTINGS TABLE
-- Marketplace items for resale
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  condition TEXT,
  location TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_location ON marketplace_listings(location);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace_listings(created_at DESC);

-- ============================================================================
-- SERVICES TABLE
-- Service providers (repair, recycle, donate, resell, upcycle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  image_url TEXT,
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  operating_hours TEXT,
  price_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_location ON services(location);
CREATE INDEX IF NOT EXISTS idx_services_rating ON services(rating DESC);

-- Keep one provider record per name, type, and location when this schema is rerun.
DELETE FROM services AS first
USING services AS duplicate
WHERE lower(first.name) = lower(duplicate.name)
  AND first.type = duplicate.type
  AND first.location = duplicate.location
  AND first.id > duplicate.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_provider_identity
ON services (lower(name), type, location);

-- ============================================================================
-- UPCYCLE_IDEAS TABLE
-- Curated upcycling project ideas
-- ============================================================================

CREATE TABLE IF NOT EXISTS upcycle_ideas (
  id BIGSERIAL PRIMARY KEY,
  item_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  materials_needed TEXT[],
  steps JSONB,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  time_required TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  image_url TEXT,
  tutorial_url TEXT,
  eco_impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upcycle_category ON upcycle_ideas(item_category);
CREATE INDEX IF NOT EXISTS idx_upcycle_difficulty ON upcycle_ideas(difficulty);

-- ============================================================================
-- USER_ACTIONS TABLE
-- Track waste actions for impact statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  item_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reused', 'repaired', 'donated', 'recycled', 'upcycled', 'resold')),
  weight_kg DECIMAL(10, 2) DEFAULT 0,
  value_recovered DECIMAL(10, 2) DEFAULT 0,
  landfill_avoided_kg DECIMAL(10, 2) DEFAULT 0,
  service_id BIGINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON user_actions(created_at DESC);

-- ============================================================================
-- STORAGE BUCKETS (Create via Supabase Dashboard)
-- ============================================================================

-- Go to Supabase Dashboard > Storage and create these buckets:
-- 1. "waste-images" - PUBLIC
--    Enable public access for URLs
-- 2. "user-uploads" - PRIVATE (optional, for user profile images)

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Sample Services
INSERT INTO services (name, type, description, location, contact_phone, rating, review_count) VALUES
  ('GreenFix Repairs', 'Repair', 'Expert repair services for electronics and furniture', 'Noida, Sector 62', '+91 90000 11111', 4.6, 145),
  ('EcoCycle Recyclers', 'Recycler', 'Certified recycling center for all materials', 'Greater Noida', '+91 90000 22222', 4.3, 98),
  ('Studio Upcycle', 'Upcycler', 'Creative upcycling and DIY workshops', 'Delhi', '+91 90000 33333', 4.8, 234),
  ('Second Chance Donation Center', 'Donation', 'Accept and distribute used items to families in need', 'Ghaziabad', '+91 90000 44444', 4.7, 167),
  ('ResellIt Co.', 'Reseller', 'Buy and resell quality used items', 'Noida, Sector 18', '+91 90000 55555', 4.2, 121)
ON CONFLICT (lower(name), type, location) DO NOTHING;

UPDATE services SET image_url = CASE type
  WHEN 'Repair' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80'
  WHEN 'Recycler' THEN 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80'
  WHEN 'Upcycler' THEN 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=80'
  WHEN 'Donation' THEN 'https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=900&q=80'
  WHEN 'Reseller' THEN 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80'
  ELSE image_url
END
WHERE image_url IS NULL;

-- Sample Upcycle Ideas
INSERT INTO upcycle_ideas (item_category, title, description, difficulty, time_required, eco_impact) VALUES
  ('Plastic Bottle', 'Planter from Plastic Bottle', 'Transform old bottles into beautiful plant containers', 'Easy', '15 minutes', 'Save 1 plastic bottle'),
  ('Plastic Bottle', 'Decorative Lamp', 'Create ambient lighting from recycled bottles', 'Medium', '1 hour', 'Save 2-3 plastic bottles'),
  ('Wooden Chair', 'Plant Stand', 'Convert old chairs into unique plant displays', 'Medium', '2 hours', 'Extend furniture life by 5+ years'),
  ('Used Clothes', 'Tote Bag', 'Sew a shopping bag from old t-shirts', 'Medium', '1.5 hours', 'Reduce fabric waste'),
  ('Old Books', 'Bookshelf Art', 'Create decorative shelf displays', 'Easy', '30 minutes', 'Preserve knowledge and aesthetics')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant safety)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Create policies (if using authentication)
-- Example: Users can only see their own analyses
-- CREATE POLICY "Users can view own analyses" ON analyses
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can create analyses" ON analyses
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VIEWS (Optional - for aggregated data)
-- ============================================================================

CREATE OR REPLACE VIEW user_impact_summary AS
SELECT
  user_id,
  COUNT(*) as total_actions,
  SUM(weight_kg) as total_weight_diverted,
  SUM(value_recovered) as total_value_recovered,
  SUM(landfill_avoided_kg) as total_landfill_avoided,
  COUNT(CASE WHEN action_type = 'reused' THEN 1 END) as items_reused
FROM user_actions
GROUP BY user_id;

-- ============================================================================
-- FUNCTIONS (Optional - for automation)
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove old versions first so this file can be run repeatedly.
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;
DROP TRIGGER IF EXISTS update_marketplace_updated_at ON public.marketplace_listings;
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_analyses_updated_at
BEFORE UPDATE ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_marketplace_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
