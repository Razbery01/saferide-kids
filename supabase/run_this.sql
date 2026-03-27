-- SafeRide Kids — Safe to run multiple times (idempotent)

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own emergency contacts" ON public.emergency_contacts
    FOR ALL USING (auth.uid() = user_id OR public.get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  trip_started BOOLEAN DEFAULT true,
  child_picked_up BOOLEAN DEFAULT true,
  child_dropped_off BOOLEAN DEFAULT true,
  at_school BOOLEAN DEFAULT true,
  speed_alert BOOLEAN DEFAULT true,
  route_deviation BOOLEAN DEFAULT true,
  approach_alert BOOLEAN DEFAULT true,
  broadcast_messages BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own notification prefs" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id OR public.get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Route schedule column
DO $$ BEGIN
  ALTER TABLE public.routes ADD COLUMN schedule TEXT DEFAULT 'both' CHECK (schedule IN ('morning', 'afternoon', 'both'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  inviter_role TEXT,
  invite_type TEXT CHECK (invite_type IN ('parent_invites_driver', 'driver_invites_parent', 'general')),
  route_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'failed')),
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own invites" ON public.invites
    FOR ALL USING (auth.uid() = inviter_id OR public.get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON public.invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_phone ON public.invites(phone);

-- Admin create user function
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_id UUID, user_email TEXT, user_full_name TEXT, user_role TEXT,
  user_phone TEXT DEFAULT NULL, user_subscription_tier TEXT DEFAULT 'trial'
) RETURNS VOID AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;
  INSERT INTO public.users (id, email, full_name, role, phone, subscription_tier, trial_ends_at, is_active)
  VALUES (user_id, user_email, user_full_name, user_role, user_phone, user_subscription_tier, (NOW() + INTERVAL '7 days'), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete user data function
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() != target_user_id AND public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized to delete this account';
  END IF;
  DELETE FROM public.child_route_assignments WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = target_user_id);
  DELETE FROM public.children WHERE parent_id = target_user_id;
  DELETE FROM public.trip_events WHERE trip_id IN (SELECT id FROM public.trips WHERE driver_id = target_user_id);
  DELETE FROM public.trip_positions WHERE trip_id IN (SELECT id FROM public.trips WHERE driver_id = target_user_id);
  DELETE FROM public.trips WHERE driver_id = target_user_id;
  DELETE FROM public.route_stops WHERE route_id IN (SELECT id FROM public.routes WHERE driver_id = target_user_id);
  DELETE FROM public.routes WHERE driver_id = target_user_id;
  DELETE FROM public.drivers WHERE id = target_user_id;
  DELETE FROM public.messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;
  DELETE FROM public.user_push_tokens WHERE user_id = target_user_id;
  UPDATE public.users SET email = 'deleted_' || target_user_id || '@deleted.local', full_name = 'Deleted User', phone = NULL, avatar_url = NULL, is_active = false WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile function
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

-- GPS data purge function
CREATE OR REPLACE FUNCTION public.purge_old_trip_positions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.trip_positions WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can upload own docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can read own docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[2] OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
