Berikut adalah konten README yang lebih lengkap untuk Aplikasi Kuis Berbasis Web:

# Aplikasi Kuis Berbasis Web

Aplikasi kuis berbasis web yang dibangun menggunakan **Bottle** sebagai framework backend, **MySQL** melalui **Laragon** sebagai basis data, serta **Tailwind CSS** dan **DaisyUI** untuk frontend.

## Fitur

- **Autentikasi Pengguna**: Sistem login dan registrasi untuk admin dan pengguna.
- **Dashboard Admin**: Mengelola kuis, pertanyaan, dan melihat statistik pengguna.
- **Dashboard Pengguna**: Mengikuti kuis, melihat riwayat pengerjaan, dan skor.
- **Jenis Soal Beragam**: Mendukung soal pilihan ganda dan esai.
- **Penilaian Otomatis dan Manual**: Soal pilihan ganda dinilai otomatis; soal esai dinilai oleh admin.
- **Analitik**: Menampilkan statistik hasil kuis dan performa pengguna.
- **Responsif dan Interaktif**: Antarmuka yang menarik dan mudah digunakan dengan komponen dari DaisyUI.

## Persyaratan Sistem

- **Python 3.x**: Unduh dari [python.org](https://www.python.org/downloads/).
- **Node.js dan npm**: Unduh dari [nodejs.org](https://nodejs.org/).
- **Laragon**: Unduh dari [laragon.org](https://laragon.org/download/).
- **Browser modern**: Seperti Chrome, Firefox, atau Edge.

## Instalasi

### 1. Clone Repository

Unduh kode sumber aplikasi dari repository Git:

```bash
git clone https://github.com/username/quiz.git
cd quiz
```

### 2. Persiapan Lingkungan Backend

- **Membuat Virtual Environment**: Untuk mengisolasi dependensi Python.

  ```bash
  python -m venv venv
  ```

- **Mengaktifkan Virtual Environment**:

  - **Windows**:

    ```bash
    venv\Scripts\activate
    ```

  - **macOS/Linux**:

    ```bash
    source venv/bin/activate
    ```

- **Menginstal Dependensi Python**:

  ```bash
  pip install -r requirements.txt
  ```

### 3. Konfigurasi Basis Data

- **Menjalankan Laragon**: Pastikan Laragon aktif dan MySQL berjalan.
- **Membuat Basis Data**: Buat basis data baru untuk aplikasi ini melalui phpMyAdmin atau alat manajemen MySQL lainnya.
- **Konfigurasi Koneksi**: Perbarui informasi koneksi basis data di file konfigurasi aplikasi sesuai dengan kredensial dan nama basis data yang telah dibuat.

### 4. Persiapan Frontend

- **Menginstal Tailwind CSS dan DaisyUI**:

  ```bash
  npm install -D tailwindcss daisyui
  ```

- **Mengompilasi Tailwind CSS**: Jalankan perintah berikut untuk mengompilasi Tailwind CSS dan memantau perubahan:

  ```bash
  npx tailwindcss -i ./static/css/styles.css -o ./static/css/output.css --watch
  ```

### 5. Menjalankan Aplikasi

- **Menjalankan Server Backend**:

  ```bash
  python app.py
  ```

- **Mengakses Aplikasi**: Buka browser dan navigasikan ke `http://localhost:8000` untuk mengakses aplikasi kuis.

## Catatan Tambahan

- **Migrasi Basis Data**: Jika aplikasi menggunakan migrasi basis data, pastikan untuk menjalankan migrasi yang diperlukan sebelum memulai aplikasi.
- **Variabel Lingkungan**: Periksa apakah ada variabel lingkungan yang perlu disetel, seperti `SECRET_KEY` atau kredensial basis data.
- **Dokumentasi Tambahan**: Untuk informasi lebih lanjut, lihat dokumentasi resmi dari [Bottle](https://bottlepy.org/docs/dev/), [Tailwind CSS](https://tailwindcss.com/docs), dan [DaisyUI](https://daisyui.com/).

Dengan mengikuti langkah-langkah di atas, Anda seharusnya dapat menginstal dan menjalankan Aplikasi Kuis Berbasis Web dengan lancar. 
