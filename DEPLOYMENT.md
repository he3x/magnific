# 🚀 Panduan Deployment ke VPS

Panduan lengkap untuk deploy aplikasi Magnific Kling V3 ke VPS dengan support multi-user.

## 📋 Prasyarat

- VPS dengan Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Node.js 16+ dan npm
- Domain (opsional, tapi direkomendasikan)
- SSL Certificate (untuk HTTPS)

## 🔧 Setup VPS

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js & npm

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 4. Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
```

## 📦 Deploy Aplikasi

### 1. Clone/Upload Project ke VPS

```bash
# Buat direktori aplikasi
mkdir -p /var/www/magnific-kling
cd /var/www/magnific-kling

# Upload files atau clone dari git
# Jika menggunakan git:
# git clone <your-repo-url> .

# Atau upload manual via SCP/FTP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Struktur Folder

```bash
npm run setup
```

### 4. Konfigurasi Environment

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env
nano .env
```

Isi file `.env`:
```env
PORT=3000
NODE_ENV=production
```

### 5. Test Aplikasi

```bash
# Test run
npm start

# Jika berhasil, stop dengan Ctrl+C
```

## 🔄 Setup PM2 (Auto-restart & Background)

### 1. Start dengan PM2

```bash
pm2 start server.js --name magnific-kling
```

### 2. Setup Auto-start on Boot

```bash
pm2 startup
pm2 save
```

### 3. PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs magnific-kling

# Restart
pm2 restart magnific-kling

# Stop
pm2 stop magnific-kling

# Delete
pm2 delete magnific-kling
```

## 🌐 Setup Nginx (Reverse Proxy)

### 1. Buat Nginx Config

```bash
sudo nano /etc/nginx/sites-available/magnific-kling
```

Isi dengan:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase upload size limit
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for long uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/magnific-kling /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Setup SSL (HTTPS) dengan Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Generate SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot akan otomatis setup cron job untuk renewal
```

## 🔥 Setup Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## 📊 Monitoring & Maintenance

### 1. Monitor Logs

```bash
# PM2 logs
pm2 logs magnific-kling

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Monitor Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

### 3. Update Aplikasi

```bash
cd /var/www/magnific-kling

# Pull latest changes (jika menggunakan git)
git pull

# Install dependencies
npm install

# Restart aplikasi
pm2 restart magnific-kling
```

## 🔌 Deployment dengan Unix Socket (Recommended untuk Production)

### Kenapa Unix Socket?

Unix socket lebih baik untuk production deployment karena:
- ✅ **Performance**: Lebih cepat dari TCP (no network overhead)
- ✅ **Security**: File system permissions, tidak expose port
- ✅ **No Port Conflicts**: Tidak bentrok dengan aplikasi lain
- ✅ **Standard Practice**: Best practice untuk production dengan Nginx

### 1. Setup dengan Unix Socket

#### A. Upload Files ke Server

```bash
cd /var/www/magnific-kling

# Upload semua files termasuk:
# - server.js (sudah support Unix socket)
# - ecosystem.config.js (PM2 config)
# - nginx-magnific.conf (Nginx config template)
```

#### B. Install Dependencies

```bash
npm install
```

#### C. Setup Environment

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env
nano .env
```

Isi file `.env`:
```env
NODE_ENV=production
SOCKET_PATH=/tmp/magnific-kling.sock
PORT=3001
```

**Note**: `SOCKET_PATH` akan digunakan di production, `PORT` sebagai fallback untuk development.

#### D. Create Logs Directory

```bash
mkdir -p logs
```

#### E. Start dengan PM2 Ecosystem

```bash
# Start menggunakan ecosystem config
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup auto-start on boot
pm2 startup
# Jalankan command yang diberikan oleh PM2
```

#### F. Verify Socket File

```bash
# Check socket file exists
ls -la /tmp/magnific-kling.sock

# Should show something like:
# srw-rw-rw- 1 user user 0 May 21 05:00 /tmp/magnific-kling.sock
```

### 2. Setup Nginx untuk Unix Socket

#### A. Copy Nginx Config

```bash
# Copy config template ke sites-available
sudo cp nginx-magnific.conf /etc/nginx/sites-available/magnific.he3x.my.id

# Atau buat manual:
sudo nano /etc/nginx/sites-available/magnific.he3x.my.id
```

Config sudah include:
- ✅ Unix socket upstream
- ✅ HTTP to HTTPS redirect
- ✅ SSL configuration (untuk Certbot)
- ✅ Upload size limit (100MB)
- ✅ Proper timeouts
- ✅ Security headers

#### B. Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/magnific.he3x.my.id /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Setup SSL dengan Let's Encrypt

```bash
# Install Certbot (jika belum)
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d magnific.he3x.my.id

# Certbot akan otomatis update nginx config dengan SSL
```

### 4. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs magnific-kling

# Check Nginx
sudo systemctl status nginx

# Test application
curl https://magnific.he3x.my.id/api/health
```

### 5. PM2 Commands untuk Unix Socket

```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs magnific-kling

# Logs (file)
tail -f logs/out.log
tail -f logs/err.log

# Restart
pm2 restart magnific-kling

# Stop
pm2 stop magnific-kling

# Delete
pm2 delete magnific-kling

# Reload (zero-downtime)
pm2 reload magnific-kling
```

### 6. Troubleshooting Unix Socket

#### Socket file tidak ada
```bash
# Check PM2 logs
pm2 logs magnific-kling

# Check if process running
pm2 status

# Restart PM2
pm2 restart magnific-kling
```

#### Permission denied
```bash
# Check socket permissions
ls -la /tmp/magnific-kling.sock

# Should be: srw-rw-rw- (666)
# If not, restart PM2:
pm2 restart magnific-kling
```

#### Nginx 502 Bad Gateway
```bash
# Check socket exists
ls -la /tmp/magnific-kling.sock

# Check Nginx error log
sudo tail -f /var/log/nginx/magnific.error.log

# Check PM2 status
pm2 status

# Restart both
pm2 restart magnific-kling
sudo systemctl reload nginx
```

#### Socket file cleanup on restart
Socket file akan otomatis:
- ✅ Dihapus saat server start (cleanup old socket)
- ✅ Dibuat ulang dengan permissions 666
- ✅ Dihapus saat graceful shutdown

### 7. Comparison: TCP Port vs Unix Socket

| Feature | TCP Port | Unix Socket |
|---------|----------|-------------|
| Performance | Good | **Excellent** |
| Security | Exposed port | **File permissions** |
| Port conflicts | Possible | **None** |
| Setup complexity | Simple | Moderate |
| Production ready | Yes | **Recommended** |
| Multi-app server | Need port management | **Easy** |

## 🎯 Optimasi untuk Multi-User

### 1. Increase System Limits

Edit `/etc/security/limits.conf`:
```
* soft nofile 65536
* hard nofile 65536
```

### 2. PM2 Cluster Mode (untuk load balancing)

**Note**: Untuk Unix socket, gunakan single instance (sudah optimal).
Cluster mode lebih cocok untuk TCP port deployment.

```bash
# Jika ingin cluster mode (TCP port only):
pm2 delete magnific-kling
pm2 start server.js --name magnific-kling -i max
pm2 save
```

### 3. Setup Redis (untuk session management - opsional)

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

## 🔐 Keamanan Tambahan

### 1. Setup Fail2ban (proteksi brute force)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 2. Disable Root Login

Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Setup Rate Limiting di Nginx

Tambahkan di nginx config:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of config
}
```

## 📱 Akses Aplikasi

Setelah deployment selesai, aplikasi dapat diakses di:
- HTTP: `http://your-domain.com`
- HTTPS: `https://your-domain.com`

## 🐛 Troubleshooting

### Port sudah digunakan
```bash
# Cek port yang digunakan
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Nginx error
```bash
# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### PM2 tidak jalan
```bash
# Restart PM2
pm2 restart all

# Atau delete dan start ulang
pm2 delete all
pm2 start server.js --name magnific-kling
```

### Upload file gagal
- Cek `client_max_body_size` di nginx config
- Cek disk space: `df -h`
- Cek permissions: `ls -la /var/www/magnific-kling`

## 📈 Scaling untuk Traffic Tinggi

### 1. Horizontal Scaling (Multiple Servers)

Gunakan load balancer (Nginx/HAProxy) di depan multiple server instances.

### 2. Vertical Scaling (Upgrade VPS)

Upgrade RAM dan CPU sesuai kebutuhan.

### 3. CDN untuk Static Files

Gunakan CDN seperti Cloudflare untuk serve static files (CSS, JS, images).

## 💰 Estimasi Biaya VPS

| Provider | Spec | Harga/bulan |
|----------|------|-------------|
| DigitalOcean | 2GB RAM, 1 CPU | $12 |
| Vultr | 2GB RAM, 1 CPU | $12 |
| Linode | 2GB RAM, 1 CPU | $12 |
| Contabo | 4GB RAM, 2 CPU | €5 |
| Hetzner | 4GB RAM, 2 CPU | €4.5 |

**Rekomendasi**: Minimal 2GB RAM untuk handling multiple concurrent users.

## 📞 Support

Jika ada masalah saat deployment, cek:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/error.log`
3. System logs: `journalctl -xe`

---

**Happy Deploying! 🚀**