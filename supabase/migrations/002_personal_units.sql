-- Migration: Add personal units to my_foods
-- Units are stored as JSONB: {"slice": 25, "cup": 80, "scoop": 30} (unit name -> grams)
-- Run this in Supabase SQL editor or via migration tool

-- Add units column to my_foods (ALREADY APPLIED)
-- ALTER TABLE public.my_foods ADD COLUMN IF NOT EXISTS units JSONB DEFAULT '{}'::jsonb;

-- Add cooked_factor column if not exists (run this if not already present)
ALTER TABLE public.my_foods ADD COLUMN IF NOT EXISTS cooked_factor NUMERIC DEFAULT NULL;

-- Optional: Add comment for documentation
COMMENT ON COLUMN public.my_foods.units IS 'Personal unit definitions as {unit_name: grams}, e.g. {"slice": 25, "cup": 80}';
