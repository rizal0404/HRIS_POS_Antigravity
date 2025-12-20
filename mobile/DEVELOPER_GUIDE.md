# Panduan Development & Produksi HRISPOS Mobile

Dokumentasi lengkap untuk developer yang akan melanjutkan pengembangan aplikasi HRISPOS Mobile.

---

## 📁 Struktur Proyek

```
hris-prototype_new/
├── mobile/                    # Aplikasi Mobile (Expo/React Native)
│   ├── src/
│   │   ├── screens/           # Halaman-halaman aplikasi
│   │   ├── components/        # Komponen reusable
│   │   ├── lib/               # Utility & helper functions
│   │   ├── navigation/        # Konfigurasi navigasi
│   │   └── types/             # TypeScript types
│   ├── assets/                # Gambar, icon, fonts
│   ├── android/               # Native Android project (auto-generated)
│   ├── app.json               # Konfigurasi Expo
│   └── package.json           # Dependencies
├── src/                       # Backend/Web (jika ada)
└── ...
```

---

## 🚀 Setup Development Environment

### Prasyarat
1. **Node.js** v18+ → [Download](https://nodejs.org/)
2. **Android Studio** → [Download](https://developer.android.com/studio)
   - Install Android SDK
   - Install NDK 27.1.12297006
   - Setup Android Emulator atau gunakan HP dengan USB Debugging
3. **JDK 17** → [Download Temurin](https://adoptium.net/)
4. **Git** → [Download](https://git-scm.com/)

### Langkah Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd hris-prototype_new/mobile

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env dengan kredensial Supabase yang benar

# 4. Generate native project
npx expo prebuild

# 5. Jalankan di Android
npx expo run:android
```

---

## 🔧 Mode Development

### Menjalankan Aplikasi (Debug Mode)
```bash
cd mobile
npx expo run:android
```

**Fitur Debug Mode:**
- ✅ Hot Reload (perubahan kode langsung terlihat)
- ✅ Error messages detail
- ✅ React DevTools
- ✅ Console logging

### Menjalankan Metro Bundler Terpisah
```bash
npx expo start
```
Gunakan ini jika sudah pernah build dan hanya ingin reload JS bundle.

---

## 📦 Build APK Produksi

### 1. Persiapan Keystore
File keystore sudah ada di: `mobile/hrispos-release.keystore`
- **Alias:** hrispos
- **Password:** hrispos123

> ⚠️ **PENTING:** Simpan file keystore dengan aman! Jika hilang, Anda tidak bisa update aplikasi di Play Store.

### 2. Build Release APK
```bash
cd mobile/android
./gradlew assembleRelease
```

### 3. Lokasi APK
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 4. Update Versi
Edit `mobile/app.json`:
```json
{
  "expo": {
    "version": "1.0.1",  // Naikkan setiap release
    ...
  }
}
```

---

## 🔄 Workflow Update Aplikasi

### Untuk Perubahan Kecil (UI/Logic)
1. Edit kode di `src/`
2. Test dengan `npx expo run:android`
3. Jika sudah OK, build release: `./gradlew assembleRelease`
4. Distribusikan APK baru

### Untuk Penambahan Library Native
Jika menambah library yang mengandung kode native (seperti maps, camera, sensors):
```bash
# 1. Install library
npx expo install <nama-library>

# 2. Regenerate native project
npx expo prebuild --clean

# 3. Build ulang
npx expo run:android
```

---

## 🛡️ Fitur Keamanan

### Mock Location Detection
File: `src/screens/ClockScreen.tsx`

Aplikasi ini memiliki 2 lapis deteksi lokasi palsu:
1. **Native Check** (`location.mocked`) - Dari Android OS
2. **JailMonkey** - Deteksi root/jailbreak/developer mode

### Device Security
Library `jail-monkey` digunakan untuk mendeteksi:
- Rooted/Jailbroken devices
- Developer Mode aktif
- Mock location enabled

---

## 🗺️ Peta (Leaflet)

Aplikasi menggunakan **Leaflet** (OpenStreetMap) via WebView untuk menghindari biaya Google Maps.

File: `src/screens/ClockScreen.tsx`

Untuk mengganti tile server atau style peta, edit bagian:
```javascript
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);
```

---

## 🗃️ Database (Supabase)

### Konfigurasi
File: `mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
```

### Tabel Utama
- `profiles` - Data karyawan
- `attendance` - Record absensi
- `work_schedules` - Jadwal kerja
- `shifts` - Template shift
- `requests` - Pengajuan (cuti, izin, dll)

---

## 📱 Konfigurasi Aplikasi

### Package & Nama
File: `mobile/app.json`
```json
{
  "expo": {
    "name": "HRISPOS Mobile",
    "android": {
      "package": "com.qctonasa.hris"
    }
  }
}
```

### Permissions
```json
"permissions": [
  "CAMERA",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```

---

## 🐛 Troubleshooting

### Error: "Unable to resolve module"
```bash
# Hapus cache dan reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Error: "NDK not found"
- Buka Android Studio → Settings → SDK Tools
- Install NDK versi 27.1.12297006

### Error: "JAVA_HOME not set"
- Install JDK 17
- Set environment variable JAVA_HOME

### Build Release Gagal
```bash
# Clean build
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## 📚 Referensi

- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Leaflet](https://leafletjs.com/)

---

## 👤 Kontak

Untuk pertanyaan teknis, hubungi tim development atau buat issue di repository.
