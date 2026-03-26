-- ═══════════════════════════════════════════════════════════
-- Smart Thread — Reward Claims Table
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reward_claims (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  task_id text NOT NULL, -- share_x, share_threads, follow_threads
  proof_url text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON public.reward_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own claims
CREATE POLICY "Users can submit claims"
  ON public.reward_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON public.reward_claims FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin')
  );

-- Admins can update claims (approve/reject)
CREATE POLICY "Admins can update claims"
  ON public.reward_claims FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.user_accounts WHERE role = 'admin')
  );
