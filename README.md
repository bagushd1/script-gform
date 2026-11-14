# War GForm Timer

Alat otomatisasi submit Google Form terjadwal dengan presisi detik langsung dari browser. Didesain 100% *client-side* (serverless) tanpa perlu runtime Node.js, database, atau instalasi dependensi tambahan.

---

## Fitur Utama

- **100% Client-Side (Serverless)**: Cukup satu file `index.html`. Bisa dibuka langsung di browser PC maupun HP, atau di-host via GitHub Pages.
- **Auto-Extract Pertanyaan**: Cukup paste kode HTML source Google Form (`Ctrl+U`), sistem otomatis mengekstrak form action dan memunculkan kolom input teks serta dropdown opsi jawaban. Tidak perlu mencari `entry.ID` secara manual.
- **Timing Presisi Tinggi**: Melakukan polling waktu sistem lokal setiap 50 milidetik untuk menembak tepat di detik target.
- **Screen Wake Lock API**: Secara otomatis mencegah layar perangkat meredup atau terkunci (*auto-lock*) saat timer sedang aktif (didukung di browser modern).
- **Status Visual Interaktif**: Indikator status berwarna oranye berdenyut (*pulsing*) saat menunggu, dan berubah hijau seketika setelah formulir berhasil terkirim.

---

## Cara Penggunaan

### 1. Di Komputer / Laptop

1. Buka file `index.html` di browser (Chrome / Edge / Firefox).
2. Buka halaman Google Form target di tab baru, lalu tekan **Ctrl + U** (View Source).
3. Pilih semua kode (**Ctrl + A**), lalu salin (**Ctrl + C**).
4. Kembali ke halaman **War GForm Timer**, paste kodenya ke kotak *"Paste Source HTML Google Form"*, lalu klik **Ekstrak Form**.
5. Kolom pertanyaan akan muncul otomatis. Isi jawaban yang kamu inginkan.
6. Tentukan jam, menit, dan detik tembak.
7. Klik **Pasang Timer** dan biarkan tab tetap aktif.

### 2. Di Smartphone (Android / iOS)

1. Buka halaman web melalui browser HP (atau buka lewat link GitHub Pages).
2. Di Google Chrome Android, buka tab Google Form target, lalu tambahkan `view-source:` di depan URL (contoh: `view-source:https://docs.google.com/forms/d/e/...`).
3. Salin seluruh teks kode HTML yang muncul, lalu paste ke halaman timer.
4. Isi jawaban, set jam tembak, dan klik **Pasang Timer**.
5. **Penting:** Pastikan tab browser tetap aktif di layar hingga waktu tembak tiba.

---

## Menjalankan Unit Test

Untuk memverifikasi fungsi normalisasi URL dan parser HTML:

```bash
node test.js
```

---

## Catatan & Batasan

- **Koneksi Internet**: Pastikan perangkat memiliki koneksi internet stabil saat detik tembak tiba.
- **Autentikasi Form**: Script ini dirancang untuk formulir publik. Tidak mendukung formulir yang mewajibkan login akun Google tertentu atau memiliki verifikasi reCAPTCHA.
- **Latar Belakang di HP**: Karena sistem operasi mobile (Android/iOS) membatasi eksekusi JavaScript pada aplikasi latar belakang, browser harus tetap berada di layar (tidak di-minimize atau di-close).
