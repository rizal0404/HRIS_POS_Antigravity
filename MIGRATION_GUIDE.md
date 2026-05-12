# 🚀 Panduan Deploy HRIS-POS ke VPS via Coolify

## Arsitektur Deployment

```
┌─────────────────────────────────────────────────────┐
│  Coolify (Docker Compose)                           │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Web/Nginx│→ │ Express API  │→ │ PostgreSQL   │  │
│  │ :80      │  │ (Better Auth)│  │ 16-alpine    │  │
│  │ SPA + SSL│  │ :3001        │  │ :5432        │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 1. Persiapan

### 1.1. Pastikan VPS Sudah Punya Coolify
- Install Coolify: https://coolify.io/docs/installation
- Pastikan Docker dan Docker Compose sudah terinstall

### 1.2. Clone Repository
```bash
git clone https://github.com/your-repo/hrispos.git
cd hrispos
git checkout hrispos_vps_ag
```

## 2. Deployment di Coolify

### 2.1. Buat Aplikasi Baru di Coolify
1. Buka Coolify UI → **Applications** → **Add New**
2. Pilih **Docker Compose** sebagai Build Pack
3. Pilih repository GitHub Anda
4. Branch: `hrispos_vps_ag`
5. Docker Compose file: `docker-compose.yaml`

### 2.2. Konfigurasi Environment Variables
Di Coolify, masuk ke **Environment Variables** dan tambahkan:

```env
# Database
POSTGRES_USER=hris_user
POSTGRES_PASSWORD=ganti_password_kuat_di_sini
POSTGRES_DB=hris_db

# API
BETTER_AUTH_URL=https://api.hris.domain.com
BETTER_AUTH_SECRET=random_64_character_secret
FRONTEND_URL=https://hris.domain.com
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Frontend (Build-time)
VITE_API_URL=https://api.hris.domain.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2.3. Konfigurasi Domain
Di Coolify, konfigurasi domain untuk masing-masing service:
- **Web**: `hris.domain.com` → port 80
- **API**: `api.hris.domain.com` → port 3001

Coolify akan otomatis mengurus SSL (Let's Encrypt).

## 3. Migrasi Data dari Supabase

### 3.1. Dump Data dari Supabase
```bash
# Dump skema dan data (kecuali skema internal supabase)
pg_dump "postgresql://postgres:[PASSWORD]@db.mvmzzlnrofqmwodubkti.supabase.co:5432/postgres" \
  --schema=public \
  --data-only \
  --no-owner --no-privileges > supabase_data_dump.sql
```

> **Catatan**: `init.sql` sudah membuat semua tabel dan fungsi.
> Anda hanya perlu dump **data saja** (`--data-only`).

### 3.2. Restore Data ke VPS
```bash
# Upload file dump ke VPS, lalu:
cat supabase_data_dump.sql | docker exec -i hris-postgres psql -U hris_user -d hris_db
```

### 3.3. Migrasi User Auth (Supabase Auth → Better Auth)
Karena Supabase Auth dan Better Auth menggunakan struktur berbeda:

1. **Buat akun baru** untuk semua user via Better Auth API/UI
2. Atau **minta user melakukan Reset Password** karena hash algorithm berbeda
3. Data profil di tabel `profiles` sudah termigrasikan via data dump

## 4. Setup Telegram Webhook

Setelah deploy, setup webhook Telegram ke VPS:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.hris.domain.com/api/telegram/webhook"}'
```

## 5. Verifikasi

### 5.1. Cek Health API
```bash
curl https://api.hris.domain.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 5.2. Cek Logs
Di Coolify UI, klik pada masing-masing service dan lihat **Logs**.
Atau via terminal:
```bash
docker logs -f hris-api
docker logs -f hris-postgres
docker logs -f hris-web
```

### 5.3. Cek Database
```bash
docker exec -it hris-postgres psql -U hris_user -d hris_db -c "\dt"
```

## 6. Perbedaan dari Versi Supabase

| Fitur | Supabase | VPS |
|-------|----------|-----|
| Auth | Supabase Auth (JWT) | Better Auth (session cookies) |
| Database | Supabase managed PG | Self-hosted PG 16 |
| Edge Functions | Deno-based | Express API routes |
| RLS | Yes (database-level) | No (API-level auth) |
| Realtime | Supabase Realtime | Polling via API |
| Storage | Supabase Storage | File system / S3 (optional) |
| Hosting | Vercel (frontend) | Nginx container |
| SSL | Vercel/Supabase | Coolify (Let's Encrypt) |
