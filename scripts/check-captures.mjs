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
  const { data: captures, error } = await supabase
    .from('kep_captures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) { console.log('Error:', error.message); return; }

  console.log(`Found ${captures.length} capture(s):\n`);
  for (const c of captures) {
    console.log(`  ID: ${c.id}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  Type: ${c.media_type}`);
    console.log(`  Sender: ${c.source_sender}`);
    console.log(`  Preview:`, c.payload_preview);
    console.log(`  Created: ${c.created_at}`);
    console.log('');
  }

  // Check job queue
  const { data: jobs } = await supabase
    .from('job_queue')
    .select('*')
    .eq('type', 'kep_capture')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Found ${jobs?.length || 0} kep_capture job(s):\n`);
  for (const j of (jobs || [])) {
    console.log(`  ID: ${j.id} | Status: ${j.status} | Payload:`, j.payload);
  }
}

check();
