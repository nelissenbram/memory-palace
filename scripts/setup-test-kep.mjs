import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)="?([^"]*)"?$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  // Get first user
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) { console.log('No users found'); return; }
  const userId = profiles[0].id;
  console.log('User:', userId);

  // Create a Kep
  const { data: kep, error: kepErr } = await supabase.from('keps').insert({
    user_id: userId,
    name: 'Family WhatsApp',
    description: 'Photos from family group',
    icon: '👨‍👩‍👧‍👦',
    source_type: 'whatsapp',
    status: 'active',
    auto_route_enabled: true,
  }).select().single();

  if (kepErr) { console.log('Kep error:', kepErr.message); return; }
  console.log('Kep created:', kep.id);

  // Create WhatsApp link
  const { data: link, error: linkErr } = await supabase.from('whatsapp_links').insert({
    kep_id: kep.id,
    user_id: userId,
    wa_group_id: 'test-family-group',
    wa_group_name: 'Family Photos',
    phone_number_id: '996760096865134',
    verified: true,
    verified_at: new Date().toISOString(),
  }).select().single();

  if (linkErr) { console.log('Link error:', linkErr.message); return; }
  console.log('WhatsApp link created:', link.id);
  console.log('Ready! Send a test message now.');
}

setup();
