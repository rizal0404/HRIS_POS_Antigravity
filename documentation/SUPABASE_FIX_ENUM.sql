-- FIX: Add 'Registrasi Pegawai' to request_type enum
-- Jalankan query ini di Supabase SQL Editor

-- Langkah 1: Buat tipe enum baru dengan nilai tambahan
CREATE TYPE request_type_new AS ENUM ('Cuti', 'Lembur', 'Izin', 'Sakit', 'Koreksi Absensi', 'Registrasi Pegawai');

-- Langkah 2: Update kolom request_type di tabel requests
ALTER TABLE requests ALTER COLUMN request_type TYPE request_type_new USING (request_type::text::request_type_new);

-- Langkah 3: Hapus enum tipe lama
DROP TYPE request_type;

-- Langkah 4: Rename enum baru ke nama asli
ALTER TYPE request_type_new RENAME TO request_type;
