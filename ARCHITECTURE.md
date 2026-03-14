# The Memory Palace — Architecture Blueprint

> Reference document for all development threads.
> Last updated: March 14, 2026

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 14** (App Router) | SSR, file-based routing, React Server Components |
| 3D Engine | **React Three Fiber** + Three.js | React-native 3D, declarative scenes |
| Auth | **Supabase Auth** | Email/password + social logins, EU hosting |
| Database | **Supabase PostgreSQL** (Frankfurt) | GDPR-compliant, Row Level Security |
| File Storage | **Supabase Storage** (Frankfurt) | Photos, videos, documents up to 5GB |
| Styling | **Tailwind CSS** + CSS Modules | Utility-first + scoped 3D component styles |
| State | **Zustand** | Lightweight, works with R3F |
| Deployment | **Vercel** (EU region) | Edge functions, automatic CI/CD |
| Analytics | **PostHog** (EU) | Product analytics, GDPR-friendly |

---

## 2. Project Structure

```
the-memory-palace/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Landing page (marketing)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (app)/                    # Authenticated routes
│   │   ├── layout.tsx            # App shell (sidebar, top bar)
│   │   ├── palace/page.tsx       # Main 3D palace view
│   │   ├── onboarding/page.tsx   # First-time wizard
│   │   └── settings/page.tsx     # Account, sharing, privacy
│   └── api/
│       ├── memories/route.ts     # CRUD for memories
│       └── sharing/route.ts      # Room sharing logic
│
├── components/
│   ├── 3d/                       # All Three.js / R3F components
│   │   ├── ExteriorScene.tsx     # Tuscan hilltop villa
│   │   ├── CorridorScene.tsx     # Wing-specific gallery hallways
│   │   ├── InteriorScene.tsx     # Cosy den rooms
│   │   ├── MemoryObjects/        # Individual memory display types
│   │   │   ├── PhotoFrame.tsx    # Framed photos on walls
│   │   │   ├── VideoScreen.tsx   # Cinema screen with playback
│   │   │   ├── Album.tsx         # Open books on coffee table
│   │   │   ├── Orb.tsx           # Floating memory spheres
│   │   │   ├── Journal.tsx       # Vinyl-style journal entries
│   │   │   └── Vitrine.tsx       # Display cases
│   │   ├── environment/
│   │   │   ├── TuscanLandscape.tsx
│   │   │   ├── SkyDome.tsx
│   │   │   └── Lighting.tsx
│   │   └── navigation/
│   │       ├── FirstPersonControls.tsx
│   │       ├── Portal.tsx        # Transition animations
│   │       └── Minimap.tsx
│   │
│   ├── ui/                       # 2D interface components
│   │   ├── Onboarding/
│   │   │   ├── WelcomeStep.tsx
│   │   │   ├── NameStep.tsx
│   │   │   ├── GoalStep.tsx
│   │   │   ├── WingStep.tsx
│   │   │   └── RevealStep.tsx
│   │   ├── UploadPanel.tsx
│   │   ├── SharingPanel.tsx
│   │   ├── MemoryDetail.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── TopBar.tsx
│   │
│   └── landing/                  # Marketing page components
│       ├── Hero.tsx
│       ├── Features.tsx
│       ├── HowItWorks.tsx
│       └── Testimonials.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── stores/
│   │   ├── palaceStore.ts        # Zustand: wings, rooms, navigation state
│   │   ├── memoryStore.ts        # Zustand: memories CRUD, upload state
│   │   └── userStore.ts          # Zustand: user profile, preferences
│   ├── hooks/
│   │   ├── useMemories.ts        # Fetch/mutate memories for a room
│   │   ├── useNavigation.ts      # Palace → Corridor → Room transitions
│   │   └── useSharing.ts         # Room sharing logic
│   └── constants/
│       ├── wings.ts              # Wing definitions (layout, colors, rooms)
│       ├── design.ts             # Design tokens (Sunlit Gallery)
│       └── defaults.ts           # Default room templates
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_wings_rooms.sql
│   │   ├── 003_memories.sql
│   │   ├── 004_sharing.sql
│   │   └── 005_rls_policies.sql
│   └── seed.sql                  # Demo data for development
│
├── public/
│   ├── textures/                 # Wood, marble, fabric textures
│   ├── models/                   # Optional: GLTF models for furniture
│   └── audio/                    # Ambient sounds per wing
│
└── design/
    ├── tokens.json               # Sunlit Gallery design tokens
    └── wireframes/               # Figma exports
```

---

## 3. Database Schema

```sql
-- ═══ PROFILES ═══
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text,                        -- preserve | legacy | share | organize
  first_wing text,                  -- chosen during onboarding
  onboarded boolean default false,
  avatar_url text,
  created_at timestamptz default now()
);

-- ═══ WINGS ═══
-- Wings are fixed (5 per palace) but user can customize names/colors
create table wings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  slug text not null,               -- family | travel | childhood | career | creativity
  custom_name text,                 -- user can rename
  accent_color text,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique(user_id, slug)
);

-- ═══ ROOMS ═══
create table rooms (
  id uuid primary key default gen_random_uuid(),
  wing_id uuid references wings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  icon text default '📁',
  cover_hue int default 30,
  sort_order int default 0,
  is_shared boolean default false,
  created_at timestamptz default now()
);

-- ═══ MEMORIES ═══
create table memories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  type text not null,                -- photo | video | album | orb | journal | case
  file_path text,                    -- Supabase Storage path
  file_url text,                     -- Public or signed URL
  thumbnail_url text,
  metadata jsonb default '{}',       -- EXIF, duration, dimensions
  hue int default 30,
  saturation int default 45,
  lightness int default 60,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ SHARING ═══
create table room_shares (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  owner_id uuid references profiles(id) on delete cascade,
  shared_with_email text not null,
  shared_with_id uuid references profiles(id),  -- null until they accept
  permission text default 'view',    -- view | contribute | admin
  accepted boolean default false,
  created_at timestamptz default now()
);

-- ═══ ROW LEVEL SECURITY ═══
alter table profiles enable row level security;
alter table wings enable row level security;
alter table rooms enable row level security;
alter table memories enable row level security;
alter table room_shares enable row level security;

-- Users see only their own data
create policy "own_profile" on profiles for all using (id = auth.uid());
create policy "own_wings" on wings for all using (user_id = auth.uid());
create policy "own_rooms" on rooms for all using (user_id = auth.uid());
create policy "own_memories" on memories for all using (user_id = auth.uid());

-- Shared rooms: viewers can read rooms + memories shared with them
create policy "shared_rooms_read" on rooms for select using (
  id in (select room_id from room_shares where shared_with_id = auth.uid() and accepted = true)
);
create policy "shared_memories_read" on memories for select using (
  room_id in (select room_id from room_shares where shared_with_id = auth.uid() and accepted = true)
);
```

---

## 4. Design System — "The Sunlit Gallery"

```typescript
export const design = {
  color: {
    linen:      '#FAFAF7',  // Background
    warmStone:  '#F2EDE7',  // Cards, panels
    sandstone:  '#D4C5B2',  // Borders, muted elements
    walnut:     '#8B7355',  // Secondary text
    sage:       '#4A6741',  // Success, nature accents
    terracotta: '#C17F59',  // Primary CTA, accent
    charcoal:   '#2C2C2A',  // Headings, primary text
    cream:      '#EEEAE3',  // Hover states
    muted:      '#9A9183',  // Secondary text
  },
  font: {
    display: "'Cormorant Garamond', Georgia, serif",    // Headings, names
    body:    "'Source Sans 3', system-ui, sans-serif",   // Body, UI
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  shadow: {
    card: '0 2px 12px rgba(44,44,42,0.06)',
    panel: '0 8px 32px rgba(44,44,42,0.12)',
    elevated: '0 12px 48px rgba(44,44,42,0.16)',
  },
} as const;
```

---

## 5. Wing Configurations

Each wing has unique spatial dimensions, materials, and atmosphere:

| Wing | Width | Height | Floor | Ceiling | Statue | Accent |
|------|-------|--------|-------|---------|--------|--------|
| Family | 9m | 6m | Herringbone | Coffered + gold rosettes | Tree of Life | #C17F59 |
| Travel | 7.5m | 6.5m | Marble strip + gold inlay | Vaulted dark beams | Globe | #4A6741 |
| Childhood | 10m | 5m | Checkerboard | Painted | Carousel | #B8926A |
| Career | 8m | 7m | Dark parquet double-layer | Modern grid | Obelisk | #8B7355 |
| Creativity | 9.5m | 5.8m | Mosaic tiles | Exposed beams | Muse | #9B6B8E |

---

## 6. Memory Types → Room Placement

| Type | 3D Object | Location in Room |
|------|----------|-----------------|
| photo | Framed canvas | Overmantel (1st), mantel frame (2nd), wall frames (3-5) |
| album | Open book | Coffee table |
| video | Cinema screen | Right wall — HTML5 video playback |
| orb | Floating sphere | Mid-air, animated bob + pulse |
| journal | Vinyl sleeve | Leaning against turntable table |
| case | Display vitrine | Bookshelf area |

---

## 7. Navigation Flow

```
Landing Page (/):
  └─→ Register → Onboarding Wizard (name, goal, first wing)
        └─→ Palace View (/palace)

Palace View:
  Exterior (bird's-eye Tuscan hilltop)
    └─→ click wing → Corridor (first-person gallery)
          └─→ click door → Room (cosy den interior)
                └─→ interact with memories
                └─→ upload new memories
                └─→ manage sharing
          └─→ click portal → back to Exterior
    └─→ Minimap: direct navigation to any room
```

---

## 8. Thread Strategy for Development

Work in focused threads, one feature area at a time:

| Thread | Scope | Dependencies |
|--------|-------|-------------|
| **1. Project Setup** | Next.js + Supabase + Tailwind + R3F scaffold | None |
| **2. Auth & Profiles** | Login, register, onboarding, profile | Thread 1 |
| **3. Exterior Scene** | R3F port of ExteriorScene + Tuscan landscape | Thread 1 |
| **4. Corridor Scenes** | R3F port of 5 CorridorScenes | Thread 3 |
| **5. Room Interiors** | R3F port of InteriorScene + memory objects | Thread 4 |
| **6. Memory CRUD** | Upload, display, edit, delete via Supabase | Thread 2, 5 |
| **7. Sharing** | Room sharing, invites, permissions | Thread 2, 6 |
| **8. Polish** | Sound, performance, mobile touch, animations | All |

Reference this document + the prototype JSX in every thread.

---

## 9. What We Have (Prototype)

- `palace-final.jsx` — 1656 lines, full working prototype
  - ExteriorScene, CorridorScene, InteriorScene
  - Onboarding wizard (5 steps)
  - Upload panel (URL + file), Sharing panel
  - Minimap, breadcrumbs, memory detail overlay
  - Camera-relative WASD + arrow key movement
  - Portal transitions with crossfade + golden flash

- `palace-landing.jsx` — 311 lines, marketing landing page

---

## 10. Target Users

**Heritage Keepers** (60+): Life-span visualization, preservation
**Legacy Guardians** (parents/grandparents): Legacy continuity, "in case something happens"

Design implications: Large text, warm tone, simple navigation, no tech jargon, guided experiences.
