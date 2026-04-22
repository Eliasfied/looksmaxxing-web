-- Seed data for your SaaS project
-- Copy this to seed.sql and fill in your actual values

-- AI Models (adjust credit_cost based on your margins)
INSERT INTO public.ai_models (id, name, provider, fal_model_id, credit_cost, requires_image, is_active, sort_order, settings) VALUES
-- Text-to-image
('your-model-id',      'Your Model Name',     'fal.ai', 'fal-ai/your-model',      40, false, true, 1, '{}'),
-- Image-to-image
('your-model-id-edit', 'Your Model Name (edit)', 'fal.ai', 'fal-ai/your-model/edit', 40, true,  true, 2, '{}');

-- Subscription Plans (match your RevenueCat product IDs)
INSERT INTO public.plans (id, plan, interval, name, monthly_credits, price_usd, revenuecat_product_id, is_active, features) VALUES
('starter_monthly', 'starter', 'monthly', 'Starter', 2000,  19.00,  'yourapp_starter_monthly', true, '[]'),
('starter_yearly',  'starter', 'yearly',  'Starter', 2000,  99.00,  'yourapp_starter_yearly',  true, '[]'),
('pro_monthly',     'pro',     'monthly', 'Pro',     8000,  49.00,  'yourapp_pro_monthly',     true, '[]'),
('pro_yearly',      'pro',     'yearly',  'Pro',     8000,  349.00, 'yourapp_pro_yearly',      true, '[]'),
('ultra_monthly',   'ultra',   'monthly', 'Ultra',   20000, 99.00,  'yourapp_ultra_monthly',   true, '[]'),
('ultra_yearly',    'ultra',   'yearly',  'Ultra',   20000, 699.00, 'yourapp_ultra_yearly',    true, '[]');

-- Credit Packs (match your RevenueCat product IDs)
INSERT INTO public.credit_packs (id, revenuecat_product_id, credits, price_usd, is_active) VALUES
('pack_2000',  'yourapp_credits_2000', 2000, 29.99, true),
('pack_6000',  'yourapp_credits_6000', 6000, 49.99, true);
