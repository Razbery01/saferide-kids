-- SafeRide Kids MVP Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Users (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'driver', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'parent_basic', 'parent_premium', 'driver_pro')),
  trial_ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  school_name TEXT,
  grade TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers (additional info for driver role)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  licence_number TEXT,
  id_number TEXT,
  vehicle_registration TEXT,
  vehicle_description TEXT,
  route_code TEXT UNIQUE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  documents_url JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school_name TEXT,
  school_lat FLOAT,
  school_lng FLOAT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  stop_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Child-route assignments
CREATE TABLE IF NOT EXISTS public.child_route_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.route_stops(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  route_id UUID NOT NULL REFERENCES public.routes(id),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('morning', 'afternoon')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip positions (GPS data)
CREATE TABLE IF NOT EXISTS public.trip_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  speed_kmh FLOAT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trip events
CREATE TABLE IF NOT EXISTS public.trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'child_picked_up', 'child_dropped_off', 'at_school',
    'trip_started', 'trip_ended', 'sos', 'speed_alert',
    'route_deviation', 'incident'
  )),
  lat FLOAT,
  lng FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID REFERENCES public.users(id),
  trip_id UUID REFERENCES public.trips(id),
  content TEXT NOT NULL,
  is_broadcast BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('parent_basic', 'parent_premium', 'driver_pro')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  payfast_token TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- POPIA consent records
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'registration',
  consent_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_children_parent ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver ON public.routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_route ON public.trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip ON public.trip_positions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_positions_recorded ON public.trip_positions(recorded_at);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON public.trip_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_events_type ON public.trip_events(event_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_child_route_child ON public.child_route_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_child_route_route ON public.child_route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_drivers_route_code ON public.drivers(route_code);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- USERS ----
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.get_user_role() = 'admin');

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (public.get_user_role() = 'admin');

-- ---- CHILDREN ----
CREATE POLICY "Parents manage own children" ON public.children
  FOR ALL USING (auth.uid() = parent_id OR public.get_user_role() = 'admin');

-- ---- DRIVERS ----
CREATE POLICY "Drivers manage own record" ON public.drivers
  FOR ALL USING (auth.uid() = id OR public.get_user_role() = 'admin');

CREATE POLICY "Anyone can read drivers by route_code" ON public.drivers
  FOR SELECT USING (true);

-- ---- ROUTES ----
CREATE POLICY "Drivers manage own routes" ON public.routes
  FOR ALL USING (auth.uid() = driver_id OR public.get_user_role() = 'admin');

CREATE POLICY "Parents can read routes they are linked to" ON public.routes
  FOR SELECT USING (
    id IN (
      SELECT cra.route_id FROM public.child_route_assignments cra
      JOIN public.children c ON c.id = cra.child_id
      WHERE c.parent_id = auth.uid()
    )
    OR public.get_user_role() = 'admin'
  );

-- ---- ROUTE STOPS ----
CREATE POLICY "Route stops follow route access" ON public.route_stops
  FOR ALL USING (
    route_id IN (SELECT id FROM public.routes WHERE driver_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Parents can read route stops" ON public.route_stops
  FOR SELECT USING (true);

-- ---- CHILD ROUTE ASSIGNMENTS ----
CREATE POLICY "Parents and drivers manage assignments" ON public.child_route_assignments
  FOR ALL USING (
    child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
    OR route_id IN (SELECT id FROM public.routes WHERE driver_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );

-- ---- TRIPS ----
CREATE POLICY "Drivers manage own trips" ON public.trips
  FOR ALL USING (auth.uid() = driver_id OR public.get_user_role() = 'admin');

CREATE POLICY "Parents can read trips for their children's routes" ON public.trips
  FOR SELECT USING (
    route_id IN (
      SELECT cra.route_id FROM public.child_route_assignments cra
      JOIN public.children c ON c.id = cra.child_id
      WHERE c.parent_id = auth.uid()
    )
  );

-- ---- TRIP POSITIONS ----
CREATE POLICY "Drivers insert own trip positions" ON public.trip_positions
  FOR INSERT WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE driver_id = auth.uid())
  );

CREATE POLICY "Parents read positions for their children's trips" ON public.trip_positions
  FOR SELECT USING (
    trip_id IN (
      SELECT t.id FROM public.trips t
      JOIN public.child_route_assignments cra ON cra.route_id = t.route_id
      JOIN public.children c ON c.id = cra.child_id
      WHERE c.parent_id = auth.uid()
    )
    OR public.get_user_role() = 'admin'
  );

-- ---- TRIP EVENTS ----
CREATE POLICY "Drivers insert trip events" ON public.trip_events
  FOR INSERT WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE driver_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "Parents read events for their children's trips" ON public.trip_events
  FOR SELECT USING (
    trip_id IN (
      SELECT t.id FROM public.trips t
      JOIN public.child_route_assignments cra ON cra.route_id = t.route_id
      JOIN public.children c ON c.id = cra.child_id
      WHERE c.parent_id = auth.uid()
    )
    OR public.get_user_role() = 'admin'
  );

-- ---- MESSAGES ----
CREATE POLICY "Users read own messages" ON public.messages
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id) OR public.get_user_role() = 'admin');

CREATE POLICY "Users send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users update own received messages" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ---- SUBSCRIPTIONS ----
CREATE POLICY "Users manage own subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

-- ---- PUSH TOKENS ----
CREATE POLICY "Users manage own push tokens" ON public.user_push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- ---- CONSENT RECORDS ----
CREATE POLICY "Users can read own consent" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

CREATE POLICY "Users can insert consent" ON public.consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Profile creation RPC (used during email confirmation flow when
-- the user has no active session and cannot satisfy RLS INSERT policies)
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
-- REALTIME
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
