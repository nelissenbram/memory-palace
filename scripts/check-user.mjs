import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)="?([^"]*)"?$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // List all profiles
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').limit(5);
  console.log('Profiles:', profiles);

  // Check kep owner
  const { data: keps } = await supabase.from('keps').select('id, user_id, name');
  console.log('Keps:', keps);
}

check();
