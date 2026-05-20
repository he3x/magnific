# 🔄 Perbedaan Server vs Local Environment

Penjelasan lengkap kenapa setup di server dan lokal berbeda, dan cara kerja masing-masing.

## 📊 **Tabel Perbedaan:**

| Aspek | Local (Development) | Server (Production) |
|-------|---------------------|---------------------|
| **Connection** | TCP Port (3001) | Unix Socket (/tmp/magnific-kling.sock) |
| **NODE_ENV** | development | production |
| **Access** | http://localhost:3001 | https://magnific.he3x.my.id |
| **Process Manager** | Manual (npm start) | PM2 (auto-restart) |
| **Reverse Proxy** | Tidak ada | Nginx |
| **SSL/HTTPS** | Tidak ada | Let's Encrypt |
| **Auto-start** | Manual | PM2 startup (boot) |
| **Logging** | Console | PM2 logs + file logs |

## 🎯 **Kenapa Berbeda?**

### **1. Connection Method**

**Local (TCP Port):**
```javascript
// server.js di local
app.listen(3001, () => {
    console.log('Server: http://localhost:3001');
});
```
- ✅ Simple, mudah untuk development
- ✅ Bisa langsung akses di browser
- ✅ Tidak perlu Nginx
- ❌ Port bisa conflict dengan app lain

**Server (Unix Socket):**
```javascript
// server.js di server
app.listen('/tmp/magnific-kling.sock', () => {
    console.log('Server: Unix Socket');
    console.log('Socket Path: /tmp/magnific-kling.sock');
});
```
- ✅ Lebih cepat (no network overhead)
- ✅ Lebih aman (file permissions)
- ✅ Tidak ada port conflict
- ✅ Best practice untuk production
- ❌ Butuh Nginx untuk akses dari luar

### **2. Environment Variables**

**Local (.env):**
```env
NODE_ENV=development
PORT=3001
```

**Server (.env):**
```env
NODE_ENV=production
SOCKET_PATH=/tmp/magnific-kling.sock
PORT=3001
```

**Cara Kerja di server.js:**
```javascript
const SOCKET_PATH = process.env.SOCKET_PATH || null;
const USE_SOCKET = SOCKET_PATH && process.env.NODE_ENV === 'production';

if (USE_SOCKET) {
    // Production: Use Unix socket
    server = app.listen(SOCKET_PATH, () => { ... });
} else {
    // Development: Use TCP port
    server = app.listen(PORT, () => { ... });
}
```

### **3. Process Management**

**Local:**
```bash
# Start manual
npm start
# atau
node server.js

# Stop dengan Ctrl+C
```

**Server:**
```bash
# Start dengan PM2
pm2 start ecosystem.config.js

# Auto-restart jika crash
# Auto-start on boot
# Background process
```

### **4. Access Method**

**Local:**
```
Direct access: http://localhost:3001
```

**Server:**
```
Browser → Nginx (port 80/443) → Unix Socket → Node.js App
```

## 🔧 **Cara Kerja di Masing-masing Environment:**

### **Local Development:**

1. **Start aplikasi:**
   ```bash
   npm start
   ```

2. **Access:**
   ```
   http://localhost:3001
   ```

3. **Logs:**
   - Langsung di terminal/console

4. **Stop:**
   - Ctrl+C di terminal

### **Server Production:**

1. **Start aplikasi:**
   ```bash
   pm2 start ecosystem.config.js
   ```

2. **Access:**
   ```
   https://magnific.he3x.my.id
   ```

3. **Logs:**
   ```bash
   pm2 logs magnific-kling
   # atau
   tail -f logs/out.log
   ```

4. **Stop:**
   ```bash
   pm2 stop magnific-kling
   ```

## 🎨 **Diagram Arsitektur:**

### **Local:**
```
Browser → http://localhost:3001 → Node.js App (TCP Port)
```

### **Server:**
```
Browser → https://magnific.he3x.my.id (443)
    ↓
Nginx (Reverse Proxy)
    ↓
Unix Socket (/tmp/magnific-kling.sock)
    ↓
Node.js App (PM2)
```

## 💡 **Kenapa Pakai Unix Socket di Server?**

### **Keuntungan Unix Socket:**

1. **Performance:**
   - Lebih cepat 10-20% dari TCP
   - No network stack overhead
   - Direct IPC (Inter-Process Communication)

2. **Security:**
   - File system permissions
   - Tidak expose port ke internet
   - Hanya Nginx yang bisa akses

3. **No Port Conflicts:**
   - Tidak bentrok dengan app lain
   - Bisa run multiple apps tanpa masalah port

4. **Production Standard:**
   - Best practice untuk production
   - Dipakai oleh semua major platforms

### **Kenapa Tidak Pakai di Local?**

- ❌ Lebih ribet untuk development
- ❌ Butuh Nginx (overkill untuk local)
- ❌ Tidak bisa direct access dari browser
- ✅ TCP port lebih simple untuk testing

## 🔄 **Switching Between Environments:**

### **Test Production Mode di Local:**

```bash
# Set environment
export NODE_ENV=production
export SOCKET_PATH=/tmp/magnific-kling-local.sock

# Start
node server.js

# Di terminal lain, test dengan curl
curl --unix-socket /tmp/magnific-kling-local.sock http://localhost/api/health
```

### **Test Development Mode di Server:**

```bash
# Set environment
export NODE_ENV=development
export PORT=3001

# Start
node server.js

# Access (jika firewall allow)
curl http://server-ip:3001/api/health
```

## 📝 **Best Practices:**

### **Local Development:**

1. **Gunakan TCP Port:**
   ```env
   NODE_ENV=development
   PORT=3001
   ```

2. **Start dengan npm:**
   ```bash
   npm start
   ```

3. **Hot reload (optional):**
   ```bash
   npm install -g nodemon
   nodemon server.js
   ```

### **Server Production:**

1. **Gunakan Unix Socket:**
   ```env
   NODE_ENV=production
   SOCKET_PATH=/tmp/magnific-kling.sock
   ```

2. **Start dengan PM2:**
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Monitor:**
   ```bash
   pm2 monit
   ```

## 🐛 **Troubleshooting:**

### **"Kenapa di local bisa, di server tidak?"**

**Possible causes:**

1. **Environment variables berbeda:**
   ```bash
   # Check di server
   cat .env
   
   # Harus ada:
   NODE_ENV=production
   SOCKET_PATH=/tmp/magnific-kling.sock
   ```

2. **Socket file tidak ada:**
   ```bash
   ls -la /tmp/magnific-kling.sock
   
   # Jika tidak ada, restart PM2:
   pm2 restart magnific-kling
   ```

3. **Nginx tidak running:**
   ```bash
   sudo systemctl status nginx
   
   # Jika tidak running:
   sudo systemctl start nginx
   ```

4. **Permissions issue:**
   ```bash
   # Check socket permissions
   ls -la /tmp/magnific-kling.sock
   
   # Should be: srw-rw-rw-
   ```

### **"Kenapa di server bisa, di local tidak?"**

**Possible causes:**

1. **Port sudah dipakai:**
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   
   # Ganti port di .env
   PORT=3002
   ```

2. **Dependencies tidak terinstall:**
   ```bash
   npm install
   ```

3. **Environment variables salah:**
   ```bash
   # Check .env
   cat .env
   
   # Harus ada:
   NODE_ENV=development
   PORT=3001
   ```

## 📚 **Summary:**

| Pertanyaan | Jawaban |
|------------|---------|
| **Kenapa server pakai Unix socket?** | Lebih cepat, aman, dan best practice untuk production |
| **Kenapa local pakai TCP port?** | Lebih simple untuk development dan testing |
| **Apakah harus sama?** | Tidak, environment berbeda butuh setup berbeda |
| **Bisa pakai Unix socket di local?** | Bisa, tapi tidak recommended (ribet) |
| **Bisa pakai TCP port di server?** | Bisa, tapi tidak recommended (kurang aman) |

## 🎯 **Kesimpulan:**

**Perbedaan ini NORMAL dan DISENGAJA:**

- ✅ Local: Simple setup untuk development
- ✅ Server: Optimized setup untuk production
- ✅ Keduanya menggunakan code yang sama (server.js)
- ✅ Automatic switching berdasarkan environment variables

**Tidak perlu khawatir tentang perbedaan ini!** 

Code sudah di-design untuk handle kedua environment secara otomatis. Anda hanya perlu set environment variables yang benar di masing-masing environment.

---

**Happy Coding! 🚀**