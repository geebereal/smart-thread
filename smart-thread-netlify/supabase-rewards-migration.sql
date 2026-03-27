-- ═══════════════════════════════════════════════════════════
-- Smart Thread — Reward Claims + License Keys Tables
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. REWARD CLAIMS
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  proof_url text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON public.reward_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit claims"
  ON public.reward_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
  ON public.reward_claims FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin'));

CREATE POLICY "Admins can update claims"
  ON public.reward_claims FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin'));

-- 2. LICENSE KEYS LOG
CREATE TABLE IF NOT EXISTS public.license_keys (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key_code text NOT NULL UNIQUE,
  tier text NOT NULL,
  duration_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'claimed', 'revoked')),
  created_by uuid REFERENCES public.user_accounts(id),
  claimed_by text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all keys"
  ON public.license_keys FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin'));

CREATE POLICY "Admins can insert keys"
  ON public.license_keys FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin'));

CREATE POLICY "Anyone can claim keys"
  ON public.license_keys FOR UPDATE
  USING (true);
