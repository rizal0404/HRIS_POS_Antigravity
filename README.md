# Rancangan Teknis: Prototipe Aplikasi HRIS

Dokumen ini merinci rancangan teknis untuk prototipe aplikasi Human Resource Information System (HRIS) dengan fokus pada manajemen presensi, cuti, lembur, dan persetujuan.

## 1. Gambaran Umum
Aplikasi ini dirancang untuk tiga peran utama dengan alur persetujuan (approval) yang jelas antara bawahan dan atasan. Superadmin bertindak sebagai pengelola sistem.

- **Modul Utama**: Autentikasi, Manajemen Presensi (Absensi), Manajemen Pengajuan (Cuti, Lembur, Izin, Sakit, Substitusi, Koreksi Absensi), Manajemen Laporan, dan Konfigurasi Sistem.
- **Platform Target**: Aplikasi Web Responsif.

## 2. Tumpukan Teknologi (Tech Stack)
- **Frontend**: React
- **Backend & Database**: Supabase (Postgres, Auth, Storage, RLS)
- **Styling**: Tailwind CSS

## 3. Panduan Pengaturan (Setup Guide)
Ikuti langkah-langkah berikut untuk menjalankan proyek ini secara lokal.

### Prasyarat
- Akun [Supabase](https://supabase.com/) gratis.

### Langkah 1: Buat Proyek Supabase Baru
1.  Buka [database.new](https://database.new/) di browser Anda.
2.  Masuk dengan akun Supabase Anda.
3.  Buat proyek baru. Simpan **Password** database Anda di tempat yang aman.

### Langkah 2: Dapatkan Kredensial API
1.  Setelah proyek dibuat, navigasikan ke **Project Settings** (ikon roda gigi).
2.  Pilih menu **API**.
3.  Di bawah bagian **Project API Keys**, Anda akan menemukan:
    -   **Project URL**
    -   **`anon` public key**
4.  Salin kedua nilai ini.

### Langkah 3: Perbarui Klien Supabase di Kode
1.  Buka file `services/supabase.ts` di proyek Anda.
2.  Ganti nilai `supabaseUrl` dan `supabaseAnonKey` dengan kredensial yang Anda salin dari dasbor Supabase Anda.

```typescript
// services/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'URL_PROYEK_SUPABASE_ANDA'; // <-- Ganti dengan URL Anda
const supabaseAnonKey = 'ANON_KEY_PROYEK_ANDA'; // <-- Ganti dengan Anon Key Anda

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Langkah 4: Buat Storage Bucket
Aplikasi ini memerlukan bucket penyimpanan untuk mengunggah lampiran (misalnya, surat sakit).
1.  Di dasbor Supabase Anda, navigasikan ke **Storage** (ikon folder di menu kiri).
2.  Klik **New bucket**.
3.  Masukkan `attachments` sebagai **Bucket name**.
4.  **PENTING**: Centang kotak **Public bucket**. Ini diperlukan agar lampiran dapat ditampilkan di aplikasi.
5.  Klik **Save**.

### Langkah 5: Jalankan Skema Database
1.  Di dasbor Supabase Anda, navigasikan ke **SQL Editor**.
2.  Pilih **New query**.
3.  Salin seluruh konten dari bagian **[6. Skema Database (Supabase)](#6-skema-database-supabase)** di bawah ini.
4.  Tempelkan ke editor SQL, lalu klik **RUN**. Skrip ini akan membuat semua tabel, peran, dan kebijakan keamanan yang diperlukan untuk database dan storage.

### Langkah 6: Tambahkan Request Type Baru ke Database (Jika Diperlukan)

Jika Anda melihat error **406 (Not Acceptable)** saat fetch request dengan tipe `'Registrasi Pegawai'`, jalankan SQL berikut di **Supabase SQL Editor**:

```sql
-- Tambahkan 'Registrasi Pegawai' ke enum request_type
CREATE TYPE request_type_new AS ENUM ('Cuti', 'Lembur', 'Izin', 'Sakit', 'Koreksi Absensi', 'Registrasi Pegawai');
ALTER TABLE requests ALTER COLUMN request_type TYPE request_type_new USING (request_type::text::request_type_new);
DROP TYPE request_type;
ALTER TYPE request_type_new RENAME TO request_type;
```

Setelah langkah-langkah ini selesai, aplikasi Anda siap dijalankan dan akan terhubung ke backend Supabase Anda.

### Menjalankan Aplikasi (Vite)

1. Instal dependensi:

```powershell
npm install
```

2. Jalankan development server (Vite):

```powershell
npm run dev
```

3. Untuk menghasilkan bundle produksi:

```powershell
npm run build
```

4. Untuk meninjau hasil build secara lokal:

```powershell
npm run preview
```

Catatan: Tailwind CSS diimpor dari `src/app/globals.css` dan diproses melalui PostCSS. Pastikan `postcss.config.cjs` dan `tailwind.config.ts` tetap ada di proyek.

## 4. Peran Pengguna & Hak Akses
- **Superadmin**: Akses penuh ke semua fitur. Mengelola konfigurasi sistem, data master pegawai, dan struktur organisasi.
- **Atasan**: Dapat melihat data timnya (bawahan), melakukan persetujuan/penolakan/revisi ajuan, mengedit jadwal kerja bawahan, dan mengunduh laporan tim.
- **Bawahan**: Melakukan absensi, mengajukan berbagai permohonan, dan melihat riwayat pribadi.

## 5. Arsitektur Frontend (Struktur Folder)
```
/
|-- /app
|   |-- (auth)                  # Halaman Login, Reset Password
|   |-- (app)                   # Rute terproteksi (setelah login)
|       |-- (bawahan)
|       |-- (atasan)
|       `-- (superadmin)
|-- /components
|   |-- /modals
|   |-- /ui
|   `-- Sidebar.tsx, Header.tsx, ...
|-- /services
|   `-- supabase.ts             # Konfigurasi klien Supabase
|-- /types.ts                   # Definisi tipe TypeScript
...
```

## 6. Skema Database (Supabase)
**PENTING**: Jalankan skrip SQL ini dari **Supabase SQL Editor** dalam urutan yang disajikan sebagai bagian dari **Langkah 5** pada Panduan Pengaturan.

**Catatan untuk Pengguna Lama (Migrasi)**
Jika Anda telah menjalankan skema sebelumnya, jalankan perintah SQL berikut:
- **Tambah kolom `nik`**: `ALTER TABLE public.profiles ADD COLUMN nik TEXT UNIQUE;`
- **Tambah kolom profil**: 
  `ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;`
  `ALTER TABLE public.profiles ADD COLUMN place_of_birth TEXT;`
  `ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;`
- **Tambah fungsi hapus pengguna**: Salin dan jalankan skrip SQL untuk fungsi `delete_user` dari `LANGKAH 4` (`STEP 4`) di bawah ini.
- **Aktifkan approval akun baru & request registrasi** (tambahkan kolom `approved`, nilai enum, dan kebijakan RLS) — jalankan di SQL Editor:

```sql
-- Kolom approval pada profiles
alter table public.profiles
  add column if not exists approved boolean not null default false;

-- Enum request_type perlu memiliki nilai Registrasi Pegawai (sesuaikan tipe jika namanya berbeda)
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'request_type' and e.enumlabel = 'Registrasi Pegawai'
  ) then
    alter type public.request_type add value 'Registrasi Pegawai';
  end if;
end$$;

-- RLS: hanya akun approved yang bisa membaca/mengubah profiles (sesuaikan role/claim superadmin Anda)
alter table public.profiles enable row level security;

drop policy if exists "Read approved profiles" on public.profiles;
drop policy if exists "Update own profile when approved" on public.profiles;
drop policy if exists "Service role full access profiles" on public.profiles;

create policy "Read approved profiles"
  on public.profiles
  for select
  using (approved = true);

create policy "Update own profile when approved"
  on public.profiles
  for update
  using (auth.uid() = id and approved = true)
  with check (auth.uid() = id and approved = true);

-- Opsional: beri akses penuh untuk service_role (atau klaim lain yang Anda pakai untuk superadmin)
create policy "Service role full access profiles"
  on public.profiles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```


```sql
-- ========= STEP 1: ENUM TYPES =========
-- Create custom types to ensure data consistency.

CREATE TYPE user_role AS ENUM ('superadmin', 'user');
CREATE TYPE request_type AS ENUM ('Cuti', 'Lembur', 'Izin', 'Sakit', 'Koreksi Absensi');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'revised');
CREATE TYPE attendance_status AS ENUM ('hadir', 'terlambat', 'pulang_cepat');
CREATE TYPE work_day_type AS ENUM ('non-shift', 'shift');


-- ========= STEP 2: TABLES =========
-- NOTE: The tables are ordered to resolve dependencies. Run them in this sequence.

-- Configuration & Master Data (no dependencies)
CREATE TABLE shifts (
  code VARCHAR(20) PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  color TEXT,
  work_day_type work_day_type NOT NULL
);
COMMENT ON TABLE shifts IS 'Master data for all available work shifts.';

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE leave_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_quota INT NOT NULL CHECK (default_quota >= 0)
);
COMMENT ON TABLE leave_types IS 'Master data for leave types (Annual, Sick, etc.).';

CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL
);
COMMENT ON TABLE holidays IS 'Stores dates of national holidays.';

CREATE TABLE overtime_configuration (
  id INT PRIMARY KEY DEFAULT 1,
  hourly_wage_divider INT NOT NULL,
  normal_day_first_hour_multiplier NUMERIC(4, 2) NOT NULL,
  normal_day_subsequent_hours_multiplier NUMERIC(4, 2) NOT NULL,
  non_shift_first_eight_hours_multiplier NUMERIC(4, 2) NOT NULL,
  non_shift_ninth_hour_multiplier NUMERIC(4, 2) NOT NULL,
  non_shift_tenth_to_twelfth_hour_multiplier NUMERIC(4, 2) NOT NULL,
  shift_first_seven_hours_multiplier NUMERIC(4, 2) NOT NULL,
  shift_eighth_hour_multiplier NUMERIC(4, 2) NOT NULL,
  shift_ninth_to_eleventh_hour_multiplier NUMERIC(4, 2) NOT NULL,
  max_hours_per_day INT NOT NULL,
  max_hours_per_month_non_shift INT NOT NULL,
  max_hours_per_month_shift INT NOT NULL,
  CONSTRAINT only_one_row CHECK (id = 1)
);
COMMENT ON TABLE overtime_configuration IS 'Stores global parameters for overtime pay calculation.';


-- Organizational Structure (with dependencies)
CREATE TABLE bureaus (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bureau_id INT NOT NULL REFERENCES bureaus(id) ON DELETE CASCADE
);


-- Core User and Activity Tables (with dependencies)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nik TEXT UNIQUE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'user',
  position TEXT,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  default_shift TEXT,
  salary JSONB,
  phone_number TEXT,
  place_of_birth TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Stores public user profile information.';
COMMENT ON COLUMN profiles.manager_id IS 'Self-referencing key for manager-subordinate relationship.';

CREATE TABLE work_schedules (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_code VARCHAR(20) NOT NULL REFERENCES shifts(code) ON DELETE RESTRICT,
  UNIQUE(profile_id, date)
);
COMMENT ON TABLE work_schedules IS 'Assigns a specific shift to an employee for a given day.';

CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status attendance_status NOT NULL,
  lokasi_kerja TEXT,
  tempat_kerja TEXT,
  clock_in_coords JSONB,
  clock_out_coords JSONB,
  clock_in_address TEXT,
  clock_out_address TEXT
);
COMMENT ON TABLE attendance IS 'Records employee clock-in and clock-out events.';

CREATE TABLE requests (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  day_shift_substitute_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  night_shift_substitute_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attachment_url TEXT,
  attendance_id_to_correct BIGINT REFERENCES attendance(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE requests IS 'Central table for all employee-submitted requests.';
COMMENT ON COLUMN requests.attachment_url IS 'Link to supporting documents in cloud storage.';


-- ========= STEP 3: INDEXES FOR PERFORMANCE =========
-- NOTE: Run these statements after all tables have been successfully created.

CREATE INDEX idx_requests_profile_id ON requests(profile_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_attendance_profile_id ON attendance(profile_id);
-- Ensures one clock-in per employee per day.
-- We cast to UTC to create an IMMUTABLE value for the index,
-- preventing errors related to session timezones.
CREATE UNIQUE INDEX idx_attendance_profile_id_date ON attendance(profile_id, ((clock_in AT TIME ZONE 'UTC')::date));
CREATE INDEX idx_work_schedules_profile_id ON work_schedules(profile_id);
CREATE INDEX idx_work_schedules_date ON work_schedules(date);
CREATE INDEX idx_profiles_manager_id ON profiles(manager_id);

-- ========= STEP 3B: UPDATE SKEMA PRESENSI UNTUK ATURAN BARU =========
-- Tambahkan kolom & enum baru agar shift lintas hari dan auto status bekerja.

-- 1) Perluas enum status
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'absent';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'in_progress';

-- 2) Kolom turunan & perhitungan
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_date DATE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS worked_minutes INT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes INT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_leave_minutes INT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill work_date dari clock_in
UPDATE attendance SET work_date = (clock_in AT TIME ZONE 'UTC')::date WHERE work_date IS NULL;
ALTER TABLE attendance ALTER COLUMN work_date SET NOT NULL;

-- 3) Index unik pakai work_date (bukan tanggal clock_out) agar shift lintas hari tetap 1 record/hari kerja
DROP INDEX IF EXISTS idx_attendance_profile_id_date;
CREATE UNIQUE INDEX idx_attendance_profile_work_date ON attendance(profile_id, work_date);

-- 4) Perbarui RPC manager agar ikut menulis kolom baru
DROP FUNCTION IF EXISTS create_attendance_as_manager(uuid, timestamptz, attendance_status, date, text, text, jsonb, text);
CREATE OR REPLACE FUNCTION create_attendance_as_manager(
    p_profile_id UUID,
    p_clock_in TIMESTAMPTZ,
    p_status attendance_status DEFAULT 'in_progress',
    p_work_date DATE DEFAULT NULL,
    p_lokasi_kerja TEXT DEFAULT NULL,
    p_tempat_kerja TEXT DEFAULT NULL,
    p_clock_in_coords JSONB DEFAULT NULL,
    p_clock_in_address TEXT DEFAULT NULL
)
RETURNS SETOF attendance AS $$
BEGIN
  IF is_superadmin() OR is_my_subordinate(p_profile_id) THEN
    RETURN QUERY
    INSERT INTO public.attendance (profile_id, clock_in, status, work_date, lokasi_kerja, tempat_kerja, clock_in_coords, clock_in_address)
    VALUES (p_profile_id, p_clock_in, p_status, coalesce(p_work_date, (p_clock_in AT TIME ZONE 'UTC')::date), p_lokasi_kerja, p_tempat_kerja, p_clock_in_coords, p_clock_in_address)
    RETURNING *;
  ELSE
    RAISE EXCEPTION 'User does not have permission to create attendance for this profile.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC update_attendance_as_manager diperbarui (lihat SUPABASE_RPC_UPDATE_ATTENDANCE.sql) agar bisa mengisi work_date, status, menit keterlambatan, dsb.


-- ========= STEP 4: HELPER FUNCTIONS & RLS POLICIES (KRITERIA #8) =========
-- NOTE: Enable RLS on all tables and define policies for secure, role-based access.

-- Helper: read role from JWT claims; returns '' if missing
CREATE OR REPLACE FUNCTION app_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
$$;

-- Helper function to check if the current user is a superadmin
-- Uses JWT claim first, then falls back to profiles (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
  by_profile boolean;
BEGIN
  jwt_role := app_user_role();
  IF jwt_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;

  SELECT role = 'superadmin' INTO by_profile
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN coalesce(by_profile, FALSE);
END;
$$;

-- Helper to check admin or superadmin via JWT claim (for read-only admin access)
CREATE OR REPLACE FUNCTION is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app_user_role() IN ('admin','superadmin');
$$;

-- Helper function to get all subordinates (direct and indirect) for the current user
-- This function should also be created by a superuser
CREATE OR REPLACE FUNCTION get_my_subordinates()
RETURNS TABLE(subordinate_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates_cte AS (
    -- Start with direct reports of the currently authenticated user
    SELECT id FROM public.profiles WHERE manager_id = auth.uid()
    UNION ALL
    -- Recursively find reports of reports
    SELECT p.id
    FROM public.profiles p
    INNER JOIN subordinates_cte s ON p.manager_id = s.id
  )
  SELECT id AS subordinate_id FROM subordinates_cte;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEW HELPER FUNCTION: Get colleagues (users with the same manager)
CREATE OR REPLACE FUNCTION get_my_colleagues()
RETURNS TABLE(colleague_id UUID) AS $$
DECLARE
  my_manager_id UUID;
BEGIN
  -- Find the current user's manager_id. Bypasses RLS due to SECURITY DEFINER.
  SELECT manager_id INTO my_manager_id FROM public.profiles WHERE id = auth.uid();
  
  -- Return all profile IDs that have the same manager.
  -- This includes the user themselves, which is fine for RLS policies.
  IF my_manager_id IS NOT NULL THEN
    RETURN QUERY SELECT id AS colleague_id FROM public.profiles WHERE manager_id = my_manager_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check manager hierarchy (for RPC)
CREATE OR REPLACE FUNCTION is_my_subordinate(p_subordinate_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    WITH RECURSIVE subordinates_cte AS (
      -- Start with direct reports of the currently authenticated user
      SELECT id FROM public.profiles WHERE manager_id = auth.uid()
      UNION ALL
      -- Recursively find reports of reports
      SELECT p.id
      FROM public.profiles p
      INNER JOIN subordinates_cte s ON p.manager_id = s.id
    )
    SELECT 1 FROM subordinates_cte WHERE id = p_subordinate_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC function for managers to create attendance records for subordinates
CREATE OR REPLACE FUNCTION create_attendance_as_manager(
    p_profile_id UUID,
    p_clock_in TIMESTAMPTZ,
    p_status attendance_status,
    p_lokasi_kerja TEXT,
    p_tempat_kerja TEXT,
    p_clock_in_coords JSONB DEFAULT NULL,
    p_clock_in_address TEXT DEFAULT NULL
)
RETURNS SETOF attendance AS $$
BEGIN
  -- Check if the current user is a superadmin OR is a manager of the target profile
  IF is_superadmin() OR is_my_subordinate(p_profile_id) THEN
    RETURN QUERY
    INSERT INTO public.attendance (profile_id, clock_in, status, lokasi_kerja, tempat_kerja, clock_in_coords, clock_in_address)
    VALUES (p_profile_id, p_clock_in, p_status, p_lokasi_kerja, p_tempat_kerja, p_clock_in_coords, p_clock_in_address)
    RETURNING *;
  ELSE
    RAISE EXCEPTION 'User does not have permission to create attendance for this profile.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for superadmins to delete a user completely.
-- We drop the function first to handle cases where the parameter signature has changed.
DROP FUNCTION IF EXISTS delete_user(uuid);
CREATE OR REPLACE FUNCTION delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- is_superadmin() will check if the calling user has the 'superadmin' role.
  IF is_superadmin() THEN
    -- Deleting from auth.users will cascade to public.profiles due to the
    -- FOREIGN KEY constraint with ON DELETE CASCADE.
    DELETE FROM auth.users WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Only superadmins have permission to delete users.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for superadmins to delete a shift and reassign dependents.
DROP FUNCTION IF EXISTS delete_shift_and_reassign(text);
CREATE OR REPLACE FUNCTION delete_shift_and_reassign(p_shift_code TEXT)
RETURNS VOID AS $$
DECLARE
  off_shift_exists BOOLEAN;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins have permission to delete shifts.';
  END IF;

  -- Check if 'OFF' shift exists to be used as a fallback.
  SELECT EXISTS (SELECT 1 FROM public.shifts WHERE code = 'OFF') INTO off_shift_exists;
  IF NOT off_shift_exists THEN
    RAISE EXCEPTION 'Cannot delete shift. The fallback "OFF" shift does not exist. Please create an "OFF" shift.';
  END IF;

  -- Reassign any work schedules using this shift to 'OFF'
  UPDATE public.work_schedules
  SET shift_code = 'OFF'
  WHERE shift_code = p_shift_code;
  
  -- Now, delete the shift
  DELETE FROM public.shifts
  WHERE code = p_shift_code;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old functions to be safe
DROP FUNCTION IF EXISTS get_today_attendance_for_user(uuid, date);
DROP FUNCTION IF EXISTS get_active_attendance_for_user(uuid);

-- NEW RPC function to get the active attendance session (handles overnight shifts)
CREATE OR REPLACE FUNCTION get_active_attendance_for_user(p_profile_id UUID)
RETURNS SETOF attendance AS $$
BEGIN
  -- Security Check: The calling user must be the person they are querying for,
  -- a manager of that person, or a superadmin. This is necessary because
  -- SECURITY DEFINER bypasses RLS on the 'attendance' table.
  IF auth.uid() = p_profile_id OR is_superadmin() OR EXISTS (SELECT 1 FROM get_my_subordinates() WHERE subordinate_id = p_profile_id) THEN
    -- Finds the most recent attendance record for a user that has a clock_in
    -- but no clock_out, within the last 24 hours. This handles overnight shifts.
    RETURN QUERY
    SELECT *
    FROM public.attendance
    WHERE profile_id = p_profile_id
      AND clock_out IS NULL
      AND clock_in > (now() - interval '24 hours')
    ORDER BY clock_in DESC
    LIMIT 1;
  ELSE
    -- If permissions are not met, return an empty set. Do not throw an error.
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ==== 1. PROFILES ====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage all profiles" ON profiles
  FOR ALL USING (app_user_role() = 'superadmin') WITH CHECK (app_user_role() = 'superadmin');
CREATE POLICY "Users can view their own, subordinates and colleagues profiles" ON profiles
  FOR SELECT USING (id = auth.uid() OR id IN (SELECT * FROM get_my_subordinates()) OR id IN (SELECT * FROM get_my_colleagues()));
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- ==== 2. MASTER DATA & ORGANIZATIONAL STRUCTURE ====
-- SHIFTS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read shifts" ON shifts FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage shifts" ON shifts FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- DEPARTMENTS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read departments" ON departments FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage departments" ON departments FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
  
-- BUREAUS
ALTER TABLE bureaus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read bureaus" ON bureaus FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage bureaus" ON bureaus FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- SECTIONS
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read sections" ON sections FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage sections" ON sections FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
  
-- LEAVE_TYPES
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read leave_types" ON leave_types FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage leave_types" ON leave_types FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
  
-- HOLIDAYS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read holidays" ON holidays FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage holidays" ON holidays FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- OVERTIME_CONFIGURATION
ALTER TABLE overtime_configuration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read overtime_configuration" ON overtime_configuration FOR SELECT USING (auth.role() = 'authenticated' OR is_admin_or_superadmin());
CREATE POLICY "Allow superadmins to manage overtime_configuration" ON overtime_configuration FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());


-- ==== 3. WORK SCHEDULES ====
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage all work schedules" ON work_schedules
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
CREATE POLICY "Admins can read all work schedules" ON work_schedules
  FOR SELECT USING (is_admin_or_superadmin());
-- UPDATED POLICY: Now allows viewing colleagues' schedules
CREATE POLICY "Users can view own, subordinates, and colleagues schedules" ON work_schedules
  FOR SELECT USING (
    profile_id = auth.uid() 
    OR profile_id IN (SELECT * FROM get_my_subordinates())
    OR profile_id IN (SELECT * FROM get_my_colleagues())
  );
CREATE POLICY "Managers can manage their subordinates' schedules" ON work_schedules
  FOR ALL USING (profile_id IN (SELECT * FROM get_my_subordinates())) WITH CHECK (profile_id IN (SELECT * FROM get_my_subordinates()));


-- ==== 4. ATTENDANCE ====
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage all attendance records" ON attendance
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
CREATE POLICY "Admins can read attendance" ON attendance
  FOR SELECT USING (is_admin_or_superadmin());
CREATE POLICY "Users can view their own and subordinates' attendance" ON attendance
  FOR SELECT USING (profile_id = auth.uid() OR profile_id IN (SELECT * FROM get_my_subordinates()));
CREATE POLICY "Users can insert their own attendance" ON attendance
  FOR INSERT WITH CHECK (profile_id = auth.uid());
-- Users can update own records (for clock-out), managers can update subordinates' (for corrections).
CREATE POLICY "Users can update their own and subordinates' attendance records" ON attendance
  FOR UPDATE USING (profile_id = auth.uid() OR profile_id IN (SELECT * FROM get_my_subordinates())) WITH CHECK (profile_id = auth.uid() OR profile_id IN (SELECT * FROM get_my_subordinates()));


-- ==== 5. REQUESTS ====
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage all requests" ON requests
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
CREATE POLICY "Admins can read requests" ON requests
  FOR SELECT USING (is_admin_or_superadmin());
CREATE POLICY "Users can view their own and subordinates' requests" ON requests
  FOR SELECT USING (profile_id = auth.uid() OR profile_id IN (SELECT * FROM get_my_subordinates()));
CREATE POLICY "Users can insert their own requests" ON requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Managers can update their subordinates' requests" ON requests
  FOR UPDATE USING (profile_id IN (SELECT * FROM get_my_subordinates())) WITH CHECK (profile_id IN (SELECT * FROM get_my_subordinates()));

-- ========= STEP 5: TRIGGER TO SYNC PROFILES WITH AUTHENTICATION =========
-- Creates a profile for a new user upon signup.
-- This function ensures that every new user in `auth.users` gets a corresponding
-- entry in `public.profiles`, fixing potential login errors.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email,
    -- Use name from metadata if available, otherwise use email.
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'user' -- Explicitly set the role for new users to 'user'.
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, to prevent errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ========= STEP 6: STORAGE BUCKET POLICIES =========
-- Kebijakan ini mengamankan bucket 'attachments' yang dibuat pada Langkah 4 Panduan Pengaturan.

-- 1. Kebijakan untuk melihat file (akses baca publik)
-- Siapa pun dapat melihat file jika mereka memiliki URL-nya.
CREATE POLICY "Public read access for attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- 2. Kebijakan untuk mengunggah file
-- Pengguna hanya bisa mengunggah ke dalam folder dengan nama UUID mereka sendiri.
CREATE POLICY "Allow user to upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Kebijakan untuk memperbarui file
-- Pengguna hanya bisa memperbarui file mereka sendiri.
CREATE POLICY "Allow user to update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Kebijakan untuk menghapus file
-- Pengguna hanya bisa menghapus file mereka sendiri.
CREATE POLICY "Allow user to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 7. Aturan Bisnis Presensi (Clock-In/Out & Koreksi)

- **Window clock-in/out per shift**: preset default mengikuti contoh Shift 1 (clock-in 06:30–08:00, clock-out 15:30–19:00 jika jadwal 07:00–16:00) dengan grace 10 menit. Window dihitung dari jam shift (table `shifts`/`work_schedules`), termasuk shift 3 lintas hari (end_time < start_time dihitung +1 hari).
- **Work date untuk shift lintas hari**: kolom `work_date` wajib diisi (tanggal mulai shift). Semua laporan & status memakai `work_date`, bukan tanggal `clock_out`.
- **Status setelah clock-out**: laten dihitung `clock_in > start + grace`, pulang cepat `clock_out < end - grace`. Status di-set otomatis (`hadir`, `terlambat`, `pulang_cepat`; tersedia juga `in_progress`, `absent`, `incomplete`) plus menit kerja/keterlambatan di kolom baru.
- **Koreksi absen**: form mendukung opsi Lupa Clock-In, Lupa Clock-Out, Lupa Keduanya, atau Salah Jam (bisa isi jam in/out). Lampiran wajib. Ajuan diblokir jika sudah ada koreksi PENDING di tanggal yang sama atau melewati batas **3 hari ke belakang**.
- **Auto-mark**: rekomendasi job terjadwal (Supabase Cron) tiap jam untuk menandai `absent` jika lewat `start_time + 2 jam` tanpa clock-in, serta `incomplete` bila sudah lewat `end_time + grace` tanpa clock-out. Sesuaikan dengan jam shift di tabel `shifts`.
- **SQL job contoh (opsional)**:
  ```sql
  create or replace function auto_mark_absence(p_cutoff_minutes int default 120)
  returns void
  language plpgsql
  security definer as $$
  begin
    -- Absent jika tidak ada presensi pada work_date
    insert into attendance (profile_id, clock_in, work_date, status, source)
    select ws.profile_id,
           (ws.date || 'T00:00:00+08:00')::timestamptz,
           ws.date,
           'absent',
           'AUTO_ABSENCE'
    from work_schedules ws
    where ws.date <= (now() at time zone 'Asia/Makassar')::date
      and not exists (select 1 from attendance a where a.profile_id = ws.profile_id and a.work_date = ws.date);

    -- Incomplete jika sudah lewat jam selesai + grace dan belum clock-out
    update attendance a
    set status = 'incomplete',
        updated_at = now(),
        source = coalesce(a.source, 'AUTO_ABSENCE')
    from work_schedules ws
    join shifts s on s.code = ws.shift_code
    where a.profile_id = ws.profile_id
      and a.work_date = ws.date
      and a.clock_out is null
      and now() > ((ws.date || 'T' || s.end_time || '+08:00')::timestamptz + make_interval(mins => p_cutoff_minutes))
      and s.end_time is not null;
  end;
  $$;
  -- Jadwalkan via Supabase Cron, misal tiap jam: cron.schedule('absen-auto', '0 * * * *', $$ select auto_mark_absence(); $$);
  ```
