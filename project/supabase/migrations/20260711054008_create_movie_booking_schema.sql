/*
# Movie Ticket Booking System - Core Schema

## Overview
Full schema for a movie ticket booking system with JWT auth (Supabase Auth),
movies, theatres, showtimes, seat locking, and bookings.

## New Tables
1. `profiles` - Extends auth.users with role (user/admin) and full name.
2. `movies` - Catalog: poster, banner, trailer, cast, rating, trending flag.
3. `theatres` - Cinema locations with screens count.
4. `showtimes` - Movie at a theatre at a date/time with seat map dims and price.
5. `seat_locks` - Temporary real-time seat locks with TTL expiry (prevents double-booking).
6. `bookings` - Confirmed bookings with auto-generated human-readable booking ID.

## Security (RLS)
- profiles: users read/update own; admins read all.
- movies, theatres, showtimes: public read; admin-only write.
- seat_locks: authenticated read all; users manage own locks.
- bookings: users read/insert/update own; admins read all.
- Admin via security definer function is_admin().
*/

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- movies
CREATE TABLE IF NOT EXISTS public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  genre text NOT NULL,
  language text NOT NULL,
  duration int NOT NULL DEFAULT 120,
  rating numeric(3,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 10),
  poster_url text NOT NULL DEFAULT '',
  banner_url text NOT NULL DEFAULT '',
  trailer_url text NOT NULL DEFAULT '',
  synopsis text NOT NULL DEFAULT '',
  cast_list text[] NOT NULL DEFAULT '{}',
  is_trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- theatres
CREATE TABLE IF NOT EXISTS public.theatres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  screens int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- showtimes
CREATE TABLE IF NOT EXISTS public.showtimes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  screen_name text NOT NULL DEFAULT 'Screen 1',
  show_date date NOT NULL,
  show_time time NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  rows int NOT NULL DEFAULT 10,
  cols int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- seat_locks
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id uuid NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  seat_label text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (showtime_id, seat_label)
);

-- bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  showtime_id uuid NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  seats text[] NOT NULL,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  booking_id text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to check admin role (security definer)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theatres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- movies policies
DROP POLICY IF EXISTS "movies_select_public" ON public.movies;
CREATE POLICY "movies_select_public"
  ON public.movies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "movies_insert_admin" ON public.movies;
CREATE POLICY "movies_insert_admin"
  ON public.movies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "movies_update_admin" ON public.movies;
CREATE POLICY "movies_update_admin"
  ON public.movies FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "movies_delete_admin" ON public.movies;
CREATE POLICY "movies_delete_admin"
  ON public.movies FOR DELETE TO authenticated
  USING (public.is_admin());

-- theatres policies
DROP POLICY IF EXISTS "theatres_select_public" ON public.theatres;
CREATE POLICY "theatres_select_public"
  ON public.theatres FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "theatres_insert_admin" ON public.theatres;
CREATE POLICY "theatres_insert_admin"
  ON public.theatres FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "theatres_update_admin" ON public.theatres;
CREATE POLICY "theatres_update_admin"
  ON public.theatres FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "theatres_delete_admin" ON public.theatres;
CREATE POLICY "theatres_delete_admin"
  ON public.theatres FOR DELETE TO authenticated
  USING (public.is_admin());

-- showtimes policies
DROP POLICY IF EXISTS "showtimes_select_public" ON public.showtimes;
CREATE POLICY "showtimes_select_public"
  ON public.showtimes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "showtimes_insert_admin" ON public.showtimes;
CREATE POLICY "showtimes_insert_admin"
  ON public.showtimes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "showtimes_update_admin" ON public.showtimes;
CREATE POLICY "showtimes_update_admin"
  ON public.showtimes FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "showtimes_delete_admin" ON public.showtimes;
CREATE POLICY "showtimes_delete_admin"
  ON public.showtimes FOR DELETE TO authenticated
  USING (public.is_admin());

-- seat_locks policies
DROP POLICY IF EXISTS "seat_locks_select_authenticated" ON public.seat_locks;
CREATE POLICY "seat_locks_select_authenticated"
  ON public.seat_locks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "seat_locks_insert_own" ON public.seat_locks;
CREATE POLICY "seat_locks_insert_own"
  ON public.seat_locks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "seat_locks_delete_own" ON public.seat_locks;
CREATE POLICY "seat_locks_delete_own"
  ON public.seat_locks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seat_locks_update_own" ON public.seat_locks;
CREATE POLICY "seat_locks_update_own"
  ON public.seat_locks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- bookings policies
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON public.showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtimes_theatre ON public.showtimes(theatre_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_showtime ON public.bookings(showtime_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_showtime ON public.seat_locks(showtime_id);
CREATE INDEX IF NOT EXISTS idx_movies_trending ON public.movies(is_trending);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
