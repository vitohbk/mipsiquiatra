create table if not exists public.booking_action_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  action text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint booking_action_tokens_action_check check (action in ('cancel', 'reschedule'))
);

create index if not exists booking_action_tokens_booking_id_idx
  on public.booking_action_tokens (booking_id);

create index if not exists booking_action_tokens_expires_at_idx
  on public.booking_action_tokens (expires_at);
