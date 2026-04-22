-- Image-to-image models + flag on ai_models
alter table public.ai_models
  add column if not exists requires_image boolean not null default false;

update public.ai_models set requires_image = false where requires_image is null;

-- Add your image-to-image models here via seed.sql
-- Example:
-- insert into public.ai_models (id, name, provider, fal_model_id, credit_cost, sort_order, settings, requires_image) values
--   ('your-model-edit', 'Your Model (edit)', 'fal.ai', 'fal-ai/your-model/edit', 8, 10, '{}', true)
-- on conflict (id) do update set
--   name = excluded.name,
--   fal_model_id = excluded.fal_model_id,
--   credit_cost = excluded.credit_cost,
--   sort_order = excluded.sort_order,
--   requires_image = excluded.requires_image;
