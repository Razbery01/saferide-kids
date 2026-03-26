-- SafeRide Kids Audit Fixes Migration
-- Run this in your Supabase SQL Editor after the initial schema

-- ============================================
-- 1. Account deletion function (POPIA compliance)
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Only allow users to delete their own data, or admins
  IF auth.uid() != target_user_id AND public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized to delete this account';
  END IF;

  -- Delete child route assignments
  DELETE FROM public.child_route_assignments
    WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = target_user_id);

  -- Delete children
  DELETE FROM public.children WHERE parent_id = target_user_id;

  -- Delete trip events for driver's trips
  DELETE FROM public.trip_events
    WHERE trip_id IN (SELECT id FROM public.trips WHERE driver_id = target_user_id);

  -- Delete trip positions for driver's trips
  DELETE FROM public.trip_positions
    WHERE trip_id IN (SELECT id FROM public.trips WHERE driver_id = target_user_id);

  -- Delete trips
  DELETE FROM public.trips WHERE driver_id = target_user_id;

  -- Delete route stops
  DELETE FROM public.route_stops
    WHERE route_id IN (SELECT id FROM public.routes WHERE driver_id = target_user_id);

  -- Delete routes
  DELETE FROM public.routes WHERE driver_id = target_user_id;

  -- Delete driver record
  DELETE FROM public.drivers WHERE id = target_user_id;

  -- Delete messages (sent or received)
  DELETE FROM public.messages
    WHERE sender_id = target_user_id OR receiver_id = target_user_id;

  -- Delete subscriptions
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;

  -- Delete push tokens
  DELETE FROM public.user_push_tokens WHERE user_id = target_user_id;

  -- Anonymize the user record (keep for audit trail but strip PII)
  UPDATE public.users SET
    email = 'deleted_' || target_user_id || '@deleted.local',
    full_name = 'Deleted User',
    phone = NULL,
    avatar_url = NULL,
    is_active = false
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Prevent duplicate active trips per route
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_trip_per_route
  ON public.trips (route_id)
  WHERE status = 'active';

-- ============================================
-- 3. Unique child-route assignment (one active assignment per child)
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_assignment_per_child
  ON public.child_route_assignments (child_id)
  WHERE is_active = true;

-- ============================================
-- 4. GPS data retention policy (90 days)
-- Requires pg_cron extension enabled in Supabase Dashboard
-- ============================================

-- Function to purge old GPS data
CREATE OR REPLACE FUNCTION public.purge_old_trip_positions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.trip_positions
    WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To enable automatic purging, run this in SQL Editor after enabling pg_cron:
-- SELECT cron.schedule('purge-gps-data', '0 3 * * *', 'SELECT public.purge_old_trip_positions()');

-- ============================================
-- 5. Profile creation RPC (used during email confirmation flow)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT,
  user_phone TEXT DEFAULT NULL,
  user_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone, subscription_tier, trial_ends_at, is_active)
  VALUES (user_id, user_email, user_full_name, user_role, user_phone, 'trial', user_trial_ends_at, true)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Validate GPS coordinates at database level
-- ============================================

ALTER TABLE public.routes
  ADD CONSTRAINT chk_routes_school_lat CHECK (school_lat IS NULL OR (school_lat >= -90 AND school_lat <= 90)),
  ADD CONSTRAINT chk_routes_school_lng CHECK (school_lng IS NULL OR (school_lng >= -180 AND school_lng <= 180));

ALTER TABLE public.route_stops
  ADD CONSTRAINT chk_stops_lat CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
  ADD CONSTRAINT chk_stops_lng CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));

ALTER TABLE public.trip_positions
  ADD CONSTRAINT chk_positions_lat CHECK (lat >= -90 AND lat <= 90),
  ADD CONSTRAINT chk_positions_lng CHECK (lng >= -180 AND lng <= 180);
