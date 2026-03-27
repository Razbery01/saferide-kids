-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL RLS ISSUES
-- =============================================

-- 1. Fix the recursive users SELECT policy
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 2. Create driver onboarding function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_driver_profile(
  driver_id UUID,
  driver_id_number TEXT,
  driver_licence_number TEXT,
  driver_vehicle_registration TEXT,
  driver_vehicle_description TEXT,
  driver_route_code TEXT,
  driver_documents_url JSONB DEFAULT '[]'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.drivers (id, id_number, licence_number, vehicle_registration, vehicle_description, route_code, verification_status, documents_url)
  VALUES (driver_id, driver_id_number, driver_licence_number, driver_vehicle_registration, driver_vehicle_description, driver_route_code, 'pending', driver_documents_url)
  ON CONFLICT (id) DO UPDATE SET
    id_number = EXCLUDED.id_number,
    licence_number = EXCLUDED.licence_number,
    vehicle_registration = EXCLUDED.vehicle_registration,
    vehicle_description = EXCLUDED.vehicle_description,
    route_code = EXCLUDED.route_code,
    documents_url = EXCLUDED.documents_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure create_user_profile exists
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID, user_email TEXT, user_full_name TEXT, user_role TEXT,
  user_phone TEXT DEFAULT NULL, user_trial_ends_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone, subscription_tier, trial_ends_at, is_active)
  VALUES (user_id, user_email, user_full_name, user_role, user_phone, 'trial', user_trial_ends_at, true)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
