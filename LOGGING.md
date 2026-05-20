# 📊 Logging & Debugging Guide

Dokumentasi lengkap untuk memantau dan men-debug aplikasi Magnific Kling V3 Motion Control.

## 🎯 Overview

Aplikasi ini dilengkapi dengan comprehensive logging system di backend (server.js) dan frontend (public/app.js) untuk memudahkan debugging dan monitoring.

## 📝 Log Levels

### Backend & Frontend

| Level | Icon | Kegunaan | Contoh |
|-------|------|----------|--------|
| **ERROR** | ❌ | Error yang menyebabkan operasi gagal | Upload gagal, API error |
| **WARN** | ⚠️ | Warning yang tidak menghentikan operasi | Fallback ke method alternatif |
| **INFO** | ℹ️ | Informasi umum tentang operasi | Request received, operation started |
| **SUCCESS** | ✅ | Operasi berhasil | Upload complete, task finished |
| **DEBUG** | 🔍 | Detail teknis untuk debugging | API payload, response data |

## 🖥️ Backend Logging (server.js)

### Format Log

```
[2026-05-21T00:30:00.000Z] ✅ Message here
{
  "key": "value",
  "data": "additional info"
}
```

### Request ID Tracking

Setiap request mendapat unique ID untuk tracking:

```javascript
const requestId = Date.now();
log('INFO', `[${requestId}] Operation started`);
```

### Contoh Log Output

#### TikTok Download Success:
```
[2026-05-21T00:30:00.000Z] ℹ️ [1737417000000] TikTok download started
{
  "url": "https://vt.tiktok.com/ZSxMgCDmF/"
}
[2026-05-21T00:30:01.000Z] 🔍 [1737417000000] Trying TikWM API
[2026-05-21T00:30:02.000Z] ✅ [1737417000000] TikWM API success
[2026-05-21T00:30:03.000Z] 🔍 [1737417000000] Downloading video from TikWM
[2026-05-21T00:30:05.000Z] 🔍 [1737417000000] Video downloaded, size: 5242880 bytes
[2026-05-21T00:30:06.000Z] ℹ️ Starting public upload for: tiktok_1737417000000.mp4
[2026-05-21T00:30:07.000Z] ✅ Litterbox upload successful: https://litter.catbox.moe/abc123.mp4
[2026-05-21T00:30:08.000Z] ✅ [1737417000000] TikTok download complete
{
  "publicUrl": "https://litter.catbox.moe/abc123.mp4",
  "author": "username"
}
```

#### TikTok Download with Fallback:
```
[2026-05-21T00:30:00.000Z] ℹ️ [1737417000000] TikTok download started
[2026-05-21T00:30:01.000Z] 🔍 [1737417000000] Trying TikWM API
[2026-05-21T00:30:02.000Z] ⚠️ [1737417000000] TikWM API returned no video URL
[2026-05-21T00:30:03.000Z] 🔍 [1737417000000] Trying SSSTik API
[2026-05-21T00:30:04.000Z] ✅ [1737417000000] SSSTik API success
[2026-05-21T00:30:05.000Z] ✅ [1737417000000] TikTok download complete via SSSTik
```

#### Upload Error:
```
[2026-05-21T00:30:00.000Z] ℹ️ Uploading to Litterbox: image.png
{
  "size": 1048576
}
[2026-05-21T00:30:05.000Z] ❌ Litterbox upload failed
{
  "error": "Request failed with status code 504",
  "filename": "image.png"
}
[2026-05-21T00:30:06.000Z] ⚠️ Litterbox failed, trying tmpfiles.org
[2026-05-21T00:30:07.000Z] ✅ tmpfiles.org upload successful: https://tmpfiles.org/dl/abc123
```

### API Endpoints Logging

#### `/api/tiktok/download`
- Request ID tracking
- Method attempts (TikWM → SSSTik → MusicalDown)
- Video download progress
- Upload progress
- Final result

#### `/api/upload`
- File information (name, size)
- Upload progress untuk image dan video
- Final URLs

#### `/api/generate`
- Request parameters (tier, URLs)
- API payload sent to Magnific
- Task ID received
- Error responses

#### `/api/status/:taskId`
- Task ID being checked
- Current status
- Alternative endpoint attempts

#### `/api/proxy-video`
- URL being proxied
- Success/failure status

## 🌐 Frontend Logging (public/app.js)

### Browser Console Output

#### TikTok Download:
```javascript
[2026-05-21T00:30:00.000Z] ℹ️ Downloading TikTok video: https://vt.tiktok.com/...
[2026-05-21T00:30:05.000Z] ℹ️ 📥 Fetching video for preview...
[2026-05-21T00:30:08.000Z] ✅ Video blob created for preview
[2026-05-21T00:30:09.000Z] ✅ TikTok video added: TikTok_username_1737417000000.mp4
```

#### Generation Process:
```javascript
[2026-05-21T00:30:00.000Z] ℹ️ 🔑 Loaded 3 API key(s) for rotation
[2026-05-21T00:30:01.000Z] ℹ️ Memulai 5 tugas generasi...
[2026-05-21T00:30:02.000Z] ℹ️ 🔑 Using API Key #1 (Used 1 times)
[2026-05-21T00:30:03.000Z] ℹ️ Using TikTok public URL: https://litter.catbox.moe/...
[2026-05-21T00:30:04.000Z] ℹ️ Image URL: https://litter.catbox.moe/...
[2026-05-21T00:30:05.000Z] ℹ️ Video URL: https://litter.catbox.moe/...
[2026-05-21T00:35:00.000Z] ✅ Tugas 1/5 selesai
[2026-05-21T00:35:01.000Z] ℹ️ 🔑 Using API Key #2 (Used 1 times)
...
[2026-05-21T00:45:00.000Z] ℹ️ 📊 API Key Usage Stats:
{
  "totalKeys": 3,
  "currentIndex": 2,
  "usage": [
    { "key": "sk-abc...", "count": 2 },
    { "key": "sk-def...", "count": 2 },
    { "key": "sk-ghi...", "count": 1 }
  ]
}
```

## 🔍 Debugging Common Issues

### Issue 1: TikTok Download Gagal

**Check logs untuk:**
```
❌ [requestId] TikWM API failed
❌ [requestId] SSSTik API failed
❌ [requestId] MusicalDown API failed
❌ [requestId] All TikTok download methods failed
```

**Solusi:**
- Cek koneksi internet
- Coba URL TikTok yang berbeda
- Gunakan manual download dari ssstik.io

### Issue 2: Upload Gagal

**Check logs untuk:**
```
❌ Litterbox upload failed
❌ tmpfiles.org upload failed
❌ All upload services failed
```

**Solusi:**
- Cek ukuran file (max 10MB untuk image, 100MB untuk video)
- Coba lagi setelah beberapa saat
- Cek koneksi internet

### Issue 3: Generation Error

**Check logs untuk:**
```
❌ API Error (401): Unauthorized
❌ API Error (429): Too Many Requests
❌ Gagal mendapatkan Task ID dari response
```

**Solusi:**
- Cek API key valid
- Cek quota API key
- Tunggu beberapa saat jika rate limited

### Issue 4: NetworkError saat Generate

**Check logs untuk:**
```
⚠️ Failed to create blob, using direct URL
Using TikTok public URL: https://...
```

**Verify:**
- publicUrl ada dan valid
- Bukan blob URL yang dikirim ke API
- URL accessible dari server

## 📈 Monitoring Tips

### 1. Server Health Check
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-21T00:30:00.000Z",
  "uptime": 3600
}
```

### 2. Watch Server Logs
```bash
npm run dev
```

Semua logs akan muncul di terminal dengan format:
```
[timestamp] icon message
{data}
```

### 3. Browser Console
Buka Developer Tools (F12) → Console tab untuk melihat frontend logs

### 4. Network Tab
Buka Developer Tools (F12) → Network tab untuk melihat:
- API requests/responses
- Upload progress
- Error responses

## 🚨 Error Handling

### Backend Error Handlers

1. **Request Error Handler**
```javascript
app.use((err, req, res, next) => {
    log('ERROR', 'Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });
});
```

2. **Unhandled Rejection**
```javascript
process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', 'Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
});
```

3. **Uncaught Exception**
```javascript
process.on('uncaughtException', (error) => {
    log('ERROR', 'Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});
```

### Frontend Error Handling

Try-catch blocks di semua async operations dengan logging:
```javascript
try {
    // operation
} catch (error) {
    log('ERROR', 'Operation failed', {
        error: error.message,
        stack: error.stack
    });
    showNotification(`Error: ${error.message}`, 'error');
}
```

## 📊 Performance Monitoring

### Request Timing
Setiap request di-log dengan timestamp, bisa dihitung duration:
```
[2026-05-21T00:30:00.000Z] ℹ️ [1737417000000] Operation started
[2026-05-21T00:30:05.000Z] ✅ [1737417000000] Operation complete
Duration: 5 seconds
```

### API Key Usage Stats
Di akhir generation, lihat stats:
```javascript
{
  "totalKeys": 3,
  "currentIndex": 2,
  "usage": [
    { "key": "sk-abc...", "count": 2 },
    { "key": "sk-def...", "count": 2 },
    { "key": "sk-ghi...", "count": 1 }
  ]
}
```

## 🎓 Best Practices

1. **Selalu check logs saat error terjadi**
   - Backend logs di terminal
   - Frontend logs di browser console

2. **Gunakan Request ID untuk tracking**
   - Setiap request punya unique ID
   - Mudah trace dari start sampai finish

3. **Monitor upload progress**
   - Check Litterbox vs tmpfiles.org success rate
   - Adjust timeout jika perlu

4. **Track API key usage**
   - Pastikan rotation bekerja
   - Monitor quota per key

5. **Save logs untuk debugging**
   - Copy paste logs saat report bug
   - Include request ID dan timestamp

## 🔧 Troubleshooting Checklist

- [ ] Check server running: `http://localhost:3001/api/health`
- [ ] Check browser console untuk frontend errors
- [ ] Check terminal untuk backend errors
- [ ] Verify API keys valid
- [ ] Check file sizes (image < 10MB, video < 100MB)
- [ ] Check internet connection
- [ ] Try different TikTok URL jika download gagal
- [ ] Check Magnific API status
- [ ] Verify uploaded URLs accessible

## 📞 Support

Jika masih ada masalah setelah check logs:
1. Copy semua relevant logs (backend + frontend)
2. Include request ID
3. Describe expected vs actual behavior
4. Include screenshots jika perlu

---

**Last Updated:** 2026-05-21
**Version:** 1.0.0