-- Create appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create availability configuration (optional helper for the therapist)
-- In a simple version, we can just pre-generate 'available' slots in 'appointments' table
CREATE TABLE availability_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_config ENABLE ROW LEVEL SECURITY;

-- Policies for appointments
-- 1. Anyone can see available slots
CREATE POLICY "Public can view available appointments" 
ON appointments FOR SELECT 
USING (status = 'available' OR auth.role() = 'authenticated');

-- 2. Patients can book an available slot
CREATE POLICY "Public can book appointments"
ON appointments FOR UPDATE
USING (status = 'available')
WITH CHECK (status = 'booked');

-- 3. Patients can cancel their own booked slot (returns it to available)
-- Enforced in app: only allowed with 48+ hours of anticipation
CREATE POLICY "Public can cancel booked appointments"
ON appointments FOR UPDATE
USING (status = 'booked')
WITH CHECK (status = 'available');

-- 3. Admins (authenticated) can do everything
CREATE POLICY "Admin full access appointments" 
ON appointments FOR ALL 
USING (auth.role() = 'authenticated');

-- Policies for availability_config
CREATE POLICY "Admin full access config" 
ON availability_config FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Public read config" 
ON availability_config FOR SELECT 
USING (true);
