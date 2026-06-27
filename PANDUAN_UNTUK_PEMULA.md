# 🚀 PANDUAN DEPLOY KE HOSTINGER - UNTUK PEMULA

## ✅ SEMUA SUDAH SIAP! Anda hanya perlu ikut langkah-langkah ini.

---

## 📋 APA YANG SUDAH SAYA BUAT UNTUK ANDA:

1. ✅ **Fail `.env`** - Sudah ada template, anda cuma perlu isi credentials
2. ✅ **`.gitignore`** - Sudah protect fail sensitif dari GitHub
3. ✅ **Security** - Helmet.js & Rate Limiting sudah ditambah
4. ✅ **Panduan** - Fail ini step-by-step untuk pemula

---

## 🔧 LANGKAH 1: SETUP GITHUB (5 MINIT)

### Jika belum ada GitHub account:
1. Pergi ke https://github.com/
2. Sign up (percuma)
3. Confirm email

### Upload code ke GitHub:

Buka terminal/command prompt di folder project anda, then taip:

```bash
# Initialize git
git init

# Add semua files
git add .

# Commit pertama
git commit -m "First commit - my athlete module"

# Set branch name
git branch -M main

# Create new repo di GitHub.com, then copy URL dia
# Contoh: https://github.com/yourname/athlete-module.git

# Connect ke GitHub
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git

# Upload ke GitHub
git push -u origin main
```

**⚠️ PENTING**: Fail `.env` TIDAK akan upload ke GitHub (sudah selamat!)

---

## 🌐 LANGKAH 2: LOGIN KE HOSTINGER

1. Pergi ke https://www.hostinger.com/
2. Login dengan akaun anda
3. Kalau tak ada akaun, beli hosting plan yang ada **Node.js support**

---

## 📤 LANGKAH 3: UPLOAD CODE KE HOSTINGER

### CARA MUDAH: Guna Git Auto-Deploy

1. Login Hostinger → hPanel
2. Pergi ke **Advanced** → **Git**
3. Click **Create Git Repository**
4. Masukkan URL GitHub anda: `https://github.com/USERNAME/NAMA_REPO.git`
5. Branch: pilih `main`
6. Directory: biarkan default atau pilih folder domain anda
7. Click **Clone**

✅ Done! Code anda sudah ada di Hostinger.

---

## ⚙️ LANGKAH 4: SETUP DI HOSTINGER

### 4.1 Install Dependencies

1. Di hPanel, pergi ke **Advanced** → **Node.js**
2. Pilih domain/folder project anda
3. Click **Install Dependencies** 
   
   ATAU
   
   Buka **Terminal** di hPanel, taip:
   ```bash
   cd /home/username/public_html
   npm install --production
   ```

### 4.2 Buat File .env (PALING PENTING!)

File `.env` mesti ada di server untuk app boleh jalan:

1. Di hPanel, pergi ke **Files** → **File Manager**
2. Navigate ke folder project anda (biasanya `public_html`)
3. Click **+ New File** (icon plus)
4. Nama file: `.env`
5. Right-click file `.env` → **Edit**
6. Copy & paste content bawah dan **GANTIKAN DENGAN CREDENTIALS ANDA**:

```env
PORT=3000

# MongoDB Atlas - MASUKKAN CONNECTION STRING ANDA
# Kalau tak ada MongoDB lagi:
# 1. Pergi https://cloud.mongodb.com/
# 2. Sign up (percuma)
# 3. Create cluster
# 4. Create database user
# 5. Copy connection string, replace <password> dengan password user
MONGO_URI=mongodb+srv://USER_ANDA:PASSWORD_ANDA@cluster0.xxxxx.mongodb.net/sukma_db?retryWrites=true&w=majority

# Session Secret - Generate random string
# Cara mudah: buka https://generate-secret.vercel.app/32
# Copy result paste kat bawah
SESSION_SECRET=paste_random_string_panjang_di_sini_contoh_abc123xyz789

# Admin Credentials - TUKAR PASSWORD DEFAULT INI!
ADMIN_USER=admin_msn_2026
ADMIN_PASS=PasswordKuatAnda123!

# Cloudflare R2 (OPTIONAL - kalau tak guna, biarkan kosong)
R2_ACCOUNT_ID=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=modulmace

NODE_ENV=production
```

7. Click **Save Changes**

### 4.3 Setup Node.js App

1. Di hPanel → **Advanced** → **Node.js**
2. Fill in:
   - **Application root**: `/home/username/public_html` (atau folder project anda)
   - **Application startup file**: `app.js`
   - **Application port**: `3000`
   - **Node.js version**: Pilih versi terbaru (18.x atau 20.x)
3. Click **Save**
4. Click **Restart** (icon refresh)

---

## 🧪 LANGKAH 5: TEST WEBSITE

1. Buka browser
2. Pergi ke: `https://domain-anda.com`
3. Test admin panel: `https://domain-anda.com/admin-mace`
4. Login dengan:
   - Username: `admin_msn_2026`
   - Password: (yang anda set dalam `.env`)

✅ Jika login berjaya, SELAMAT! Website anda sudah live!

---

## 🔧 TROUBLESHOOTING (MASALAH LAZIM)

### ❌ Error: "MongoDB Connection Failed"

**Sebab**: MongoDB tak connect

**Penyelesaian**:
1. Login ke https://cloud.mongodb.com/
2. Pergi ke **Network Access**
3. Click **Add IP Address**
4. Pilih **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Click **Confirm**
6. Tunggu 5 minit, then restart app di Hostinger

### ❌ Error: "Module not found"

**Sebab**: Dependencies tak install

**Penyelesaian**:
```bash
cd /home/username/public_html
npm install
```

### ❌ Website tak load / Blank page

**Penyelesaian**:
1. Di hPanel → **Advanced** → **Node.js**
2. Check status app (harus running)
3. Click **Logs** untuk tengok error
4. Restart application

### ❌ Port 3000 already in use

**Penyelesaian**:
1. Di `.env`, tukar PORT kepada nombor lain (contoh: `3001`)
2. Di Node.js settings di hPanel, tukar port sama dengan `.env`
3. Restart app

---

## 📚 DAPATKAN MONGODB CONNECTION STRING

Kalau tak ada MongoDB lagi, ikut langkah ini:

1. **Sign Up**: https://cloud.mongodb.com/ (percuma)
2. **Create Cluster**: Click "Build a Database" → pilih FREE tier
3. **Create User**: 
   - Database Access → Add New Database User
   - Username: `sukma_admin`
   - Password: (generate strong password)
   - Save password ni!
4. **Whitelist IP**: 
   - Network Access → Add IP Address
   - Pilih "Allow Access from Anywhere" (`0.0.0.0/0`)
5. **Get Connection String**:
   - Database → Connect → Drivers
   - Copy connection string
   - Replace `<password>` dengan password user tadi
   - Contoh: `mongodb+srv://sukma_admin:MyPass123@cluster0.abc123.mongodb.net/sukma_db?retryWrites=true&w=majority`

---

## ✅ CHECKLIST SEBELUM GO LIVE

Tanda bila dah buat:

- [ ] Code sudah upload ke GitHub
- [ ] GitHub connected ke Hostinger Git
- [ ] `npm install` sudah dijalankan
- [ ] File `.env` created di server
- [ ] MongoDB connection string updated dalam `.env`
- [ ] SESSION_SECRET ditukar (random string panjang)
- [ ] Admin password ditukar dari default
- [ ] Node.js app started di hPanel (status: Running)
- [ ] Website boleh diakses: `https://domain-anda.com`
- [ ] Admin login berfungsi

---

## 🎉 TAHNIAH!

Website athlete module anda sudah live di Hostinger!

**Next steps**:
1. Upload data atlet pertama anda
2. Customize modul mengikut keperluan
3. Share link dengan atlet

---

## 📞 NAK BANTUAN LEBIH LANJUT?

Kalau masih ada masalah, check fail-fail ini:
- `DEPLOY_HOSTINGER.md` - Panduan ringkas
- `DEPLOYMENT_GUIDE.md` - Panduan lengkap semua kaedah
- `SECURITY_AUDIT.md` - Laporan keselamatan

**SELAMAT MENDEPLOY!** 🚀
