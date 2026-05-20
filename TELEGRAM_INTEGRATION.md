# 📱 Telegram Bot Integration Guide

Dokumentasi lengkap untuk fitur Telegram notifications di Magnific Kling V3 Motion Control Web App.

## 🎯 Overview

Fitur ini memungkinkan Anda menerima notifikasi otomatis di Telegram ketika video generation selesai. Notifikasi mencakup:
- ✅ Status completion
- 📝 Nama task
- 🔗 Link video hasil generate
- 🎬 Video file (dikirim langsung ke chat)

**Keuntungan Pendekatan Backend-Only:**
- 🔒 Lebih aman (bot token tidak exposed ke frontend)
- ⚡ Lebih sederhana (konfigurasi satu kali di backend)
- 🎯 Centralized (satu tempat untuk semua konfigurasi)
- 🚀 Otomatis (tidak perlu konfigurasi ulang setiap kali)

## 🚀 Quick Start

### 1. Buat Telegram Bot

1. **Buka Telegram** dan cari `@BotFather`
2. **Kirim pesan** `/newbot`
3. **Ikuti instruksi**:
   - Masukkan nama bot (contoh: "My Kling Bot")
   - Masukkan username bot (harus diakhiri dengan "bot", contoh: "my_kling_bot")
4. **Simpan Bot Token** yang diberikan (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Dapatkan Chat ID

1. **Buka Telegram** dan cari `@userinfobot`
2. **Kirim pesan** `/start`
3. **Simpan Chat ID** yang diberikan (format: `123456789`)

### 3. Konfigurasi di Backend

**Cara 1: Menggunakan File .env (Recommended)**

1. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit file `.env` dan isi dengan credentials Anda:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=123456789
   ```

3. Restart server:
   ```bash
   npm run dev
   ```

**Cara 2: Menggunakan Environment Variables Langsung**

```bash
# Windows (CMD)
set TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
set TELEGRAM_CHAT_ID=123456789
npm run dev

# Windows (PowerShell)
$env:TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
$env:TELEGRAM_CHAT_ID="123456789"
npm run dev

# Linux/Mac
export TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
export TELEGRAM_CHAT_ID=123456789
npm run dev
```

### 4. Verifikasi

Saat server start, Anda akan melihat log:
```
✅ Telegram bot initialized from environment variables
```

Jika tidak dikonfigurasi:
```
ℹ️ Telegram bot not configured (TELEGRAM_BOT_TOKEN not set)
```

### 5. Mulai Generate

Setelah konfigurasi selesai, setiap kali video generation selesai, Anda akan otomatis menerima notifikasi di Telegram!

## 📋 Technical Details

### Backend Implementation

**Initialization (server.js)**
```javascript
// Telegram configuration from environment variables
const TELEGRAM_CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''
};

// Initialize on startup
function initTelegramBot() {
    if (TELEGRAM_CONFIG.BOT_TOKEN) {
        telegramBot = new TelegramBot(TELEGRAM_CONFIG.BOT_TOKEN, { polling: false });
        log('SUCCESS', 'Telegram bot initialized');
        return true;
    }
    return false;
}

initTelegramBot();
```

**Notification Function**
```javascript
async function sendTelegramNotification(taskName, videoUrl) {
    if (!telegramBot || !TELEGRAM_CONFIG.CHAT_ID) {
        return false; // Skip if not configured
    }
    
    const message = `🎬 *Magnific Kling V3 - Generation Complete*\n\n` +
                   `📝 Task: ${taskName}\n` +
                   `✅ Status: Completed\n` +
                   `🔗 Video URL: ${videoUrl}`;
    
    await telegramBot.sendMessage(TELEGRAM_CONFIG.CHAT_ID, message, {
        parse_mode: 'Markdown'
    });
    
    await telegramBot.sendVideo(TELEGRAM_CONFIG.CHAT_ID, videoUrl, {
        caption: '🎬 Generated Video'
    });
    
    return true;
}
```

**API Endpoint**
```
POST /api/telegram/notify
Body: {
  "taskName": "image.jpg + video.mp4",
  "videoUrl": "https://..."
}
Response: {
  "success": true,
  "message": "Notification sent to Telegram"
}
```

### Frontend Integration

**Simple Notification Call (app.js)**
```javascript
async function sendTelegramNotification(taskName, videoUrl) {
    try {
        await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskName, videoUrl })
        });
    } catch (error) {
        // Silently fail - don't block generation
    }
}

// Called after generation completes
await sendTelegramNotification(taskName, videoUrl);
```

### Notification Format

Pesan yang dikirim ke Telegram:
```
🎬 *Magnific Kling V3 - Generation Complete*

📝 Task: image.jpg + video.mp4
✅ Status: Completed
🔗 Video URL: https://...

[Video file attached]
```

## 🔐 Security Best Practices

### Bot Token Security

⚠️ **PENTING**: Bot Token adalah credential sensitif!

**DO:**
- ✅ Simpan di file .env (jangan commit ke Git)
- ✅ Gunakan environment variables
- ✅ Regenerate token jika bocor
- ✅ Restrict bot permissions jika perlu

**DON'T:**
- ❌ Jangan hardcode di source code
- ❌ Jangan commit ke Git repository
- ❌ Jangan share di screenshot/logs
- ❌ Jangan expose ke frontend

### .gitignore

Pastikan file `.env` ada di `.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### Production Deployment

Untuk production, set environment variables di hosting platform:

**Heroku:**
```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set TELEGRAM_CHAT_ID=your_chat_id
```

**Vercel:**
```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
```

**Railway:**
```bash
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set TELEGRAM_CHAT_ID=your_chat_id
```

## 🐛 Troubleshooting

### Problem: "Telegram bot not configured"

**Cause:** Environment variables tidak di-set

**Solution:**
1. Pastikan file `.env` ada dan berisi credentials
2. Atau set environment variables sebelum start server
3. Restart server setelah mengubah `.env`

### Problem: "Notification not sent"

**Possible Causes:**
1. Bot token invalid
2. Chat ID salah
3. Bot belum di-start oleh user
4. Network issue

**Solutions:**
- Verify bot token dari @BotFather
- Verify chat ID dari @userinfobot
- Buka bot di Telegram dan kirim `/start`
- Check server logs untuk error details

### Problem: "Video not sent to Telegram"

**Possible Causes:**
1. Video URL tidak accessible
2. Video file terlalu besar (>50MB limit Telegram)
3. Network timeout

**Solutions:**
- Verify video URL dapat diakses
- Check video file size
- Text message tetap terkirim meskipun video gagal

## 📊 Monitoring

### Server Logs

Backend mencatat semua aktivitas Telegram:

```bash
# Success
[timestamp] ✅ Telegram bot initialized from environment variables
[timestamp] ✅ Telegram notification sent { taskName: '...' }

# Info
[timestamp] ℹ️ Telegram bot not configured (TELEGRAM_BOT_TOKEN not set)
[timestamp] 🔍 Telegram notification skipped or failed

# Error
[timestamp] ❌ Failed to send Telegram notification { error: '...' }
```

### Health Check

Verifikasi Telegram configuration:
```bash
# Check if bot is initialized
curl http://localhost:3001/api/health
```

## 🔄 Migration from Old Version

Jika Anda menggunakan versi lama dengan frontend UI configuration:

**Old Approach (Frontend UI):**
- User input bot token dan chat ID di web interface
- Configuration per-session
- Token exposed ke frontend

**New Approach (Backend Only):**
- Configuration via environment variables
- One-time setup
- More secure

**Migration Steps:**
1. Hapus konfigurasi lama dari frontend (sudah otomatis)
2. Set environment variables di backend
3. Restart server
4. Done! Notifikasi akan otomatis terkirim

## ✅ Testing Checklist

- [ ] Bot token obtained from @BotFather
- [ ] Chat ID obtained from @userinfobot
- [ ] Environment variables set in .env file
- [ ] Server restarted after configuration
- [ ] Server logs show "Telegram bot initialized"
- [ ] Generate a test video
- [ ] Receive notification in Telegram
- [ ] Notification contains task name and video URL
- [ ] Video file received in Telegram

## 📚 Resources

### Official Documentation
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

### Useful Bots
- [@BotFather](https://t.me/BotFather) - Create and manage bots
- [@userinfobot](https://t.me/userinfobot) - Get your Chat ID
- [@RawDataBot](https://t.me/RawDataBot) - Get detailed chat info

### Telegram Limits
- Message length: 4096 characters
- File size: 50 MB (bots), 2 GB (users)
- API rate limit: 30 messages/second

## 🎉 Summary

Telegram integration sekarang **lebih sederhana dan aman**:

✅ **Konfigurasi sekali** di backend via environment variables  
✅ **Otomatis terkirim** setiap generation selesai  
✅ **Lebih aman** - bot token tidak exposed ke frontend  
✅ **Optional** - aplikasi tetap berjalan tanpa Telegram  
✅ **Silent failure** - tidak mengganggu generation process  

---

**Version:** 2.0.0 (Backend-Only Configuration)  
**Last Updated:** 2026-05-21  
**Author:** Magnific Kling V3 Team  
**Status:** ✅ Production Ready