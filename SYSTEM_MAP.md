# SYSTEM_MAP — HRIS_POS_Antigravity

> Dokumen acuan teknis untuk pengembangan, audit, dan onboarding aplikasi
> **HRIS / POS Antigravity**. Berisi pemetaan struktur, workflow, tech stack,
> spesifikasi modul, scoring keamanan & optimalisasi, serta rekomendasi
> perbaikan.
>
> Status repo: **prototype lanjutan / pre-production**.
> Versi dokumen: **1.0** — generated dari snapshot branch `main`.

---

## Daftar Isi

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Arsitektur Tingkat Tinggi](#2-arsitektur-tingkat-tinggi)
3. [Struktur Repository](#3-struktur-repository)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Modul Fungsional & Spesifikasi](#5-modul-fungsional--spesifikasi)
6. [Workflow Inti](#6-workflow-inti)
7. [Data Model & Database](#7-data-model--database)
8. [Layer Integrasi & Konfigurasi](#8-layer-integrasi--konfigurasi)
9. [Scoring Keamanan](#9-scoring-keamanan)
10. [Scoring Optimalisasi & Kualitas](#10-scoring-optimalisasi--kualitas)
11. [Rencana / Rekomendasi Perbaikan](#11-rencana--rekomendasi-perbaikan)
12. [Roadmap Migrasi (Supabase → Express/Drizzle)](#12-roadmap-migrasi-supabase--expressdrizzle)
13. [Lampiran: Konvensi & Glosarium](#13-lampiran-konvensi--glosarium)

---

## 1. Ringkasan Sistem

**HRIS_POS_Antigravity** adalah platform manajemen SDM (Human Resource
Information System) dengan komponen presensi berbasis lokasi (mirip POS untuk
absensi shift). Aplikasi memiliki tiga klien:

| Klien | Tipe | Status | Lokasi |
|-------|------|--------|--------|
| **Web (legacy)** | SPA React 19 + Vite | Aktif (production) | `/src` (root) |
| **Web (new stack)** | SPA React 19 + Vite (JSX) | Skeleton / WIP | `/apps/web` |
| **Mobile** | Expo / React Native 0.81 | Aktif (production) | `/mobile` |

Backend memiliki **dua jalur paralel** yang sedang dalam masa migrasi:

| Backend | Status | Lokasi |
|---------|--------|--------|
| **Supabase** (Postgres + Auth + Storage + Edge Functions + RLS) | Aktif (production) | `/supabase`, `/documentation/*.sql` |
| **Express + Drizzle + Neon + Better Auth** | Skeleton / WIP | `/apps/api` |

Tiga peran utama: `superadmin`, `admin`, `user` (dengan flag `isManager` untuk
role atasan), plus `pending` untuk akun yang belum disetujui.

**Modul utama**: Autentikasi, Presensi (Clock-in/out + GPS + Mock detection),
Pengajuan (Cuti, Lembur, Izin, Sakit, Substitusi, Koreksi Absensi, Registrasi
Pegawai), Persetujuan, Laporan, KPI, Skor Disiplin, Konfigurasi Sistem,
Notifikasi (Telegram + Email), PWA Offline.

---

## 2. Arsitektur Tingkat Tinggi

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├────────────────────────┬───────────────────────────┬─────────────────────────┤
│  Web (React 19 / Vite) │  Web new (React 19 JSX)   │  Mobile (Expo RN 0.81)  │
│  /src                  │  /apps/web (WIP)          │  /mobile                │
│  - PWA + service worker│  - tanstack/react-query   │  - expo-secure-store    │
│  - Supabase JS client  │  - axios + better-auth    │  - offline queue + cache│
│  - Leaflet maps        │                           │  - jail-monkey detect   │
└─────────────┬──────────┴────────────┬──────────────┴───────────┬─────────────┘
              │                       │                          │
              ▼                       ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐
│   SERVICE LAYER (web)    │  │   apiService (axios)     │  │  Service (mobile)  │
│   /src/services          │  │   /apps/web/src/services │  │  /mobile/src/lib   │
│   - attendance, requests │  │                          │  │  - shared rules    │
│   - profiles, schedules  │  │                          │  │  - offlineQueue    │
│   - config, reports,     │  │                          │  │  - localCache      │
│     discipline           │  │                          │  │                    │
└──────────────┬───────────┘  └─────────────┬────────────┘  └──────────┬─────────┘
               │                            │                          │
               ▼                            ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   SUPABASE (production)      │  │   EXPRESS API (WIP)          │
│   - Postgres + RLS           │  │   /apps/api                  │
│   - Auth (email/password)    │  │   - better-auth (Drizzle)    │
│   - Storage `attachments`    │  │   - Neon serverless Postgres │
│   - RPC: SECURITY DEFINER    │  │   - Drizzle ORM              │
│   - Edge Functions (Deno)    │  │   - REST routes              │
│     · telegram-webhook       │  │     /api/{employees,         │
│     · telegram-notif         │  │      attendance, requests,   │
│     · update-user-email      │  │      schedules, reports,     │
│                              │  │      manager, offices}       │
└─────────────┬────────────────┘  └─────────────┬────────────────┘
              │                                  │
              ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                               │
│  - OpenStreetMap Nominatim (reverse geocoding)                   │
│  - Telegram Bot API (notifikasi & approval inline)               │
│  - Vercel (hosting, rewrites SPA → index.html)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Struktur Repository

```
HRIS_POS_Antigravity/
├── index.html                       # entry Vite (web legacy)
├── package.json                     # web legacy deps (root)
├── vite.config.ts                   # config Vite + alias @ + define API_KEY
├── vercel.json                      # rewrites SPA fallback
├── tailwind.config.ts, postcss.config.cjs
├── tsconfig.json                    # strict-ish (allowJs, noEmit, jsx react-jsx)
│
├── public/
│   ├── service-worker.js            # PWA SW (Network-First / SWR / fallback)
│   ├── manifest.webmanifest
│   └── HRIS_2.png
│
├── src/                             # Web legacy — Supabase frontend
│   ├── index.tsx                    # ReactDOM render + Router
│   ├── App.tsx                      # 350 LoC root: routing + session bootstrap
│   ├── globals.css, types.ts (deprecated re-export)
│   │
│   ├── app/                         # halaman per-role (Next-style folder grouping)
│   │   ├── (auth)/                  # LoginPage, SignupPage, ResetPasswordPage,
│   │   │                              PendingApprovalPage
│   │   └── (app)/
│   │       ├── presensiPage.tsx, kpiPage.tsx
│   │       ├── (bawahan)/           # 7 halaman pegawai
│   │       ├── (atasan)/            # 5 halaman manajer (incl. SimulasiCutiLembur)
│   │       ├── (admin)/             # jadwal_adminPage
│   │       └── (superadmin)/        # 5 halaman admin sistem
│   │
│   ├── components/                  # 52 komponen UI/business
│   │   ├── ui/                      # Card, Toast, Spinner, Pagination, ...
│   │   ├── modals/                  # 17 modal (ClockInOut, Cuti, Shift, dll)
│   │   ├── konfigurasi/             # 9 panel konfigurasi sistem
│   │   ├── laporan/                 # 5 panel laporan
│   │   ├── jadwal/, dashboard/, kpi/, maps/
│   │   ├── Sidebar.tsx, Header.tsx, MobileBottomNav.tsx
│   │   └── ErrorBoundary.tsx, InstallPWABanner.tsx, PasswordResetModal.tsx
│   │
│   ├── hooks/                       # useAuth, useAttendance, useRequests,
│   │                                # useSchedules, useConfig, useProfile,
│   │                                # useTheme, usePWA, useOfflineQueue
│   │
│   ├── services/                    # Service layer (Supabase wrapper)
│   │   ├── supabase.ts              # createClient(env)
│   │   ├── apiService.ts, index.ts  # barrel + back-compat aggregator
│   │   ├── attendance/, requests/, profiles/, schedules/,
│   │   │   config/, reports/, discipline/
│   │   └── helpers.ts               # handleSupabaseError + Nominatim reverse-geo
│   │
│   ├── lib/                         # attendanceRules, location, offlineQueue,
│   │                                # logger, branding, utils
│   │
│   └── types/                       # user, attendance, request, organization,
│                                    # config, discipline + index barrel
│
├── apps/                            # Stack baru (migrasi ke arsitektur API-first)
│   ├── api/                         # Express + Drizzle + Neon + better-auth
│   │   ├── src/
│   │   │   ├── index.ts, app.ts     # bootstrap + CORS + auth handler
│   │   │   ├── config/{auth,database}.ts
│   │   │   ├── middleware/auth.middleware.ts  # requireAuth, requireRole
│   │   │   ├── routes/              # employee, attendance, request,
│   │   │   │                          schedule, report, manager, office
│   │   │   ├── services/            # business logic per domain
│   │   │   └── db/schema/           # users, employees, departments,
│   │   │                              office-locations, shifts, attendance,
│   │   │                              requests, notifications
│   │   ├── drizzle.config.ts
│   │   ├── docker-compose.yml       # Postgres 16 lokal (kredensial demo)
│   │   ├── vercel.json              # @vercel/node build
│   │   └── .env.example             # ⚠ memuat secret demo (lihat §9)
│   │
│   └── web/                         # SPA baru (JSX), tanstack-query + axios
│       ├── src/{pages,components,services,context,hooks,lib}
│       └── eslint.config.js (flat config v9)
│
├── mobile/                          # Expo / React Native
│   ├── App.tsx, index.ts, app.json (ios/android/permissions)
│   ├── src/
│   │   ├── navigation/AppNavigator.tsx     # bottom-tabs + native-stack
│   │   ├── screens/                        # Login, Home, Clock, Attendance,
│   │   │                                     Requests, Reports, Profile
│   │   ├── components/                     # Modal {ChangePassword,Correction,
│   │   │                                     EditProfile, NotificationSettings}
│   │   ├── lib/                            # supabase, attendanceRules,
│   │   │                                     offlineQueue, localCache
│   │   └── types/index.ts
│   ├── .env.example                        # EXPO_PUBLIC_SUPABASE_URL/ANON_KEY
│   └── DEVELOPER_GUIDE.md
│
├── supabase/
│   └── functions/                          # Edge Functions (Deno)
│       ├── telegram-webhook/index.ts       # inline approval / keyword match
│       ├── telegram-notif/index.ts         # outbound notifikasi
│       └── update-user-email/index.ts      # admin update email via service-role
│
└── documentation/
    ├── README.md                           # rancangan teknis & setup Supabase
    ├── WORKFLOW_SISTEM_ABSENSI.md          # diagram + rules absensi
    ├── hitungan_kpi.jsx                    # referensi rumus KPI (JSX)
    ├── metadata.json
    ├── SUPABASE_DISCIPLINE_SYSTEM.sql      # 315 LoC, RPC SECURITY DEFINER
    ├── SUPABASE_NOTIFICATIONS.sql          # tabel preferensi + queue email
    ├── SUPABASE_RPC_UPDATE_ATTENDANCE.sql  # RPC update attendance (DEFINER)
    ├── SUPABASE_FIX_ENUM.sql
    └── sql/
        ├── attendance_logs_migration.sql
        ├── discipline_configuration_migration.sql
        └── grace_period_config_migration.sql
```

**Statistik kasar**:
- ± **33.300 LoC** TypeScript/TSX (web legacy + apps/api + mobile).
- **24** halaman web, **52** komponen, **17** modal, **10** custom hooks.
- **7** route group Express baru (561 LoC) + **8** schema Drizzle.
- **3** Edge Function Deno + **6** file SQL (~555 LoC migrasi & RPC).

---

## 4. Tech Stack & Dependencies

### 4.1 Web legacy (`/`)
| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | React | `19.2.0` |
| Bundler / Dev | Vite | `^6.2.0` |
| Routing | react-router-dom | `^7.9.6` |
| Styling | Tailwind CSS v4 + PostCSS | `^4.1.17` |
| Backend SDK | @supabase/supabase-js | `^2.81.1` |
| Maps | leaflet, react-leaflet | `1.9.4` / `5.0.0` |
| Reporting | jspdf, html2canvas, papaparse, xlsx | — |
| TypeScript | TS | `~5.8.2` |

Scripts: `dev`, `build`, `preview` (Vite). **Tidak ada** `lint`, `test`,
`typecheck`.

### 4.2 API baru (`/apps/api`)
| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| Server | Express | `^4.18.2` |
| Auth | better-auth | `^1.0.0` |
| ORM | drizzle-orm + drizzle-kit | `^0.41.0` / `^0.31.4` |
| DB | @neondatabase/serverless | `^0.9.0` |
| Validation | zod | `^3.22.4` |
| Util | cors, dotenv, tsx | — |

Scripts: `dev` (tsx watch), `build` (`tsc`), `start`, `db:generate|push|studio`.

### 4.3 Web baru (`/apps/web`)
| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | React | `19.2.0` |
| Bundler | Vite | `^7.2.4` |
| Auth | better-auth (client) | `^1.1.13` |
| Data | @tanstack/react-query | `^5.66.0` |
| HTTP | axios | `^1.7.9` |
| Lint | eslint v9 (flat config) | `^9.39.1` |

Scripts: `dev`, `build`, `lint`, `preview`.

### 4.4 Mobile (`/mobile`)
| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | Expo / React Native | `54.0.30` / `0.81.5` |
| Navigation | @react-navigation v7 | — |
| Storage | @react-native-async-storage, expo-secure-store | — |
| Sensors | expo-camera, expo-location, expo-image-* | — |
| Anti-tamper | jail-monkey | `^2.8.4` |
| Net | @react-native-community/netinfo | — |
| Backend SDK | @supabase/supabase-js | `^2.49.8` |
| Build | EAS (`build:android`) | — |

### 4.5 Edge Functions (Supabase / Deno)
- `telegram-webhook` — verifikasi `x-telegram-bot-api-secret-token`, parser
  callback_query, mapping keyword (setuju/approve/tolak/revisi).
- `telegram-notif` — pengiriman pesan keluar.
- `update-user-email` — perubahan email user via Service-Role.

### 4.6 Lingkungan & Hosting
- **Vercel** (web legacy & API) — `vercel.json` + `@vercel/node` builder.
- **Supabase Cloud** — Postgres, Auth, Storage `attachments` (public), RLS,
  Edge Functions.
- **Neon Postgres serverless** (dipakai stack baru di `/apps/api`).
- **OpenStreetMap Nominatim** — reverse geocoding (rate-limit policy publik).

---

## 5. Modul Fungsional & Spesifikasi

| # | Modul | Tujuan | Halaman utama | Service / RPC |
|---|-------|--------|---------------|---------------|
| 1 | **Autentikasi** | Login email/password, reset password, register, gating `pending` | `(auth)/LoginPage`, `SignupPage`, `ResetPasswordPage`, `PendingApprovalPage` | `supabase.auth.*` (legacy) / `better-auth` (API baru) |
| 2 | **Presensi (Absensi)** | Clock-in/out berbasis GPS + reverse-geocode + mock detection + window jam shift | `(bawahan)/absensiPage`, `presensiPage`, `ClockInOutModal` | `attendanceService` + RPC `get_active_attendance_for_user`, `create_attendance_as_manager`, `update_attendance_as_manager` |
| 3 | **Pengajuan** | Cuti, Lembur, Izin, Sakit, Substitusi, Koreksi Absensi, Registrasi Pegawai | `(bawahan)/pengajuanPage`, modal `RequestModal`, `CutiModal`, `KoreksiAbsensiModal` | `requestsService` |
| 4 | **Persetujuan** | Review oleh atasan/superadmin, revisi, assignment | `(atasan)/persetujuanPage`, `ReviewAjuanModal`, `AssignRequestModal` | `requestsService.updateRequestStatus`, `assignRequestForSubordinate` |
| 5 | **Penjadwalan & Shift** | Manajemen shift, work_schedules per pegawai, substitusi shift | `(superadmin)/jadwal_superadminPage`, `(admin)/jadwal_adminPage`, `JadwalTimView` | `schedulesService`, `configService` (shift CRUD) |
| 6 | **Laporan** | Rekap presensi, lembur, cuti, kuota cuti, monitoring tim | `(bawahan)/laporanPage`, `(atasan)/laporan_timPage`, `(superadmin)/laporan_semuaPage` | `reportsService` + komponen `laporan/*` |
| 7 | **KPI** | Hitung KPI Presence / Productivity / Discipline | `kpiPage`, `KpiCalculator` | logika lokal (lihat `documentation/hitungan_kpi.jsx`) |
| 8 | **Skor Disiplin** | Refresh skor disiplin per profil/bulan | dashboard cards | `disciplineService.refreshDisciplineScore` + RPC `upsert_discipline_score` |
| 9 | **Manajemen Pegawai & Org** | CRUD profil, departemen/biro/seksi, lokasi kerja, gaji | `(superadmin)/pegawaiPage`, `sistemPage`, `konfigurasi/*` | `profilesService`, `configService` |
| 10 | **Konfigurasi Sistem** | Hari libur, jenis cuti, upah lembur, struktur organisasi, gaji, skor disiplin, lokasi | `(superadmin)/sistemPage` | `configService` (banyak metode CRUD) |
| 11 | **Notifikasi** | Telegram (inbound/outbound) + email queue + preferensi | header/notifikasi | edge fn `telegram-*`, tabel `notification_preferences` |
| 12 | **PWA / Offline** | Pre-cache, Network-First/SWR, install banner, queue offline | `service-worker.js`, `useOfflineQueue`, `usePWA` | `lib/offlineQueue`, `mobile/src/lib/offlineQueue` |

---

## 6. Workflow Inti

### 6.1 Autentikasi & Onboarding
1. User register → tersimpan dengan role `pending`.
2. Halaman `PendingApprovalPage` menahan akses sampai superadmin/atasan
   menyetujui (mengubah role `user` + `approved=true`).
3. Reset password via Supabase Auth (link → `ResetPasswordPage`).
4. **Stack baru**: better-auth menyediakan email/password + Google OAuth dengan
   sesi 7 hari (`updateAge = 1` hari).

### 6.2 Presensi (Clock-in/out)
Diringkas dari `documentation/WORKFLOW_SISTEM_ABSENSI.md` + kode aktual:

```
User → tekan Clock In
   → ClockInOutModal ambil GPS (expo-location/web Geolocation)
   → buildAttendanceWindow(shift, gracePeriod) → cek jam masuk
   → location.findNearestWorkplace() → cek radius
   → mock detection (jail-monkey di mobile, validasi flags di web)
   → submitClockIn() → INSERT attendance (status: in_progress)
   → fire-and-forget disciplineService.refreshDisciplineScore()
User → tekan Clock Out
   → submitClockOut()/submitClockEvent → UPDATE clock_out + outcome
   → computeAttendanceOutcome → status final (hadir/terlambat/pulang_cepat)
```

Mode **manager**: `create_attendance_as_manager` & `update_attendance_as_manager`
adalah RPC `SECURITY DEFINER` yang melakukan permission check internal lalu
bypass RLS. Koreksi absensi melalui pengajuan tipe `Koreksi Absensi`
(window `CORRECTION_MAX_DAYS`).

Offline mobile: aksi clock-in disimpan di `offlineQueue` (`AsyncStorage`),
dipush kembali ketika `netinfo` mendeteksi koneksi.

### 6.3 Pengajuan & Persetujuan
1. Pegawai submit `Request` (tipe enum: `Cuti | Lembur | Izin | Sakit |
   Substitusi | Koreksi Absensi | Registrasi Pegawai`) → status `pending`.
2. Manager / superadmin review:
   - Approve → `approved`, side-effect:
     - **Substitusi** → upsert `work_schedules` rentang tanggal.
     - **Cuti** → kalkulasi pemotongan kuota (saat ini hanya log; **belum
       commit ke DB**, lihat §11 R-13).
   - Reject → `rejected`.
   - Revisi → status `revision`, pegawai memperbaiki → `revised`.
3. Notifikasi Telegram dikirim ke superadmin/manajer (inline keyboard:
   *setuju / tolak / revisi*); webhook menerjemahkan callback ke perubahan
   status.

### 6.4 Konfigurasi Sistem (Superadmin)
- **Shift** (jam mulai/selesai, kategori DAY / SHIFT_123 / SHIFT_77).
- **Hari libur** (calendar override).
- **Jenis cuti & upah lembur** (parameter formula).
- **Struktur organisasi** (Departemen → Biro → Seksi).
- **Manajemen lokasi kerja** (workplace + koordinat + radius).
- **Skor disiplin** (konfigurasi point per pelanggaran).

### 6.5 Notifikasi Telegram
- `telegram-notif`: outbound saat status request berubah / event ter-trigger.
- `telegram-webhook`: inbound, verifikasi header `x-telegram-bot-api-secret-token`
  (saat ini hanya **log** jika invalid, tidak menolak request — lihat §9).

---

## 7. Data Model & Database

### 7.1 Skema Supabase (legacy, source of truth produksi)

| Tabel / Object | Peran |
|----------------|-------|
| `profiles` | Profil pengguna (peran, manager_id, workplace_id, salary, telegram_chat_id) |
| `attendance` | Catatan presensi (clock_in/out, koordinat, alamat, status, flags) |
| `requests` | Pengajuan (enum `request_type`, status, attachment_url, assignment) |
| `work_schedules` | Penugasan shift per profile per tanggal |
| `shifts` | Master shift |
| `departments`, `bureaus`, `sections` | Struktur organisasi |
| `office_locations` / `workplaces` | Lokasi kerja + radius |
| `holidays`, `leave_types`, `overtime_rates` | Konfigurasi |
| `discipline_scores`, `discipline_configurations`, `attendance_logs` | Disiplin |
| `notification_preferences` | Preferensi + telegram_chat_id (RLS aktif) |
| `email_queue` | Antrian outbound email |
| Storage bucket `attachments` | **Public** — surat sakit / lampiran |
| RPC `get_active_attendance_for_user` | Lookup aktif |
| RPC `create_attendance_as_manager` | Manager bypass RLS |
| RPC `update_attendance_as_manager` | Koreksi (SECURITY DEFINER) |
| RPC `upsert_discipline_score` | Skor disiplin |
| RLS policies | Per-tabel (cth: `auth.uid() = profile_id`) |

### 7.2 Skema Drizzle (stack baru)
File: `apps/api/src/db/schema/`. Tabel:

`users` (id, email, name, role enum-string default `employee`),
`sessions`, `accounts`, `verifications` (better-auth),
`employees`, `departments`, `office_locations`, `shifts`,
`attendance`, `requests`, `notifications`.

> Catatan: skema baru **tidak 1:1** dengan skema Supabase produksi. Migrasi
> harus diiringi mapping field & data backfill.

---

## 8. Layer Integrasi & Konfigurasi

| Integrasi | Konsumen | Konfigurasi |
|-----------|----------|-------------|
| Supabase | web legacy, mobile | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Neon Postgres | apps/api | `DATABASE_URL` |
| Better Auth | apps/api | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID/SECRET` |
| Telegram | edge functions | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PROJECT_URL`, `SERVICE_ROLE_KEY` |
| Nominatim | web legacy services/helpers.ts | tanpa key (public) |
| Gemini (rencana?) | web legacy | `GEMINI_API_KEY` di-`define` ke `process.env.API_KEY` & `GEMINI_API_KEY` (lihat `vite.config.ts`) — terinjeksi ke bundle klien (riskan) |

---

## 9. Scoring Keamanan

> **Skala**: 0 (kritis) → 100 (excellent). Skor diberikan per kategori,
> kemudian dirata-rata berbobot. Justifikasi kuat tiap kategori dicantumkan.

| Kategori | Bobot | Skor | Rangkuman temuan |
|----------|------:|-----:|------------------|
| Manajemen Secret & Konfigurasi | 20% | **45** | Secret demo `BETTER_AUTH_SECRET` (hex 64) di-commit di `apps/api/.env.example`. Kredensial DB demo plain-text di `.env.example` & `docker-compose.yml`. `vite.config.ts` mengekspos `GEMINI_API_KEY` ke bundle klien (`process.env.API_KEY`/`GEMINI_API_KEY`). Tidak ada `.env*` di `.gitignore` root (hanya `*.local`). Tidak ada `secret scanning / pre-commit`. |
| Autentikasi & Sesi | 15% | **70** | Better-auth session 7 hari + updateAge 1 hari (wajar). Verifikasi sesi via `auth.api.getSession`. Namun: tidak ada rate-limiting login, tidak ada lockout, password policy tidak terdokumentasi, MFA belum ada. Storage Supabase bucket `attachments` **public** → URL terdampak teratur dapat ter-leak. |
| Otorisasi & RBAC | 15% | **65** | Middleware `requireRole(...roles)` di Express baru bagus. Namun di route-level masih ada **inline check** (`req.user!.role !== 'manager' && req.user!.role !== 'admin'`) — duplikat & rentan drift. Web legacy bergantung ke RLS Supabase + `isManager` flag client; sebagian RPC pakai `SECURITY DEFINER` (perlu verifikasi setiap fungsi melakukan permission-check internal yang ketat). |
| Validasi Input & Output | 10% | **55** | Zod terpasang di `apps/api` tapi route-route saat ini tidak benar-benar memvalidasi `req.body` (langsung `req.body` ke service). Web legacy mengandalkan tipe TS saja. Tidak ada schema-level guard di Edge Functions. |
| Webhook & Edge Function | 5% | **40** | `telegram-webhook` hanya **log** ketika `x-telegram-bot-api-secret-token` tidak cocok (tetap memproses request). Service-Role key dipakai langsung dari env (oke) — tetapi tanpa guard, webhook bisa di-spoof. |
| Logging / PII | 10% | **55** | Banyak `console.log` membawa `profile_id`, payload request, jadwal kerja, skor disiplin (lihat `src/services/requests/index.ts`). Production bundle tetap mencetak ke browser console. Logger ada (`lib/logger.ts`) tapi tidak konsisten dipakai. |
| Dependency & Supply Chain | 10% | **70** | Versi mostly recent (React 19, Vite 6/7, Supabase JS 2.81). Tidak ada `npm audit` hasil/lockfile audit di repo. Tidak ada Dependabot/Renovate config terlihat. Mobile menggunakan `jail-monkey` (anti-root) bagus. |
| Web Hardening (Headers / CSP) | 5% | **45** | Tidak ada CSP/headers yang dikonfigurasi (vercel.json hanya rewrite). SPA index.html tidak set CSP/HSTS/Frame-Options. Service worker pre-cache file user-agnostic — ok. |
| Kriptografi & Penyimpanan Lokal | 5% | **70** | Mobile pakai `expo-secure-store` (KeyStore/Keychain) — bagus. Web mengandalkan Supabase JS (localStorage default). Tidak ada enkripsi tambahan — seharusnya ok untuk JWT, tapi token reset password & attachment URL public layak diaudit. |
| Pengujian Keamanan | 5% | **20** | Tidak ada test apa pun (unit/integration/security). Tidak ada CI dengan SCA. |

**SKOR KEAMANAN TERTIMBANG**: **0.20·45 + 0.15·70 + 0.15·65 + 0.10·55 + 0.05·40 + 0.10·55 + 0.10·70 + 0.05·45 + 0.05·70 + 0.05·20 = 56.0 / 100 → C (Cukup)**

### 9.1 Temuan Spesifik (severity)

| ID | Severity | File / Path | Ringkas |
|----|----------|-------------|---------|
| S-01 | **High** | `apps/api/.env.example` | `BETTER_AUTH_SECRET` hex 64 dikomit. Walau "demo", developer bisa keliru reuse di prod. **Rotasi & ganti dengan placeholder**. |
| S-02 | **High** | `supabase/functions/telegram-webhook/index.ts` | Saat secret tidak cocok hanya `console.error`, **tidak return 401**. |
| S-03 | **High** | `documentation/README.md` Step 4 | Bucket `attachments` direkomendasikan **Public**. URL lampiran (sakit, surat dokter) mengandung PII medis. Sebaiknya private + signed URL (5–15 menit). |
| S-04 | **High** | `vite.config.ts` | `GEMINI_API_KEY` di-define ke `process.env.API_KEY` → ter-bundle ke JS klien. Kalau key benar-benar dipakai untuk Gemini, ini bisa di-scrape dari devtools. |
| S-05 | Medium | `apps/api/src/routes/employee.routes.ts` & sejenis | Inline role-check duplikat — ganti ke middleware `requireRole('manager','admin')`. |
| S-06 | Medium | `apps/api/src/routes/*` | Tidak ada parsing `zod.safeParse(req.body)`; field tak ter-whitelist langsung diteruskan ke `service.update*`. Risiko mass-assignment. |
| S-07 | Medium | seluruh service web | `console.log` kontekstual berisi `profile_id`, payload request → leak di browser DevTools. |
| S-08 | Medium | `apps/api/src/middleware/auth.middleware.ts` | `req.user = session.user as any;` — hilangkan `as any`, deklarasi tipe ketat (lihat S-15). |
| S-09 | Medium | `apps/api/src/app.ts` | CORS hanya `origin: FRONTEND_URL`. Tidak ada `helmet`, tidak ada `express-rate-limit`. |
| S-10 | Medium | `documentation/SUPABASE_*` | Beberapa RPC `SECURITY DEFINER` — wajib audit `search_path` dan permission check internal (mitigasi privilege escalation). |
| S-11 | Low | `.gitignore` root | Tidak mengabaikan `.env`, `.env.local`, `.env.production`. Tambahkan agar developer tidak tak sengaja commit. |
| S-12 | Low | `src/components/modals/SlipGajiModal.tsx` | `document.body.innerHTML = ...` untuk print — pastikan content sanitized (saat ini render React, ok bila tidak ada user-input HTML). |
| S-13 | Low | `apps/api/src/db/schema/users.ts` | `role: varchar(50) default 'employee'` — sebaiknya `pgEnum` agar nilai terkontrol DB-side. |
| S-14 | Low | mobile | Validasi mock-location ada tapi penalti / flag perlu audit ulang per device API level. |
| S-15 | Info | service worker | Cache `/api/` POST tidak terjadi (skip non-GET), bagus. Pastikan tidak meng-cache response yang authenticated tanpa `Vary`. |

---

## 10. Scoring Optimalisasi & Kualitas

| Kategori | Bobot | Skor | Rangkuman temuan |
|----------|------:|-----:|------------------|
| Arsitektur & Modularitas | 15% | **70** | Pemisahan service/hook/component baik. Namun ada **dualisme stack** (`/src` Supabase vs `/apps/*` Express) yang belum disatukan — beresiko *split-brain* pengembangan. |
| Type-safety & Static Analysis | 10% | **55** | TS aktif tapi `tsconfig` root memakai `allowJs`+`noEmit` tanpa `strict:true` ekplisit; ditemukan **25** kemunculan `: any` / `as any` di service & API. Tidak ada `tsc --noEmit` di CI. |
| Testing | 10% | **10** | Tidak ada test framework, tidak ada test file, tidak ada CI pipeline. |
| Linting & Formatting | 5% | **40** | ESLint hanya di `apps/web` (flat v9). Web legacy & API tidak punya `lint`. Tidak ada Prettier config. Tidak ada pre-commit. |
| Performa Frontend (rendering) | 10% | **65** | Komponen besar, tapi kebanyakan modal hanya mount on-demand. Tidak terlihat memoization (`useMemo/useCallback`) sistematis di list-laporan. Bundle berisi `xlsx` + `jspdf` + `html2canvas` + `leaflet` — *heavy*; tidak ada code-splitting per-route. |
| Performa Bundle / Build | 10% | **55** | Tidak ada `manualChunks`, tidak ada lazy import (`React.lazy`) untuk halaman per-role. PWA pre-cache hanya icon+index. Tidak ada bundle analyzer. |
| Performa Data / Query | 15% | **60** | Web legacy bergantung pada Supabase JS (`select('*')` di beberapa tempat → over-fetch). Tidak terlihat pagination konsisten di laporan besar (kecuali `Pagination.tsx`). Tidak ada caching client (web legacy belum pakai React Query — sudah ada di `apps/web` baru). |
| Caching & Offline | 5% | **75** | Service worker mature (Network-First w/ timeout, SWR, fallback). Mobile punya `offlineQueue` + `localCache`. |
| Database / Index | 5% | **60** | Tidak ada bukti review index untuk query laporan besar (`work_date`, `profile_id`, `status`). Migrasi disiplin / attendance log perlu index komposit. |
| Logging & Observability | 5% | **35** | Logger custom minim, tidak terhubung ke Sentry/Datadog/Logtail. `console.*` mendominasi production code. |
| Dokumentasi Kode | 5% | **70** | `documentation/` lengkap untuk SQL & workflow absensi; mobile `DEVELOPER_GUIDE.md` baik. README setup tidak menyebutkan stack `apps/api` & `apps/web` baru. |
| Konsistensi UI/UX | 5% | **70** | Tailwind v4 modern, dark mode hooks ada, mobile bottom nav, install banner PWA. Beberapa dialog ber-`innerHTML` legacy (lihat S-12). |

**SKOR OPTIMALISASI TERTIMBANG**: **0.15·70 + 0.10·55 + 0.10·10 + 0.05·40 + 0.10·65 + 0.10·55 + 0.15·60 + 0.05·75 + 0.05·60 + 0.05·35 + 0.05·70 + 0.05·70 = 55.5 / 100 → C (Cukup)**

### 10.1 Temuan Spesifik

| ID | Severity | Path | Ringkas |
|----|----------|------|---------|
| O-01 | High | `package.json` (root) & `apps/api/package.json` | Tidak ada `lint`/`typecheck`/`test`. Tambahkan `tsc --noEmit`, eslint, vitest. |
| O-02 | High | `vite.config.ts` | Tidak ada `build.rollupOptions.output.manualChunks` & tidak ada `React.lazy` untuk 24 halaman → bundle awal besar. |
| O-03 | High | `src/services/*` | Banyak `select('*')` (cek `requests/index.ts`) → over-fetch + cost network ↑; pakai kolom eksplisit. |
| O-04 | Medium | seluruh web legacy | Tidak ada client cache (React Query/SWR). Refetch berulang via hook polling. |
| O-05 | Medium | `apps/api/src/routes/*` | Tidak ada middleware `compression`, `helmet`, `morgan`, `express-rate-limit`. |
| O-06 | Medium | DB Supabase | Perlu index pada `attendance(profile_id, work_date)`, `requests(profile_id, status, request_type)`, `work_schedules(profile_id, date)`. |
| O-07 | Medium | `service-worker.js` | Cache versioning manual; siapkan migrasi otomatis ke `vite-plugin-pwa` bila bertambah kompleks. |
| O-08 | Low | `src/components` | Komponen Sidebar/Header memiliki banyak prop — pertimbangkan context untuk `currentUser`. |
| O-09 | Low | `mobile/src/lib/offlineQueue.ts` | Gunakan `crypto.randomUUID()` daripada `Math.random().substr` untuk ID antrian. |
| O-10 | Low | `documentation/hitungan_kpi.jsx` | Logika KPI live di file `.jsx` referensi — duplikasi dengan `KpiCalculator.tsx`. Konsolidasikan ke satu sumber. |

---

## 11. Rencana / Rekomendasi Perbaikan

Disusun **prioritas P0 (segera) → P3 (improvement berkelanjutan)**.
Setiap rekomendasi ditautkan ke ID temuan §9 / §10.

### P0 — Harus dikerjakan segera (≤ 1 sprint)

| # | Rekomendasi | Mengatasi | Acceptance criteria |
|---|-------------|-----------|---------------------|
| R-01 | **Rotasi & sanitasi semua secret committed.** Hapus `BETTER_AUTH_SECRET` real dari `apps/api/.env.example`, ganti dengan placeholder; rotasi secret di Vercel/Supabase; tambahkan `.env*` ke `.gitignore` root; jalankan `gitleaks`/`trufflehog` di history. | S-01, S-11 | Tidak ada secret nyata di repo, history dibersihkan / dirotasi, gitleaks CI pass. |
| R-02 | **Perbaiki Telegram webhook**: `return 401` ketika header secret tidak cocok, log structured. | S-02 | Unit-test verifikasi 401 untuk header invalid. |
| R-03 | **Privatkan bucket Supabase `attachments`**, pakai signed URL (TTL 5–15 menit). Update `documentation/README.md`. | S-03 | Bucket non-public, FE memanggil `getSignedUrl`, dokumentasi sesuai. |
| R-04 | **Hapus exposure `GEMINI_API_KEY` di bundle klien.** Pindahkan pemanggilan Gemini ke server (Edge Function / `apps/api`). | S-04 | Tidak ada `GEMINI_API_KEY` di hasil `vite build` (`grep` bundle bersih). |
| R-05 | **Aktifkan zod validation di seluruh route `apps/api`** (body, query, params). | S-06 | Tiap route punya `schema.parse` + 400 untuk input invalid. |
| R-06 | **Standardisasi RBAC** ke `requireRole(...)` middleware, hapus inline role-check. | S-05 | Inline check `req.user!.role !== ...` zero-occurrence di route. |

### P1 — Penting (1–2 sprint)

| # | Rekomendasi | Mengatasi | Acceptance criteria |
|---|-------------|-----------|---------------------|
| R-07 | **Hardening Express**: tambah `helmet`, `compression`, `express-rate-limit` (login + sensitif), `morgan` (atau pino) terhubung ke observability. | S-09, O-05 | Header keamanan pass `securityheaders.com` ≥ A, rate-limit aktif. |
| R-08 | **Audit semua RPC `SECURITY DEFINER`** — pastikan `SET search_path = public`, permission check (`auth.uid()` / `manager_id`) di awal. Tambahkan test SQL. | S-10 | Setiap RPC memiliki guard awal & `search_path` tetap. |
| R-09 | **Bersihkan `console.log` PII** di `src/services/*`. Gunakan `logger` dengan level + redaksi (mis. `pino` redact). | S-07 | Tidak ada `console.log(profile_id, payload)` di production build. |
| R-10 | **Tipe ketat**: hapus `as any` (25 occurrences). Definisikan `AuthenticatedRequest.user` proper, `Express.Request` augmentation. | S-08, O-01 | `tsc --noEmit --strict` pass. |
| R-11 | **CI Pipeline**: tambah GitHub Actions: `tsc --noEmit`, `eslint`, `npm audit --audit-level=high`, `gitleaks`, build dry-run, (lambat: vitest). | O-01 | Workflow file `.github/workflows/ci.yml` aktif & wajib. |
| R-12 | **Code-splitting**: lazy import per halaman role (`React.lazy` + `Suspense`). Tambah `manualChunks` untuk `xlsx`/`jspdf`/`leaflet`. | O-02 | Bundle awal turun ≥ 30% (`stats.html`). |
| R-13 | **Logika potong kuota cuti** di `requestsService.deductLeaveBalance` saat ini hanya log. Implementasikan transaksi DB + audit. | bug fungsional | Saat approve cuti, kuota tabel kuota terupdate; ada test integrasi. |

### P2 — Improvement (2–4 sprint)

| # | Rekomendasi | Mengatasi | Acceptance criteria |
|---|-------------|-----------|---------------------|
| R-14 | **Adopsi React Query** untuk web legacy (sama seperti `apps/web`). Mulai dari modul laporan & jadwal. | O-04 | Hook query/mutation menggantikan `useEffect+fetch` di ≥ 5 halaman besar. |
| R-15 | **Index DB**: tambahkan komposit index (`attendance(profile_id, work_date)`, `requests(profile_id, status, request_type)`, `work_schedules(profile_id, date)`). | O-06 | Migrasi SQL baru + EXPLAIN sebelum/sesudah. |
| R-16 | **Observability**: Sentry FE + (Sentry/Logtail) BE. Konfigurasi alert rate ≥ 1%. | logging | Error rate dashboard berjalan. |
| R-17 | **Konsolidasi rumus KPI** → satu modul shared (`src/lib/kpi.ts`) dipakai web + mobile + admin. | O-10 | `documentation/hitungan_kpi.jsx` jadi referensi saja, kode tunggal. |
| R-18 | **MFA / OTP** opsional untuk role `superadmin` & `admin` (better-auth plugin TOTP). | S-Auth | Login admin meminta TOTP. |
| R-19 | **Test coverage minimum**: target 50% untuk service layer (vitest) + 1 e2e Playwright per role (login, clock-in, submit cuti). | O-Testing | Coverage report di CI. |
| R-20 | **PWA**: migrasi ke `vite-plugin-pwa` + Workbox untuk update otomatis & precache build artefak. | O-07 | Install banner update tanpa hard reload. |

### P3 — Long-term

| # | Rekomendasi |
|---|-------------|
| R-21 | **Putuskan masa depan dual-stack**: pilih satu (Supabase ATAU Express+Drizzle) sebagai source-of-truth & buat roadmap migrasi (lihat §12). |
| R-22 | **Micro-frontend / mono-repo proper**: pindahkan ke `pnpm workspace` / `turborepo` agar `mobile`, `apps/api`, `apps/web`, `src` (root) berbagi types & lint config. |
| R-23 | **Audit privacy / DPIA**: data presensi (lokasi GPS), surat sakit, gaji, telegram_chat_id → buat data retention policy & user export/delete. |
| R-24 | **Internationalization** (saat ini Bahasa Indonesia hard-coded). Persiapkan i18n untuk multi-bahasa. |
| R-25 | **Accessibility audit** (WCAG 2.1 AA) terutama untuk halaman absensi & modal. |

---

## 12. Roadmap Migrasi (Supabase → Express/Drizzle)

Saat ini `apps/api` & `apps/web` adalah skeleton paralel. Untuk mengakhiri
*split-brain*:

1. **Freeze fitur baru di skema lama** kecuali bug fix.
2. **Mapping schema**: tabel `profiles` (Supabase) ↔ `employees` + `users` (Drizzle).
3. **Adapter layer**: buat `apiService.v2` yang switching ke Express via flag
   environment.
4. **Backfill / dual-write** sementara (event-driven) untuk fitur kritikal:
   attendance & requests.
5. **Cutover**: pindahkan auth ke better-auth, migrasi data via script Drizzle.
6. **Dekomisioning** Supabase Auth + RLS (tapi tetap pertahankan storage /
   edge function selama dibutuhkan, atau migrasikan ke S3 + serverless).

Risiko utama: kehilangan logic RPC `SECURITY DEFINER` — perlu di-port ke
service Express dengan permission check eksplisit di TypeScript + zod.

---

## 13. Lampiran: Konvensi & Glosarium

- **Bawahan / Atasan / Superadmin / Admin** — peran organisasi; `bawahan`
  dipakai sebagai folder grup halaman (`src/app/(app)/(bawahan)/...`),
  bukan role enum.
- **Workplace / Lokasi Kerja** — entitas tempat kerja (gedung/site) dengan
  koordinat & radius validasi.
- **Window Presensi** — interval valid clock-in/clock-out berdasarkan
  shift + grace period (`buildAttendanceWindow`).
- **RPC SECURITY DEFINER** — fungsi Postgres yang berjalan sebagai owner;
  digunakan untuk operasi manager yang harus bypass RLS.
- **APP_TIME_ZONE / APP_TIME_OFFSET** — konstanta zona waktu aplikasi
  (`src/lib/utils.ts`).
- **Disiplin Score** — angka per profil/bulan/tahun yang dihitung ulang via
  RPC `upsert_discipline_score`.

---

### Riwayat Revisi

| Versi | Tanggal | Catatan |
|-------|---------|---------|
| 1.0   | 2026-04-27 | Versi awal — mapping struktur, workflow, stack, scoring keamanan & optimalisasi, rekomendasi P0–P3. |
