-- Victoria's Apartment Finder — RAG Embeddings
-- Migration: 20260331100000_rag_embeddings

-- ============================================================
-- 1. Enable pgvector extension
-- ============================================================
create extension if not exists vector with schema extensions;

-- ============================================================
-- 2. Apartment document embeddings table
-- ============================================================
create table public.apartment_embeddings (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  chunk_index integer not null default 0,
  content text not null,
  embedding extensions.vector(1024) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz default now() not null,
  unique (apartment_id, chunk_index)
);

alter table public.apartment_embeddings enable row level security;

-- Anyone can read embeddings (needed by the AI agent via service role)
create policy "Service role can read embeddings"
  on public.apartment_embeddings for select using (true);

-- Only service role inserts/updates (via API route)
create policy "Service role can manage embeddings"
  on public.apartment_embeddings for insert with check (true);

create policy "Service role can update embeddings"
  on public.apartment_embeddings for update using (true);

create policy "Service role can delete embeddings"
  on public.apartment_embeddings for delete using (true);

-- ============================================================
-- 3. Neighborhood knowledge embeddings
-- ============================================================
create table public.knowledge_embeddings (
  id uuid default gen_random_uuid() primary key,
  source_type text not null check (source_type in ('neighborhood', 'market_insight', 'faq')),
  source_id text not null,
  chunk_index integer not null default 0,
  content text not null,
  embedding extensions.vector(1024) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz default now() not null,
  unique (source_type, source_id, chunk_index)
);

alter table public.knowledge_embeddings enable row level security;

create policy "Anyone can read knowledge embeddings"
  on public.knowledge_embeddings for select using (true);

create policy "Service role can manage knowledge embeddings"
  on public.knowledge_embeddings for insert with check (true);

create policy "Service role can update knowledge embeddings"
  on public.knowledge_embeddings for update using (true);

create policy "Service role can delete knowledge embeddings"
  on public.knowledge_embeddings for delete using (true);

-- ============================================================
-- 4. HNSW indexes for fast vector similarity search
-- ============================================================
create index idx_apartment_embeddings_vector
  on public.apartment_embeddings
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index idx_knowledge_embeddings_vector
  on public.knowledge_embeddings
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index idx_apartment_embeddings_apartment
  on public.apartment_embeddings(apartment_id);

create index idx_knowledge_embeddings_source
  on public.knowledge_embeddings(source_type, source_id);

-- ============================================================
-- 5. RPC: match_apartments — semantic search over apartment docs
-- ============================================================
create or replace function public.match_apartments(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 10,
  filter_city text default null,
  filter_type text default null,
  filter_max_rent int default null
)
returns table (
  apartment_id uuid,
  chunk_index int,
  content text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    ae.apartment_id,
    ae.chunk_index,
    ae.content,
    1 - (ae.embedding <=> query_embedding) as similarity,
    ae.metadata
  from public.apartment_embeddings ae
  inner join public.apartments a on a.id = ae.apartment_id
  where a.is_available = true
    and 1 - (ae.embedding <=> query_embedding) > match_threshold
    and (filter_city is null or a.city = filter_city)
    and (filter_type is null or a.apartment_type = filter_type)
    and (filter_max_rent is null or a.annual_rent <= filter_max_rent)
  order by ae.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- 6. RPC: match_knowledge — semantic search over knowledge base
-- ============================================================
create or replace function public.match_knowledge(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.5,
  match_count int default 5,
  filter_source_type text default null
)
returns table (
  source_type text,
  source_id text,
  chunk_index int,
  content text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    ke.source_type,
    ke.source_id,
    ke.chunk_index,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.metadata
  from public.knowledge_embeddings ke
  where 1 - (ke.embedding <=> query_embedding) > match_threshold
    and (filter_source_type is null or ke.source_type = filter_source_type)
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;
