-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS set_session_defaults CASCADE;

-- Create function to set session expiry and token on insert
CREATE OR REPLACE FUNCTION set_session_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set expiration for anonymous sessions (7 days)
  IF NEW.is_anonymous THEN
    NEW.expires_at = NOW() + INTERVAL '7 days';
    -- Generate secure random token for anonymous sessions
    NEW.session_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_session_defaults_trigger ON sessions;
CREATE TRIGGER set_session_defaults_trigger
BEFORE INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION set_session_defaults();

-- Drop existing RLS policies for sessions and messages
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view accessible sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON messages;
DROP POLICY IF EXISTS "Users can view messages from accessible sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in accessible sessions" ON messages;

-- Create security definer function to check session access
CREATE OR REPLACE FUNCTION has_session_access(_session_id uuid, _session_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sessions
    WHERE id = _session_id
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        (auth.uid() = user_id) 
        OR 
        (is_anonymous = true AND user_id IS NULL AND session_token = _session_token)
      )
  )
$$;

-- New RLS policies for sessions with expiration check
CREATE POLICY "Users can view accessible sessions"
ON sessions FOR SELECT
USING (
  (expires_at IS NULL OR expires_at > NOW())
  AND (
    (auth.uid() = user_id) 
    OR (is_anonymous = true AND user_id IS NULL)
  )
);

CREATE POLICY "Users can update their own sessions"
ON sessions FOR UPDATE
USING (
  (expires_at IS NULL OR expires_at > NOW())
  AND (
    (auth.uid() = user_id) 
    OR (is_anonymous = true AND user_id IS NULL)
  )
);

CREATE POLICY "Users can create sessions"
ON sessions FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  OR (is_anonymous = true AND user_id IS NULL)
);

-- New RLS policies for messages with expiration check
CREATE POLICY "Users can view messages from accessible sessions"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions
    WHERE sessions.id = messages.session_id
      AND (sessions.expires_at IS NULL OR sessions.expires_at > NOW())
      AND (
        (auth.uid() = sessions.user_id) 
        OR (sessions.is_anonymous = true AND sessions.user_id IS NULL)
      )
  )
);

CREATE POLICY "Users can create messages in accessible sessions"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sessions
    WHERE sessions.id = messages.session_id
      AND (sessions.expires_at IS NULL OR sessions.expires_at > NOW())
      AND (
        (auth.uid() = sessions.user_id) 
        OR (sessions.is_anonymous = true AND sessions.user_id IS NULL)
      )
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);