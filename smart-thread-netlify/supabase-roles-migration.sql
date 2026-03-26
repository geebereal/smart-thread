-- ═══════════════════════════════════════════════════════════
-- Smart Thread — Add Roles & Gifted Plans
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add role column (user = normal, beta = all hooks unlocked, admin = everything unlimited)
ALTER TABLE public.user_accounts 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' 
  CHECK (role IN ('user', 'beta', 'admin'));

-- Add gifted_plan column (admin can gift any plan to a user without a license key)
ALTER TABLE public.user_accounts 
  ADD COLUMN IF NOT EXISTS gifted_plan text 
  CHECK (gifted_plan IS NULL OR gifted_plan IN ('grow', 'scale', 'dominate', 'forever'));

-- Add license_expiry column (null = permanent/lifetime)
ALTER TABLE public.user_accounts 
  ADD COLUMN IF NOT EXISTS license_expiry timestamptz;

-- Allow admins to read all user_accounts and thread_history (for dashboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all accounts') THEN
    CREATE POLICY "Admins can view all accounts"
      ON public.user_accounts FOR SELECT
      USING (
        auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all history') THEN
    CREATE POLICY "Admins can view all history"
      ON public.thread_history FOR SELECT
      USING (
        auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin')
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- HOW TO USE:
-- ═══════════════════════════════════════════════════════════
--
-- Make yourself admin:
--   UPDATE public.user_accounts SET role = 'admin' WHERE email = 'gabrielharris10@icloud.com';
--
-- Give someone beta access (unlocks all hooks, keeps their plan limits):
--   UPDATE public.user_accounts SET role = 'beta' WHERE email = 'friend@example.com';
--
-- Gift someone a free Scale plan:
--   UPDATE public.user_accounts SET gifted_plan = 'scale' WHERE email = 'vip@example.com';
--
-- Gift someone lifetime Forever access:
--   UPDATE public.user_accounts SET gifted_plan = 'forever' WHERE email = 'investor@example.com';
--
-- Remove a gift (back to their purchased plan or seed):
--   UPDATE public.user_accounts SET gifted_plan = NULL WHERE email = 'vip@example.com';
--
-- Remove beta/admin role:
--   UPDATE public.user_accounts SET role = 'user' WHERE email = 'friend@example.com';
--
-- View all special users:
--   SELECT email, role, plan, gifted_plan FROM public.user_accounts WHERE role != 'user' OR gifted_plan IS NOT NULL;
