# Panduan Migrasi Supabase ke VPS (HRIS-POS)

Dokumen ini berisi instruksi untuk memindahkan data dari Supabase (mvmzzlnrofqmwodubkti) ke VPS Anda.

## 1. Persiapan Koneksi Database
Gunakan kredensial berikut untuk akses ke Supabase:
- **Project ID**: `mvmzzlnrofqmwodubkti`
- **DB Connection String**: `postgresql://postgres:[YOUR_PASSWORD]@db.mvmzzlnrofqmwodubkti.supabase.co:5432/postgres`
  *(Ganti [YOUR_PASSWORD] dengan password database Supabase Anda)*

## 2. Dump Data dari Supabase
Jalankan perintah ini di komputer lokal Anda yang memiliki akses internet:

```bash
# Dump skema dan data (kecuali skema internal supabase)
pg_dump "postgresql://postgres:[PASSWORD]@db.mvmzzlnrofqmwodubkti.supabase.co:5432/postgres" \
  --schema=public \
  --clean --if-exists \
  --no-owner --no-privileges > supabase_data_dump.sql
```

## 3. Persiapan Database di VPS
Pastikan Docker Compose di VPS sudah berjalan (`docker-compose.prod.yml`).
Masuk ke container Postgres di VPS atau gunakan `psql` dari luar container:

```bash
# Jika menggunakan Docker Compose
cat supabase_data_dump.sql | docker exec -i hris-postgres psql -U hris_user -d hris_db
```

## 4. Penyesuaian Skema (Drizzle)
Setelah data di-restore, jalankan migrasi Drizzle untuk memastikan tabel-tabel baru (Notification Jobs, Discipline Scores) sudah ada:

```bash
cd apps/api
npm install
# Generate migration files
npx drizzle-kit generate
# Push skema ke DB
npx drizzle-kit push
```

## 5. Migrasi User Auth (Better Auth)
Karena Supabase Auth dan Better Auth menggunakan struktur yang berbeda, Anda perlu memindahkan user secara manual jika ingin mempertahankan password:
1. Export tabel `auth.users` dari Supabase.
2. Masukkan ke tabel `users` (dan `accounts` untuk password hash) di database baru.
3. *Sangat disarankan untuk meminta user melakukan Reset Password karena algoritma hashing mungkin berbeda.*

## 6. Update Environment Variables
Di Coolify/VPS, pastikan `.env` sudah berisi:
- `DATABASE_URL`: `postgresql://hris_user:password@postgres:5432/hris_db`
- `TELEGRAM_BOT_TOKEN`: Token bot Anda
- `BETTER_AUTH_SECRET`: Secret yang kuat
- `BETTER_AUTH_URL`: URL API Anda

## 7. Verifikasi
Cek logs container API di Coolify untuk memastikan worker notifikasi berjalan:
`docker logs -f hris-api`
