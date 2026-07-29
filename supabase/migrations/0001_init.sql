-- Calendrier Éditorial KMI — schéma initial
-- Outil interne mono-utilisateur : tout est accessible au rôle `authenticated`.

create extension if not exists pgcrypto;

-- Marques ---------------------------------------------------------------

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- "Studio By KM", "Bornia", "KMI Group", "Vumos"
  website_url text,
  brand_profile text,                 -- fiche de connaissance riche (onboarding marque)
  editorial_guidelines text,          -- interdits, longueur, emojis, CTA type
  onboarding_answers jsonb,           -- réponses brutes du questionnaire (étape 2)
  color_hex text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Réseaux activés par marque -------------------------------------------

create table if not exists brand_platforms (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'facebook', 'tiktok')),
  active boolean default true,
  unique (brand_id, platform)
);

-- Sujets / thèmes sources ----------------------------------------------

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null,
  angle text,                         -- angle / info clé à faire passer
  details text,                       -- chiffres, offre, date, lieu...
  objective text,                     -- 'informer' | 'vendre' | 'engager' | 'recruter'...
  selected_platforms text[] not null default '{}',
  created_at timestamptz default now()
);

-- Posts générés (un par plateforme par sujet) --------------------------

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'facebook', 'tiktok')),
  content text not null,
  hashtags text[] default '{}',
  media_suggestion text,              -- description de l'image/vidéo à créer
  status text not null default 'draft' check (status in ('draft', 'valide', 'publie')),
  scheduled_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists posts_scheduled_date_idx on posts (scheduled_date);
create index if not exists posts_brand_idx on posts (brand_id);
create index if not exists posts_topic_idx on posts (topic_id);
create index if not exists topics_brand_idx on topics (brand_id);

-- updated_at automatique ------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brands_set_updated_at on brands;
create trigger brands_set_updated_at
  before update on brands
  for each row execute function set_updated_at();

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- RLS -------------------------------------------------------------------
-- Un seul compte admin : le rôle `authenticated` a tous les droits,
-- les visiteurs anonymes n'ont aucun accès.

alter table brands enable row level security;
alter table brand_platforms enable row level security;
alter table topics enable row level security;
alter table posts enable row level security;

drop policy if exists "authenticated full access" on brands;
create policy "authenticated full access" on brands
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on brand_platforms;
create policy "authenticated full access" on brand_platforms
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on topics;
create policy "authenticated full access" on topics
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on posts;
create policy "authenticated full access" on posts
  for all to authenticated using (true) with check (true);
