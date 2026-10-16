-- Kanshi shared notes: run this in Supabase Dashboard > SQL Editor.
-- Public shared board: anyone who can access the site can read, create, edit, and delete notes.
create table if not exists public.kanshi_notes (
  note_date date not null,
  task_name text not null check (char_length(task_name) between 1 and 100),
  content text not null check (char_length(content) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (note_date, task_name)
);

alter table public.kanshi_notes enable row level security;

drop policy if exists "Public can read Kanshi notes" on public.kanshi_notes;
create policy "Public can read Kanshi notes"
  on public.kanshi_notes for select to anon, authenticated
  using (true);

drop policy if exists "Public can add Kanshi notes" on public.kanshi_notes;
create policy "Public can add Kanshi notes"
  on public.kanshi_notes for insert to anon, authenticated
  with check (true);

drop policy if exists "Public can edit Kanshi notes" on public.kanshi_notes;
create policy "Public can edit Kanshi notes"
  on public.kanshi_notes for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public can delete Kanshi notes" on public.kanshi_notes;
create policy "Public can delete Kanshi notes"
  on public.kanshi_notes for delete to anon, authenticated
  using (true);

grant select, insert, update, delete on public.kanshi_notes to anon, authenticated;

create or replace function public.set_kanshi_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kanshi_notes_updated_at on public.kanshi_notes;
create trigger kanshi_notes_updated_at
before update on public.kanshi_notes
for each row execute function public.set_kanshi_notes_updated_at();
