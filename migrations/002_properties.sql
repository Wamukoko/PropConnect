-- PropConnect Migration 002: Property Inventory
-- Creates: property types, properties, property_photos, locations, location_aliases

-- ============================================================
-- Enum types
-- ============================================================
create type property_type as enum (
  'apartment', 'house', 'townhouse', 'villa', 'maisonette',
  'land', 'office', 'shop', 'warehouse', 'commercial', 'serviced_apartment'
);

create type listing_type as enum ('sale', 'rent', 'lease');

create type listing_status as enum (
  'draft', 'pending_review', 'published', 'available',
  'reserved', 'under_offer', 'let', 'sold',
  'withdrawn', 'expired', 'archived'
);

-- ============================================================
-- locations
-- ============================================================
create table locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  name text not null,
  slug text not null,
  location_type text not null
    check (location_type in ('country', 'county', 'city', 'sub_county', 'neighbourhood', 'estate')),
  parent_id uuid references locations(id),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique(account_id, slug)
);

alter table locations enable row level security;

create policy "tenant_isolation_locations" on locations
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

create index idx_locations_account on locations(account_id);
create index idx_locations_parent on locations(parent_id);
create index idx_locations_slug on locations(account_id, slug);

-- ============================================================
-- location_aliases
-- ============================================================
create table location_aliases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  location_id uuid not null references locations(id),
  alias text not null,
  unique(account_id, location_id, alias)
);

alter table location_aliases enable row level security;

create policy "tenant_isolation_location_aliases" on location_aliases
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

-- ============================================================
-- properties
-- ============================================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  title text not null,
  reference_code text,
  description text,
  property_type property_type not null,
  listing_type listing_type not null,
  status listing_status not null default 'draft',
  price numeric not null check (price >= 0),
  currency text not null default 'KES',
  bedrooms int check (bedrooms >= 0),
  bathrooms int check (bathrooms >= 0),
  floor_area numeric check (floor_area >= 0),
  land_area numeric check (land_area >= 0),
  furnished boolean,
  parking_spaces int check (parking_spaces >= 0),
  amenities jsonb not null default '[]',
  location_id uuid references locations(id),
  latitude double precision,
  longitude double precision,
  public_location_text text,
  availability_date date,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references agents(id),
  updated_by uuid references agents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties enable row level security;

create policy "tenant_isolation_properties" on properties
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

create index idx_properties_account on properties(account_id);
create index idx_properties_location on properties(location_id);
create index idx_properties_status on properties(status);
create index idx_properties_type on properties(property_type);
create index idx_properties_listing on properties(listing_type);
create index idx_properties_price on properties(price);

-- ============================================================
-- property_photos
-- ============================================================
create table property_photos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  alt_text text,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table property_photos enable row level security;

create policy "tenant_isolation_property_photos" on property_photos
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

create index idx_property_photos_property on property_photos(property_id);
create index idx_property_photos_account on property_photos(account_id);

-- ============================================================
-- Seed Nairobi locations for Qabila Realtors
-- ============================================================
insert into locations (account_id, name, slug, location_type)
values
  ('00000000-0000-0000-0000-000000000001', 'Kenya', 'kenya', 'country'),
  ('00000000-0000-0000-0000-000000000001', 'Nairobi County', 'nairobi-county', 'county'),
  ('00000000-0000-0000-0000-000000000001', 'Nairobi', 'nairobi', 'city');

insert into locations (account_id, name, slug, location_type, parent_id)
select
  '00000000-0000-0000-0000-000000000001',
  loc.name,
  loc.slug,
  loc.location_type,
  (select id from locations where slug = 'nairobi' and account_id = '00000000-0000-0000-0000-000000000001')
from (values
  ('Kilimani', 'kilimani', 'neighbourhood'),
  ('Westlands', 'westlands', 'neighbourhood'),
  ('Karen', 'karen', 'neighbourhood'),
  ('Lavington', 'lavington', 'neighbourhood'),
  ('Kasarani', 'kasarani', 'sub_county'),
  ('Langata', 'langata', 'sub_county'),
  ('Dagoretti', 'dagoretti', 'sub_county'),
  ('Eastleigh', 'eastleigh', 'neighbourhood'),
  ('CBD', 'cbd', 'neighbourhood'),
  ('South B', 'south-b', 'neighbourhood'),
  ('South C', 'south-c', 'neighbourhood'),
  ('Kileleshwa', 'kileleshwa', 'neighbourhood'),
  ('Hurlingham', 'hurlingham', 'neighbourhood'),
  ('Spring Valley', 'spring-valley', 'neighbourhood'),
  ('Runda', 'runda', 'neighbourhood'),
  ('Muthaiga', 'muthaiga', 'neighbourhood'),
  ('Garden Estate', 'garden-estate', 'estate'),
  ('Nyali Heights', 'nyali-heights', 'estate')
) as loc(name, slug, location_type);
