-- Add bust_model_url column for storing 3D .glb bust model URLs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bust_model_url TEXT DEFAULT NULL;

-- Create busts storage bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public) VALUES ('busts', 'busts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload busts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'busts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to busts
CREATE POLICY "Public bust read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'busts');

-- Allow users to update/delete their own busts
CREATE POLICY "Users can manage own busts" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'busts' AND (storage.foldername(name))[1] = auth.uid()::text);
