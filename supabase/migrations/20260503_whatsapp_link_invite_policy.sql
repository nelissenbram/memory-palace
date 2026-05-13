-- Allow any authenticated user to look up a whatsapp_link by invite_code
-- This is needed for the /kep/join/[code] and /kep/palace/[code] flows
CREATE POLICY "Authenticated users can lookup link by invite code"
  ON whatsapp_links FOR SELECT
  TO authenticated
  USING (invite_code IS NOT NULL);
