/*
  # Add Structured Fields to Requests Table

  ## Overview
  Enhances the requests table with additional structured fields for better request management.

  ## Changes
  
  ### Requests Table Modifications
  - `request_type` (text, not null) - Type of request: 'Leave Application', 'Fund Request', 'Promotion Request', 'Sponsorship Request', 'Other'
  - `from_date` (date, nullable) - Start date for applicable requests
  - `to_date` (date, nullable) - End date for applicable requests
  - `reason` (text, not null) - Detailed reason or description for the request

  ## Notes
  - New columns are added with appropriate defaults and constraints
  - request_type replaces the generic message categorization approach
  - Date fields are flexible to support various request types
  - reason field stores the detailed description provided by the employee
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'request_type'
  ) THEN
    ALTER TABLE requests ADD COLUMN request_type text NOT NULL DEFAULT 'Other' CHECK (request_type IN ('Leave Application', 'Fund Request', 'Promotion Request', 'Sponsorship Request', 'Other'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'from_date'
  ) THEN
    ALTER TABLE requests ADD COLUMN from_date date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'to_date'
  ) THEN
    ALTER TABLE requests ADD COLUMN to_date date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'reason'
  ) THEN
    ALTER TABLE requests ADD COLUMN reason text NOT NULL DEFAULT '';
  END IF;
END $$;
