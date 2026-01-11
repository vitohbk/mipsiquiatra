create extension if not exists btree_gist;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    professional_user_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status = 'confirmed' and professional_user_id is not null);
