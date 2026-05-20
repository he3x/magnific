# 🚀 Magnific Kling V3 Motion Control - Web Application

Aplikasi web untuk menghasilkan video motion menggunakan Magnific Kling V3 API. Konversi dari Python script ke aplikasi web berbasis JavaScript.

## ✨ Fitur

- 🖼️ Upload multiple gambar referensi (JPG, JPEG, PNG)
- 🎬 Upload multiple video referensi (MP4, MOV)
- 👁️ Preview file yang diupload
- 🔄 Progress tracking real-time
- 📊 Support mode Standard (720p) dan Pro (1080p)
- ⬇️ Download hasil video langsung dari browser
- 🎯 Batch processing hingga 25 tugas
- 📱 Responsive design untuk mobile dan desktop

## 🛠️ Cara Menggunakan

### 1. Buka Aplikasi

Cukup buka file `index.html` di browser modern (Chrome, Firefox, Edge, Safari).

```bash
# Cara 1: Double click file index.html
# Cara 2: Buka dengan browser
# Cara 3: Gunakan local server (opsional)
python -m http.server 8000
# Lalu buka http://localhost:8000
```

### 2. Masukkan API Key

- Dapatkan API Key dari [Magnific.ai](https://magnific.com)
- Masukkan API Key di field yang tersedia
- Pilih mode: Standard (720p) atau Pro (1080p)

### 3. Upload File

**Upload Gambar:**
- Format: JPG, JPEG, PNG
- Maksimal: 10MB per file
- Bisa upload multiple files

**Upload Video:**
- Format: MP4, MOV
- Maksimal: 100MB per file
- Bisa upload multiple files

### 4. Generate Video

- Klik tombol "Generate Motion Videos"
- Tunggu proses upload dan rendering
- Monitor progress di section Progress Generasi
- Hasil akan muncul di section Hasil Generasi

### 5. Download Hasil

- Klik tombol "Preview" untuk melihat video
- Klik tombol "Download" untuk mengunduh video

## 📋 Logika Pairing

Aplikasi akan otomatis mempasangkan gambar dan video:

1. **Jika 1 video + multiple gambar**: Setiap gambar akan dipasangkan dengan video yang sama
2. **Jika 1 gambar + multiple video**: Gambar yang sama akan dipasangkan dengan setiap video
3. **Jika multiple gambar + multiple video**: Pairing berdasarkan urutan (gambar[0] + video[0], gambar[1] + video[1], dst)

## 🔧 Konfigurasi

Edit file `app.js` untuk mengubah konfigurasi:

```javascript
const CONFIG = {
    MAX_IMG_MB: 10,        // Maksimal ukuran gambar (MB)
    MAX_VID_MB: 100,       // Maksimal ukuran video (MB)
    MAX_QUOTA: 25,         // Maksimal tugas per session
    POLL_INTERVAL_MS: 10000, // Interval cek status (ms)
    MAX_POLL_ATTEMPTS: 60  // Maksimal percobaan cek status
};
```

## 🌐 Upload Service

Aplikasi menggunakan layanan upload publik untuk file:

1. **Litterbox (Primary)**: Upload ke litterbox.catbox.moe (72 jam)
2. **tmpfiles.org (Fallback)**: Jika Litterbox gagal

File akan otomatis diupload ke salah satu layanan ini sebelum dikirim ke Magnific API.

## ⚠️ Catatan Penting

- **CORS**: Beberapa browser mungkin memblokir request ke API eksternal. Gunakan browser modern atau disable CORS untuk development.
- **API Key**: Jangan share API Key Anda. Simpan dengan aman.
- **Quota**: Perhatikan quota API Anda di Magnific.
- **File Size**: Pastikan file tidak melebihi batas maksimal.
- **Internet**: Memerlukan koneksi internet stabil untuk upload dan API calls.

## 🔒 Keamanan

- API Key disimpan hanya di memory browser (tidak di-save)
- File diupload ke layanan publik temporary (72 jam)
- Tidak ada data yang disimpan di server

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🐛 Troubleshooting

### Upload Gagal
- Cek koneksi internet
- Pastikan ukuran file tidak melebihi batas
- Coba refresh browser

### API Error
- Pastikan API Key valid
- Cek quota API Anda
- Cek format file yang diupload

### Video Tidak Muncul
- Tunggu hingga proses selesai (bisa 5-10 menit per video)
- Cek console browser untuk error
- Refresh halaman dan coba lagi

## 📝 Perbandingan dengan Python Version

| Fitur | Python | Web App |
|-------|--------|---------|
| Platform | CLI | Browser |
| UI | Terminal | Visual Web Interface |
| Preview | ❌ | ✅ |
| Progress | Text | Visual Progress Bar |
| Download | Auto | Manual/Auto |
| Multi-platform | Perlu Python | Universal (Browser) |

## 🎯 Roadmap

- [ ] Tambah toast notification (ganti alert)
- [ ] Simpan API Key di localStorage (optional)
- [ ] Batch download semua hasil
- [ ] History hasil generasi
- [ ] Dark mode
- [ ] Drag & drop upload

## 📄 Lisensi

Aplikasi ini dibuat untuk kemudahan penggunaan Magnific Kling V3 API. Pastikan Anda memiliki lisensi yang valid dari Magnific.ai.

## 🤝 Kontribusi

Silakan fork dan submit pull request untuk improvement!

---

**Dibuat dengan ❤️ untuk kemudahan generate motion videos**