-- Fix the broken trigger function by adding extensions schema to search_path
DROP FUNCTION IF EXISTS set_session_defaults CASCADE;

CREATE OR REPLACE FUNCTION set_session_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS set_session_defaults_trigger ON sessions;
CREATE TRIGGER set_session_defaults_trigger
BEFORE INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION set_session_defaults();

-- Fix existing anonymous sessions that have NULL tokens/expiry
UPDATE sessions 
SET 
  expires_at = created_at + INTERVAL '7 days',
  session_token = encode(gen_random_bytes(32), 'hex')
WHERE is_anonymous = true 
  AND (session_token IS NULL OR expires_at IS NULL);

-- Drop ALL existing RLS policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view accessible sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages from accessible sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in accessible sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their own sessions" ON messages;

-- CRITICAL: Remove anonymous access entirely for maximum privacy
-- Only authenticated users can access their own sessions
CREATE POLICY "Authenticated users can view their own sessions"
ON sessions FOR SELECT
USING (
  auth.uid() = user_id
  AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "Authenticated users can update their own sessions"
ON sessions FOR UPDATE
USING (
  auth.uid() = user_id
  AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "Authenticated users can create sessions"
ON sessions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Authenticated users can view their own messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions
    WHERE sessions.id = messages.session_id
      AND auth.uid() = sessions.user_id
      AND (sessions.expires_at IS NULL OR sessions.expires_at > NOW())
  )
);

CREATE POLICY "Authenticated users can create messages in their own sessions"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM sessions
    WHERE sessions.id = messages.session_id
      AND auth.uid() = sessions.user_id
      AND (sessions.expires_at IS NULL OR sessions.expires_at > NOW())
  )
);