# 🔄 Force Sync Local to Server

Panduan lengkap untuk memastikan server selalu sama persis dengan local environment.

## 🎯 **Tujuan**

Memastikan semua file di server **100% identik** dengan file di local, termasuk:
- ✅ Semua file source code
- ✅ Folder `public/` dengan versi terbaru
- ✅ Configuration files
- ✅ Dependencies

## 🚀 **Cara 1: Menggunakan Deployment Script (Recommended)**

### **Windows:**

1. **Edit `deploy.bat`:**
   ```batch
   set SERVER_HOST=your-server-ip
   ```
   Ganti `your-server-ip` dengan IP server Anda

2. **Run script:**
   ```cmd
   deploy.bat
   ```

Script akan otomatis:
- ✅ Commit local changes
- ✅ Push ke git
- ✅ SSH ke server
- ✅ Force reset server ke match git
- ✅ Restart PM2
- ✅ Verify deployment

### **Linux/Mac:**

1. **Edit `deploy.sh`:**
   ```bash
   SERVER_HOST="your-server-ip"
   ```

2. **Make executable:**
   ```bash
   chmod +x deploy.sh
   ```

3. **Run script:**
   ```bash
   ./deploy.sh
   ```

## 🔧 **Cara 2: Manual Commands**

### **Step 1: Commit & Push dari Local**

```bash
# Di local (Windows PowerShell/CMD atau Linux/Mac terminal)

# Add all changes
git add .

# Commit
git commit -m "sync: Force sync local to server"

# Push to git
git push origin master
```

### **Step 2: Force Reset di Server**

```bash
# SSH ke server
ssh gekanet@your-server-ip

# Navigate to project
cd /var/www/magnific-kling

# Fetch latest from git
git fetch origin

# Force reset to match origin/master (CAUTION: This will overwrite all local changes!)
git reset --hard origin/master

# Clean untracked files
git clean -fd

# Verify files
ls -la public/
wc -l public/index.html

# Restart PM2
pm2 restart magnific-kling

# Check logs
pm2 logs magnific-kling --lines 20
```

### **Step 3: Verify**

```bash
# Test dari server
curl https://magnific.he3x.my.id | grep "AI Motion Video Generator"

# Atau buka di browser
# https://magnific.he3x.my.id
```

## ✅ **Verification Checklist**

Setelah force sync, verify bahwa semua file sama:

### **1. Check File Count**

```bash
# Di local
git ls-files | wc -l

# Di server
cd /var/www/magnific-kling
git ls-files | wc -l

# Harus sama!
```

### **2. Check Commit Hash**

```bash
# Di local
git log --oneline -1

# Di server
cd /var/www/magnific-kling
git log --oneline -1

# Harus sama! (e.g., c200bf6 wip)
```

### **3. Check public/ Files**

```bash
# Di server
cd /var/www/magnific-kling
ls -lh public/

# Harus ada:
# -rw-r--r-- 1 user user  18K May 21 06:25 app.js
# -rw-r--r-- 1 user user 5.8K May 21 06:25 index.html
# -rw-r--r-- 1 user user 6.5K May 21 06:25 style.css

# Check line count
wc -l public/index.html
# Harus: 179 public/index.html
```

### **4. Check Website**

```bash
# Test endpoint
curl https://magnific.he3x.my.id | grep "AI Motion Video Generator"

# Harus ada output!
```

## 🐛 **Troubleshooting**

### **Problem: "Already up to date" tapi file berbeda**

```bash
# Di server, force re-checkout
cd /var/www/magnific-kling
git fetch origin
git reset --hard origin/master
git clean -fd
pm2 restart magnific-kling
```

### **Problem: Git push failed (authentication)**

```bash
# Di local, check remote
git remote -v

# Re-configure if needed
git remote set-url origin https://github.com/he3x/magnific.git

# Try push again
git push origin master
```

### **Problem: SSH connection failed**

```bash
# Test SSH connection
ssh gekanet@your-server-ip

# If failed, check:
# 1. Server IP correct?
# 2. SSH key configured?
# 3. Firewall allows SSH (port 22)?
```

### **Problem: PM2 restart failed**

```bash
# Di server
pm2 list

# If app not found:
pm2 start ecosystem.config.js

# If app exists but not responding:
pm2 delete magnific-kling
pm2 start ecosystem.config.js
pm2 save
```

## 📋 **Quick Reference Commands**

### **Force Sync (One-liner)**

```bash
# Local to Git
git add . && git commit -m "sync" && git push origin master

# Server from Git (SSH required)
ssh gekanet@your-server-ip "cd /var/www/magnific-kling && git fetch origin && git reset --hard origin/master && git clean -fd && pm2 restart magnific-kling"
```

### **Verify Sync**

```bash
# Check commit hash matches
echo "Local:" && git log --oneline -1
ssh gekanet@your-server-ip "cd /var/www/magnific-kling && echo 'Server:' && git log --oneline -1"
```

### **Check Differences**

```bash
# Compare local and server
ssh gekanet@your-server-ip "cd /var/www/magnific-kling && git diff HEAD"

# Should show: (no output = identical)
```

## 🎯 **Best Practices**

### **1. Always Commit Before Deploy**

```bash
# Check status
git status

# If changes exist, commit first
git add .
git commit -m "feat: your changes description"
git push origin master
```

### **2. Use Deployment Script**

Lebih aman dan otomatis:
- ✅ Auto-commit
- ✅ Auto-push
- ✅ Auto-deploy
- ✅ Auto-verify

### **3. Test Locally First**

```bash
# Test di local dulu
npm start

# Buka http://localhost:3001
# Pastikan semua works

# Baru deploy ke server
```

### **4. Monitor After Deploy**

```bash
# Check PM2 logs
pm2 logs magnific-kling

# Check Nginx logs
sudo tail -f /var/log/nginx/magnific.error.log

# Monitor resources
pm2 monit
```

## 🔄 **Workflow untuk Update**

### **Development Workflow:**

```
1. Edit files di local
   ↓
2. Test di local (npm start)
   ↓
3. Commit changes (git commit)
   ↓
4. Push to git (git push)
   ↓
5. Deploy to server (deploy.bat atau manual)
   ↓
6. Verify di browser (https://magnific.he3x.my.id)
```

### **Quick Update Workflow:**

```bash
# 1. Make changes locally
# 2. Run deployment script
deploy.bat  # Windows
# atau
./deploy.sh  # Linux/Mac

# Done! Server is now synced
```

## 📝 **Summary**

**Untuk Force Sync Local ke Server:**

1. **Otomatis (Recommended):**
   - Edit `deploy.bat` (Windows) atau `deploy.sh` (Linux/Mac)
   - Set SERVER_HOST
   - Run script

2. **Manual:**
   - Commit & push dari local
   - SSH ke server
   - `git reset --hard origin/master`
   - `pm2 restart magnific-kling`

3. **Verify:**
   - Check commit hash sama
   - Check file count sama
   - Check website works

**Setelah force sync, server akan 100% identik dengan local!** 🎉

---

**Quick Commands:**

```bash
# Windows (PowerShell)
.\deploy.bat

# Linux/Mac
./deploy.sh

# Manual
git add . && git commit -m "sync" && git push && ssh gekanet@server "cd /var/www/magnific-kling && git reset --hard origin/master && pm2 restart magnific-kling"