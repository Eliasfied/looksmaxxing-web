-- Remove welcome bonus: new users get 0 credits (no free tier)
-- Run this migration if you initially had a welcome bonus and want to remove it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _display_name text;
begin
  _display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, _display_name);

  insert into public.credits (user_id, subscription_credits, topup_credits)
  values (new.id, 0, 0);

  return new;
end;
$$;
