/*
  # AI Workflow Automation System - Initial Schema

  ## Overview
  Creates the database schema for an AI-powered workflow automation system
  where employees submit requests and managers review them.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text, not null)
  - `role` (text, not null) - Either 'employee' or 'manager'
  - `created_at` (timestamptz, default now())
  
  ### `requests`
  - `id` (uuid, primary key, auto-generated)
  - `employee_id` (uuid, references profiles.id)
  - `message` (text, not null) - The request content
  - `category` (text, not null) - AI-assigned: 'Leave', 'Funds', or 'Promotion'
  - `priority` (text, not null) - AI-assigned: 'High', 'Medium', or 'Low'
  - `status` (text, default 'Pending') - 'Pending', 'Accepted', or 'Rejected'
  - `reviewed_by` (uuid, references profiles.id, nullable)
  - `reviewed_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ## Security (RLS Policies)
  
  ### Profiles Table
  1. Users can read their own profile
  2. Users can insert their own profile during signup
  3. Users can update their own profile
  
  ### Requests Table
  1. Employees can create their own requests
  2. Employees can view their own requests
  3. Managers can view all requests
  4. Managers can update request status (accept/reject)
  5. Employees can view updates to their own requests in real-time

  ## Notes
  - All tables have RLS enabled for security
  - Timestamps are automatically managed
  - Real-time is enabled for the requests table
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employee', 'manager')),
  created_at timestamptz DEFAULT now()
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('Leave', 'Funds', 'Promotion')),
  priority text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Requests Policies
CREATE POLICY "Employees can create own requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can view own requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = employee_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_employee_id ON requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable realtime for requests table
ALTER PUBLICATION supabase_realtime ADD TABLE requests;