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

async function fix() {
  // Find Bram
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').ilike('display_name', '%guillaume%');
  if (!profiles || profiles.length === 0) {
    // Try all users
    const { data: all } = await supabase.from('profiles').select('id, display_name');
    console.log('No Bram found. All users:', all);
    return;
  }

  const bram = profiles[0];
  console.log('Bram:', bram.id);

  // Update kep owner
  await supabase.from('keps').update({ user_id: bram.id }).eq('id', 'b3229678-5b62-4564-9787-052c853a703c');
  console.log('Kep reassigned to Bram');

  // Update whatsapp_links
  await supabase.from('whatsapp_links').update({ user_id: bram.id }).eq('kep_id', 'b3229678-5b62-4564-9787-052c853a703c');
  console.log('WhatsApp link reassigned');

  // Update captures
  await supabase.from('kep_captures').update({ user_id: bram.id }).eq('kep_id', 'b3229678-5b62-4564-9787-052c853a703c');
  console.log('Captures reassigned');

  console.log('Done! Refresh the page.');
}

fix();
