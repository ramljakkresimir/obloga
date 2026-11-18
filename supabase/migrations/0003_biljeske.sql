-- 0003_biljeske (primijenjeno preko MCP-a, verzija 20261118180314)

create table public.biljeske (
  id           bigint generated always as identity primary key,
  tekst        text not null check (length(trim(tekst)) > 0),
  obavljeno    boolean not null default false,
  obavljeno_at timestamptz,
  created_by   uuid default auth.uid() references public.vlasnici (user_id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index biljeske_obavljeno_created_idx on public.biljeske (obavljeno, created_at desc);
create index biljeske_created_by_idx        on public.biljeske (created_by);
