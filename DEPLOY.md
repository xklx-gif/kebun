# Deploy Online (Render)

Project ini sudah disiapkan untuk deploy di Render dengan file `render.yaml`.

## 1) Push ke GitHub

```bash
git init
git add .
git commit -m "Kebun dashboard ready for deploy"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## 2) Deploy di Render

1. Buka `https://dashboard.render.com/blueprints`
2. Klik `New Blueprint Instance`
3. Pilih repo GitHub Anda
4. Klik `Apply`

Render akan:
- Menjalankan `npm install`
- Menjalankan `npm start`
- Menyediakan health check `GET /api/health`
- Membuat persistent disk di path `data/` (via `render.yaml`)

## 3) Akses online

Setelah status `Live`, gunakan URL dari Render (contoh: `https://kebun-log-dashboard.onrender.com`).

## Deploy Online (Vercel)

Project ini juga sudah kompatibel untuk Vercel via `vercel.json`.

### 1) Deploy dari GitHub

1. Buka:
   `https://vercel.com/new/clone?repository-url=https://github.com/xklx-gif/kebun`
2. Login Vercel dan lanjutkan import project.
3. Tambahkan environment variable:
   - `DATABASE_URL` = connection string Neon (Postgres)
   - `JWT_SECRET` = string acak panjang
   - `COOKIE_SECURE` = `true`
4. Klik `Deploy`.

### 2) Catatan penting SQLite di Vercel

Project ini sudah dimigrasi ke Postgres dan direkomendasikan memakai Neon agar data permanen.
