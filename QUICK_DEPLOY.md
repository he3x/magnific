# ⚡ Quick Deployment Guide - magnific.he3x.my.id

Panduan cepat untuk deploy Magnific Kling V3 dengan Unix Socket ke server Anda.

## 📋 Pre-Deployment Checklist

- [ ] VPS sudah running dengan Ubuntu/Debian
- [ ] Node.js 16+ sudah terinstall
- [ ] PM2 sudah terinstall (`npm install -g pm2`)
- [ ] Nginx sudah terinstall
- [ ] Domain magnific.he3x.my.id sudah pointing ke server IP

## 🚀 Deployment Steps

### 1. Upload Files ke Server

```bash
# SSH ke server
ssh user@your-server-ip

# Buat direktori (jika belum ada)
sudo mkdir -p /var/www/magnific-kling
sudo chown -R $USER:$USER /var/www/magnific-kling

# Upload files via SCP dari local machine:
# scp -r * user@your-server-ip:/var/www/magnific-kling/
```

### 2. Install Dependencies

```bash
cd /var/www/magnific-kling
npm install
```

### 3. Setup Environment

```bash
# Copy .env.example
cp .env.example .env

# Edit .env
nano .env
```

Pastikan isi `.env`:
```env
NODE_ENV=production
SOCKET_PATH=/tmp/magnific-kling.sock
PORT=3001
```

### 4. Create Logs Directory

```bash
mkdir -p logs
```

### 5. Start dengan PM2

```bash
# Start aplikasi
pm2 start ecosystem.config.js

# Verify running
pm2 status

# Check logs
pm2 logs magnific-kling --lines 50

# Save PM2 list
pm2 save

# Setup auto-start
pm2 startup
# Jalankan command yang diberikan PM2
```

### 6. Verify Socket File

```bash
# Check socket exists
ls -la /tmp/magnific-kling.sock

# Should show: srw-rw-rw- (permissions 666)
```

### 7. Setup Nginx

```bash
# Copy nginx config
sudo cp nginx-magnific.conf /etc/nginx/sites-available/magnific.he3x.my.id

# Enable site
sudo ln -s /etc/nginx/sites-available/magnific.he3x.my.id /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 8. Setup SSL (HTTPS)

```bash
# Install Certbot (jika belum)
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d magnific.he3x.my.id

# Follow prompts, pilih redirect HTTP to HTTPS
```

### 9. Verify Deployment

```bash
# Test health endpoint
curl https://magnific.he3x.my.id/api/health

# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

## ✅ Verification Checklist

- [ ] PM2 status shows "online"
- [ ] Socket file exists: `/tmp/magnific-kling.sock`
- [ ] Nginx test passes: `sudo nginx -t`
- [ ] SSL certificate installed
- [ ] Health check returns OK: `curl https://magnific.he3x.my.id/api/health`
- [ ] Website accessible: https://magnific.he3x.my.id

## 🔧 Common Commands

```bash
# PM2 Management
pm2 status                    # Check status
pm2 logs magnific-kling       # View logs
pm2 restart magnific-kling    # Restart app
pm2 reload magnific-kling     # Zero-downtime reload

# Nginx Management
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl restart nginx  # Restart Nginx

# Check Logs
pm2 logs magnific-kling                    # PM2 logs
tail -f logs/out.log                       # App output
tail -f logs/err.log                       # App errors
sudo tail -f /var/log/nginx/magnific.error.log  # Nginx errors
```

## 🐛 Quick Troubleshooting

### 502 Bad Gateway

```bash
# Check PM2 running
pm2 status

# Check socket exists
ls -la /tmp/magnific-kling.sock

# Restart both
pm2 restart magnific-kling
sudo systemctl reload nginx
```

### Socket Permission Denied

```bash
# Check permissions
ls -la /tmp/magnific-kling.sock

# Should be: srw-rw-rw-
# If not, restart PM2:
pm2 restart magnific-kling
```

### PM2 Not Starting

```bash
# Check logs
pm2 logs magnific-kling

# Delete and restart
pm2 delete magnific-kling
pm2 start ecosystem.config.js
pm2 save
```

### Upload Fails (413 Request Entity Too Large)

```bash
# Check Nginx config has:
# client_max_body_size 100M;

# Reload Nginx
sudo systemctl reload nginx
```

## 🔄 Update Aplikasi

```bash
cd /var/www/magnific-kling

# Backup (optional)
cp -r . ../magnific-kling-backup

# Upload new files via SCP

# Install dependencies (if package.json changed)
npm install

# Restart
pm2 restart magnific-kling

# Verify
pm2 logs magnific-kling
curl https://magnific.he3x.my.id/api/health
```

## 📊 Monitoring

```bash
# Real-time monitoring
pm2 monit

# System resources
htop

# Disk space
df -h

# Check running processes
ps aux | grep node
```

## 🎯 Performance Tips

1. **Enable Nginx Caching** (optional)
2. **Setup Cloudflare** untuk CDN dan DDoS protection
3. **Monitor dengan PM2 Plus** (optional): https://pm2.io
4. **Setup log rotation** untuk prevent disk full

## 📞 Need Help?

Jika ada masalah:
1. Check PM2 logs: `pm2 logs magnific-kling`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/magnific.error.log`
3. Check socket: `ls -la /tmp/magnific-kling.sock`
4. Restart everything: `pm2 restart magnific-kling && sudo systemctl reload nginx`

---

**Deployment Complete! 🎉**

Access your app at: **https://magnific.he3x.my.id**