/*
  # Notifications, Manager Comment, and Performance Support

  ## New Tables
  - notifications: for manager notices and recognition to employees
  - Add manager_comment to requests for accept/reject feedback
*/

-- Add manager_comment to requests (optional note when accepting/rejecting)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'manager_comment'
  ) THEN
    ALTER TABLE requests ADD COLUMN manager_comment text;
  END IF;
END $$;

-- Notifications table: notices and recognition from manager to employee
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('notice', 'recognition', 'info', 'salary_review')),
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can update own notifications (mark read)"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Managers can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Allow managers to view all profiles (for team/performance dashboard)
CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
  );
