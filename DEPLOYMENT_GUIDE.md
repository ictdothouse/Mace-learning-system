# 🚀 PANDUAN DEPLOY KE HOSTINGER - eLearning Atlet SUKMA

## ⚠️ SEBELUM MULAI: TINDAKAN KESELAMATAN WAJIB

### 1. REVOKE CREDENTIALS LAMA (KRITIKAL!)

Credentials berikut telah terdedah dan PERLU ditukar segera:

#### MongoDB Atlas:
- ❌ Username lama: `your_old_mongodb_user`
- ❌ Password lama: `your_old_mongodb_password`

**Tindakan:**
1. Login ke https://cloud.mongodb.com/
2. Database Access → Delete user lama
3. Create new user dengan password kuat
4. Copy connection string baru

#### Cloudflare R2:
- ❌ Account ID: `your_old_account_id`
- ❌ Access Key: `your_old_access_key`
- ❌ Secret Key: `your_old_secret_key`

**Tindakan:**
1. Login ke https://dash.cloudflare.com/
2. R2 Storage → API Tokens
3. Revoke semua token lama
4. Create new API token

---

## 📋 CARA DEPLOY (3 PILIHAN)

### PILIHAN A: Node.js App di Hostinger (RECOMMENDED)

#### Langkah 1: Setup Node.js di Hostinger
1. Login ke **hPanel** Hostinger
2. Website → Auto Installer
3. Pilih **Node.js**
4. Configure:
   ```
   Domain: yourdomain.com
   Node.js Version: 20.x
   Application Path: /public_html
   Startup File: app.js
   Port: 3000 (atau auto-detect)
   ```

#### Langkah 2: Upload Files
```bash
# Di local machine
npm install --production

# Upload via FTP/SFTP ke Hostinger
# JANGAN upload: .env, node_modules, uploads/
```

Files yang perlu upload:
- ✅ `app.js`
- ✅ `routes/`
- ✅ `models/`
- ✅ `utils/`
- ✅ `views/`
- ✅ `data/`
- ✅ `package.json`
- ✅ `package-lock.json`

#### Langkah 3: Setup Environment Variables
Di hPanel → Node.js Selector → Environment Variables:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `MONGO_URI` | `mongodb+srv://USER:PASS@cluster...` |
| `SESSION_SECRET` | (generate random 32+ chars) |
| `ADMIN_USER` | `admin_msn_2026` (atau custom) |
| `ADMIN_PASS` | (password kuat) |
| `R2_ACCOUNT_ID` | (dari Cloudflare) |
| `R2_ENDPOINT` | (dari Cloudflare) |
| `R2_ACCESS_KEY_ID` | (dari Cloudflare) |
| `R2_SECRET_ACCESS_KEY` | (dari Cloudflare) |
| `R2_BUCKET_NAME` | `modulmace` |
| `NODE_ENV` | `production` |

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Langkah 4: Install Dependencies di Server
```bash
cd /home/username/domains/yourdomain.com/public_html
npm install --production
```

#### Langkah 5: Start Application
- Di hPanel → Node.js Selector → Click **Start** atau **Restart**
- Test: https://yourdomain.com

---

### PILIHAN B: Docker Deployment

#### Langkah 1: Build Docker Image
```bash
docker build -t sukma-elearning .
```

#### Langkah 2: Run Container
```bash
docker run -d \
  -p 3000:3000 \
  --name sukma-app \
  --env-file .env \
  sukma-elearning
```

#### Langkah 3: Deploy ke Hostinger VPS
Jika guna Hostinger VPS:
```bash
# Upload docker image
docker save sukma-elearning | gzip | ssh user@your-vps-ip "gunzip | docker load"

# Run di VPS
ssh user@your-vps-ip
docker run -d -p 3000:3000 --restart always --env-file .env sukma-elearning
```

---

### PILIHAN C: GitHub + CI/CD (Advanced)

#### Langkah 1: Clean Git History
```bash
# Hapus .env dari git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin main --force
```

#### Langkah 2: Setup GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install --production
      
      - name: Deploy via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          exclude: |
            **/.env*
            **/node_modules/**
            **/.git/**
```

---

## 🔧 POST-DEPLOYMENT CHECKLIST

### Testing
- [ ] Homepage loads: https://yourdomain.com
- [ ] User registration works
- [ ] Login works
- [ ] Quiz submission works
- [ ] Certificate download works
- [ ] Admin panel accessible: https://yourdomain.com/admin-mace
- [ ] Video streaming works (R2 signed URLs)

### Security
- [ ] HTTPS enabled (Let's Encrypt di hPanel)
- [ ] Rate limiting active (test brute force protection)
- [ ] Helmet headers present (check with browser dev tools)
- [ ] .env NOT accessible via web
- [ ] MongoDB IP whitelist configured

### Monitoring
- [ ] Setup uptime monitoring (UptimeRobot / Pingdom)
- [ ] Enable error logging
- [ ] Setup database backups

---

## 🆘 TROUBLESHOOTING

### Error: "Cannot find module"
```bash
# Di server
npm install --production
```

### Error: "MongoDB connection failed"
- Check connection string di environment variables
- Verify IP whitelist di MongoDB Atlas
- Test connection locally dulu

### Error: "Port already in use"
- Change PORT di environment variables
- Or kill existing process: `lsof -ti:3000 | xargs kill`

### Video tidak load
- Check R2 credentials
- Verify bucket permissions (public read atau signed URLs)
- Check CORS settings di Cloudflare

---

## 📞 SUPPORT RESOURCES

- MongoDB Atlas: https://support.mongodb.com/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Hostinger Support: https://www.hostinger.com/contact
- Node.js Docs: https://nodejs.org/en/docs/

---

**Last Updated:** June 2026  
**Version:** 1.0
