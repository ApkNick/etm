/*
# AgriMarketplace Core Schema

1. Overview
This migration creates the foundational schema for a B2B Agricultural Marketplace and Information Resource.
It includes: user profiles with dual roles (seller/buyer), KYC/KYB corporate onboarding records,
agri-commodity advertisements, flash deals, market prices, news articles, and admin-managed contract templates.

2. New Tables
- `profiles`: Extends auth.users with role (seller/buyer), display name, phone, and kyc verification status.
- `kyc_records`: Corporate onboarding data (legal name, USREOU/EDRPOU, bank, IBAN) + uploaded document file paths. Private to owner + admin.
- `ads`: Farmer/elevator commodity listings (grain, corn, sunflower, rapeseed, sugar, meal) with volume, price, delivery basis, quality params, and uploaded media + warehouse certificate paths.
- `deals`: Flash Deal (Швидка домовленість) records linking a buyer, seller, and ad. Tracks contract type, deposit, signing status, and deal status.
- `prices`: Daily market price entries per commodity and delivery basis (CPT/FOB/EXW).
- `news`: Agri news & analytics articles with tags.
- `contract_templates`: Admin-managed legal contract templates with variable placeholders.

3. Security
- RLS enabled on every table.
- profiles: owner can read/update own; admins read all.
- kyc_records: owner can read own; admins read all (verification). Insert/update owner-scoped.
- ads: public read (marketplace is browsable); insert/update/delete owner-scoped.
- deals: both buyer and seller can read/update their deal; insert by buyer.
- prices: public read; insert/update/delete admin-only (via service role / authenticated admin).
- news: public read; insert/update/delete admin-only.
- contract_templates: public read (for generation); insert/update/delete admin-only.
- Admin role determined by profiles.role = 'admin' OR raw_app_meta_data role.

4. Notes
- USREOU/EDRPOU validated to 8 or 10 digits via CHECK constraint.
- IBAN validated to UA + 27 digits via CHECK constraint.
- Storage buckets (kyc-docs, ad-media, deal-docs) are created separately; file paths stored in tables.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('seller','buyer','admin')),
  display_name text,
  phone text,
  kyc_status text NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none','pending','approved','rejected')),
  kyc_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ KYC RECORDS ============
CREATE TABLE IF NOT EXISTS public.kyc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_type text CHECK (company_type IN ('legal','entrepreneur')),
  legal_name text NOT NULL,
  usreou text NOT NULL CHECK (usreou ~ '^[0-9]{8}$|^[0-9]{10}$'),
  bank_name text NOT NULL,
  iban text NOT NULL CHECK (iban ~ '^UA[0-9]{27}$'),
  register_extract_path text,
  tax_certificate_path text,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_select_own_or_admin" ON public.kyc_records;
CREATE POLICY "kyc_select_own_or_admin" ON public.kyc_records FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "kyc_insert_own" ON public.kyc_records;
CREATE POLICY "kyc_insert_own" ON public.kyc_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_update_own_or_admin" ON public.kyc_records;
CREATE POLICY "kyc_update_own_or_admin" ON public.kyc_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ ADS ============
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  commodity text NOT NULL CHECK (commodity IN ('grain','corn','sunflower','rapeseed','sugar','meal')),
  volume_tons numeric(12,2) NOT NULL CHECK (volume_tons > 0),
  price_per_ton numeric(12,2) NOT NULL CHECK (price_per_ton >= 0),
  delivery_basis text NOT NULL CHECK (delivery_basis IN ('EXW','CPT','FOB','DAP')),
  harvest_year int NOT NULL,
  moisture numeric(5,2),
  protein numeric(5,2),
  foreign_matter numeric(5,2),
  description text,
  media_paths text[] DEFAULT '{}',
  warehouse_cert_path text NOT NULL,
  ttn_lab_path text,
  specifications_path text,
  quality_cert_path text,
  region text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select_public" ON public.ads;
CREATE POLICY "ads_select_public" ON public.ads FOR SELECT
  TO anon, authenticated USING (status = 'active' OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "ads_insert_own" ON public.ads;
CREATE POLICY "ads_insert_own" ON public.ads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "ads_update_own" ON public.ads;
CREATE POLICY "ads_update_own" ON public.ads FOR UPDATE
  TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "ads_delete_own" ON public.ads;
CREATE POLICY "ads_delete_own" ON public.ads FOR DELETE
  TO authenticated USING (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS ads_commodity_idx ON public.ads(commodity);
CREATE INDEX IF NOT EXISTS ads_seller_idx ON public.ads(seller_id);

-- ============ DEALS ============
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_type text NOT NULL CHECK (contract_type IN ('sales','contracting','forward')),
  deposit_amount numeric(14,2) NOT NULL DEFAULT 0,
  has_deposit boolean NOT NULL DEFAULT false,
  buyer_signed_external boolean NOT NULL DEFAULT false,
  seller_signed_external boolean NOT NULL DEFAULT false,
  buyer_signed_native boolean NOT NULL DEFAULT false,
  seller_signed_native boolean NOT NULL DEFAULT false,
  buyer_signed_physical boolean NOT NULL DEFAULT false,
  seller_signed_physical boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','completed')),
  attachments text[] DEFAULT '{}',
  contract_pdf_path text,
  buyer_signed_path text,
  seller_signed_path text,
  deposit_paid boolean NOT NULL DEFAULT false,
  final_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_select_parties" ON public.deals;
CREATE POLICY "deals_select_parties" ON public.deals FOR SELECT
  TO authenticated USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "deals_insert_buyer" ON public.deals;
CREATE POLICY "deals_insert_buyer" ON public.deals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "deals_update_parties" ON public.deals;
CREATE POLICY "deals_update_parties" ON public.deals FOR UPDATE
  TO authenticated USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS deals_buyer_idx ON public.deals(buyer_id);
CREATE INDEX IF NOT EXISTS deals_seller_idx ON public.deals(seller_id);

-- ============ PRICES ============
CREATE TABLE IF NOT EXISTS public.prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL CHECK (commodity IN ('grain','corn','sunflower','rapeseed','sugar','meal')),
  delivery_basis text NOT NULL CHECK (delivery_basis IN ('EXW','CPT','FOB','DAP')),
  price_uah numeric(12,2) NOT NULL,
  region text,
  recorded_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prices_select_public" ON public.prices;
CREATE POLICY "prices_select_public" ON public.prices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "prices_insert_admin" ON public.prices;
CREATE POLICY "prices_insert_admin" ON public.prices FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "prices_update_admin" ON public.prices;
CREATE POLICY "prices_update_admin" ON public.prices FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "prices_delete_admin" ON public.prices;
CREATE POLICY "prices_delete_admin" ON public.prices FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE INDEX IF NOT EXISTS prices_commodity_date_idx ON public.prices(commodity, recorded_on);

-- ============ NEWS ============
CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  tags text[] DEFAULT '{}',
  author text,
  image_url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_select_public" ON public.news;
CREATE POLICY "news_select_public" ON public.news FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "news_insert_admin" ON public.news;
CREATE POLICY "news_insert_admin" ON public.news FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "news_update_admin" ON public.news;
CREATE POLICY "news_update_admin" ON public.news FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "news_delete_admin" ON public.news;
CREATE POLICY "news_delete_admin" ON public.news FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ CONTRACT TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type text NOT NULL CHECK (contract_type IN ('sales','contracting','forward')),
  title text NOT NULL,
  template_body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_public" ON public.contract_templates;
CREATE POLICY "templates_select_public" ON public.contract_templates FOR SELECT
  TO anon, authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "templates_insert_admin" ON public.contract_templates;
CREATE POLICY "templates_insert_admin" ON public.contract_templates FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "templates_update_admin" ON public.contract_templates;
CREATE POLICY "templates_update_admin" ON public.contract_templates FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "templates_delete_admin" ON public.contract_templates;
CREATE POLICY "templates_delete_admin" ON public.contract_templates FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS kyc_touch ON public.kyc_records;
CREATE TRIGGER kyc_touch BEFORE UPDATE ON public.kyc_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ads_touch ON public.ads;
CREATE TRIGGER ads_touch BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS deals_touch ON public.deals;
CREATE TRIGGER deals_touch BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS templates_touch ON public.contract_templates;
CREATE TRIGGER templates_touch BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
