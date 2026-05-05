create table if not exists settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table settings enable row level security;

-- Solo la terapeuta logueada puede leer y escribir
create policy "authenticated_full_access" on settings
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
