-- Create a manager-safe RPC to update attendance records for subordinates.
-- Run this in Supabase SQL editor.
-- Requires that RLS allows calling the function; the function itself executes with SECURITY DEFINER to bypass row-level restrictions.

create or replace function update_attendance_as_manager(
    p_attendance_id bigint,
    p_clock_in timestamptz default null,
    p_clock_out timestamptz default null,
    p_status text default null,
    p_lokasi_kerja text default null,
    p_tempat_kerja text default null,
    p_clock_in_coords jsonb default null,
    p_clock_out_coords jsonb default null,
    p_clock_in_address text default null,
    p_clock_out_address text default null
)
returns setof attendance
language plpgsql
security definer
as $$
begin
  update attendance
     set clock_in = coalesce(p_clock_in, clock_in),
         clock_out = coalesce(p_clock_out, clock_out),
         status = coalesce(p_status, status),
         lokasi_kerja = coalesce(p_lokasi_kerja, lokasi_kerja),
         tempat_kerja = coalesce(p_tempat_kerja, tempat_kerja),
         clock_in_coords = coalesce(p_clock_in_coords, clock_in_coords),
         clock_out_coords = coalesce(p_clock_out_coords, clock_out_coords),
         clock_in_address = coalesce(p_clock_in_address, clock_in_address),
         clock_out_address = coalesce(p_clock_out_address, clock_out_address),
         updated_at = now()
   where id = p_attendance_id;

  return query
    select *
      from attendance
     where id = p_attendance_id;
end;
$$;

grant execute on function update_attendance_as_manager(bigint, timestamptz, timestamptz, text, text, text, jsonb, jsonb, text, text) to anon, authenticated;
