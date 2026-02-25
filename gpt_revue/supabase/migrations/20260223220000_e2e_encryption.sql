-- =============================================================================
-- E2E Encryption: Schema Changes
-- =============================================================================

-- 1. Add E2E columns to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ciphertext text,
  ADD COLUMN IF NOT EXISTS nonce text,
  ADD COLUMN IF NOT EXISTS e2e_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sender_device_id uuid;

-- Make content nullable (deprecated, kept for migration compatibility)
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

COMMENT ON COLUMN public.messages.ciphertext IS 'Base64 AES-GCM ciphertext. Server never sees plaintext.';
COMMENT ON COLUMN public.messages.nonce IS 'Base64 AES-GCM 12-byte IV.';
COMMENT ON COLUMN public.messages.e2e_version IS 'E2E protocol version. Currently 1.';
COMMENT ON COLUMN public.messages.sender_device_id IS 'Device that sent this message (references user_devices.id).';

-- 2. User devices: store per-device public keys for E2E key exchange
CREATE TABLE IF NOT EXISTS public.user_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_label text NOT NULL DEFAULT 'default',
  public_key_spki text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_label)
);

COMMENT ON TABLE public.user_devices IS
  'Per-device ECDH P-256 public keys (SPKI, base64). Used for E2E room key distribution.';

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);

-- RLS: users can read all devices (to encrypt room keys for others)
CREATE POLICY "authenticated_read_devices" ON public.user_devices
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS: users can insert/update their own devices only
CREATE POLICY "users_manage_own_devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Update party_room_keys to reference sender device
ALTER TABLE public.party_room_keys
  ADD COLUMN IF NOT EXISTS sender_device_id uuid,
  ADD COLUMN IF NOT EXISTS sender_public_key_spki text;

COMMENT ON COLUMN public.party_room_keys.sender_public_key_spki IS
  'SPKI of the sender device that encrypted this room key. Needed for ECDH unseal.';
