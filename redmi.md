PRD — Website Dashboard Pencatatan Horenso & Terong
1) Ringkasan Produk

Nama produk: Kebun Log Dashboard
Tujuan: Membuat website untuk mencatat aktivitas kebun:

Jadwal & catatan penyemprotan

Jadwal & catatan penanaman

Hasil panen (horenso, terong, dan horenso per kontainer)
Semua data bisa dilihat di dashboard dan dibuat grafik panen per hari.

2) Target User
User	Kebutuhan
Admin/Owner	melihat laporan, grafik, export data, mengatur user
Staff Kebun	input catatan penyemprotan/penanaman/panen dengan cepat
3) Platform

Web responsive (desktop & mobile)

Fokus utama: input cepat + laporan mudah

4) Struktur Navigasi & Layout UI
Layout Global (Semua halaman setelah login)

Header Topbar

Kiri atas: Logo (text atau gambar)

Kanan atas: Tombol menu (hamburger / dropdown) berisi:

Dashboard

Penyemprotan

Penanaman

Panen

Grafik (Jumlah panen per hari)

Logout

Catatan UI: menu boleh juga dibuat sebagai sidebar, tapi minimal harus ada tombol menu kanan atas seperti requirement.

5) Halaman & Requirement Detail
A) Login Page

Goal: user bisa masuk dengan akun.
Komponen:

Form: email, password

Tombol: Login

Validasi: email format benar, password tidak kosong
Rules:

Setelah login sukses → redirect ke Dashboard

Jika gagal → tampilkan error message

B) Dashboard Page

Goal: ringkasan cepat aktivitas kebun.
Konten minimum:

Ringkasan total:

Total penyemprotan hari ini

Total penanaman hari ini

Total panen hari ini

Total panen minggu ini

Panel “Aktivitas terbaru” (list 10 terakhir):

menampilkan gabungan log penyemprotan/penanaman/panen

Shortcut tombol:

Tambah Penyemprotan

Tambah Penanaman

Tambah Panen

C) Halaman Penyemprotan

Goal: input catatan penyemprotan dan lihat tabel data.

Form Input (Prompt) wajib:

Catatan (text)

Pilih tanaman: Horenso / Terong (dropdown)

Tanggal (date)

Tempat (text atau dropdown)

Di bawah form tampil tabel penyemprotan
Kolom tabel:

Tanggal

Tanaman (Horenso/Terong)

Tempat

Catatan

Dibuat oleh (user)

Aksi: Edit, Hapus

Behavior:

Setelah submit: data masuk tabel dan form reset

Filter sederhana: tanggal range + tanaman + tempat (opsional tapi direkomendasikan)

D) Halaman Penanaman

Goal: input catatan penanaman dan lihat tabel data.

Form Input (Prompt) wajib:

Pilih tanaman: Horenso / Terong (dropdown)

Catatan (text)

Tempat (text atau dropdown)

Tanggal (date) — jika user tidak isi, default hari ini

Tabel penanaman (di bawah form)
Kolom tabel:

Tanggal

Tanaman

Tempat

Catatan

Dibuat oleh

Aksi: Edit, Hapus

E) Halaman Panen

Goal: input hasil panen dan lihat tabel data.

Form Input (Prompt) wajib:

Pilih jenis panen:

Horenso

Terong

Kontener Horenso

Tanggal (date)

Jumlah (number)

(Opsional tapi direkomendasikan) Satuan: kg / kardus / kontainer (dropdown)

(Opsional) Tempat

(Opsional) Catatan

Tabel panen (di bawah form)
Kolom tabel:

Tanggal

Jenis panen

Jumlah

Satuan

Tempat

Catatan

Dibuat oleh

Aksi: Edit, Hapus

Rules data:

Jika jenis panen = “Kontener Horenso”, default satuan = “kontainer”

F) Halaman Grafik (Jumlah Panen per Hari)

Goal: visualisasi jumlah panen harian.

Konten:

Filter:

rentang tanggal (start-end)

jenis panen (Horenso/Terong/Kontener Horenso/All)

Output:

Grafik jumlah panen per hari (line/bar chart)

Tabel ringkasan per hari (tanggal + total jumlah)

Perhitungan:

Group by tanggal, sum(qty)

6) Role & Akses
Role	Hak akses
Admin	semua akses + manage user (opsional tahap 2)
Staff	create/read/update/delete data log yang dibuat (atau semua log jika diset open)

MVP boleh: semua user yang login bisa lihat semua data, tapi wajib ada “created_by” untuk audit.

7) Data Model (Minimal)
Entity: User

id (UUID)

name

email

password_hash / auth_provider

role (ADMIN/STAFF)

created_at

Entity: SprayLog

id

date

crop (HORENSO/TERONG)

location (text)

note (text)

created_by (user_id)

created_at, updated_at

Entity: PlantingLog

id

date

crop (HORENSO/TERONG)

location (text)

note (text)

created_by

created_at, updated_at

Entity: HarvestLog

id

date

harvest_type (HORENSO/TERONG/KONTENER_HORENSO)

qty (number)

unit (kg/kardus/kontainer)

location (text)

note (text)

created_by

created_at, updated_at

8) Non-Functional Requirements

Responsive (mobile-friendly)

Form validation (required field + number validation)

Loading states + toast notification sukses/gagal

Keamanan login (session/JWT)

Data tersimpan permanen di database

Basic performance: list paging (jika data banyak)

9) Rekomendasi Tech Stack (untuk AI implement)

Prefer stack (recommended):

Frontend/Fullstack: Next.js (App Router) + TypeScript

UI: Tailwind CSS

Auth: NextAuth.js atau Supabase Auth

DB: PostgreSQL

ORM: Prisma

Charts: Recharts

Deploy: Vercel (app) + Supabase (DB)

10) MVP Scope (yang wajib jadi dulu)

Wajib:

Login

Dashboard ringkasan + aktivitas terbaru

CRUD: Penyemprotan, Penanaman, Panen

Grafik panen per hari + filter tanggal

Nice-to-have (fase 2):

Export CSV/Excel

Reminder jadwal

Manage lokasi sebagai master data (dropdown lokasi)

Role permission lebih ketat

11) Acceptance Criteria (Checklist)

 User bisa login dan logout

 Menu kanan atas berisi: Dashboard, Penyemprotan, Penanaman, Panen, Grafik

 Halaman Penyemprotan: form sesuai field + tabel tampil

 Halaman Penanaman: form sesuai field + tabel tampil

 Halaman Panen: form jenis panen + tanggal + jumlah + tabel tampil

 Halaman Grafik: bisa pilih rentang tanggal dan menampilkan grafik jumlah panen per hari

 Semua data tersimpan di database dan muncul setelah refresh