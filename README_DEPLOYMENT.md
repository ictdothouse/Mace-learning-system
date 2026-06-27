# 🚀 DEPLOYMENT KE HOSTINGER - PANDUAN MUDAH

## ✅ SEMUA SUDAH DISEDIAKAN!

Saya sudah edit semua fail untuk keselamatan dan deployment. Anda hanya perlu ikut langkah mudah di bawah.

---

## 📋 APA YANG SUDAH SAYA BUAT?

| Fail | Status | Keterangan |
|------|--------|------------|
| `.env` | ✅ Updated | Template kosong dengan panduan lengkap |
| `.gitignore` | ✅ Updated | Lindungi `.env` dari GitHub |
| `app.js` | ✅ Updated | +Security (Helmet.js + Rate Limiting) |
| `DEPLOY_HOSTINGER.md` | ✅ Created | Panduan step-by-step mudah |
| `.env.example` | ✅ Created | Contoh untuk rujukan |

---

## 🎯 5 LANGKAH MUDAH UNTUK DEPLOY

### 1️⃣ PUSH CODE KE GITHUB

Di komputer anda, buka terminal/command prompt:

```bash
cd folder_project_anda
git init
git add .
git commit -m "Ready for Hostinger deployment"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
git push -u origin main
```

**Nota:** Fail `.env` TIDAK akan di-upload (sudah dilindungi).

---

### 2️⃣ LOGIN KE HOSTINGER

1. Pergi ke https://www.hostinger.com.my/
2. Login ke akaun anda
3. Pilih hosting plan yang ada **Node.js support**

---

### 3️⃣ UPLOAD CODE KE HOSTINGER

**Cara Paling Mudah - Guna Git:**

1. Di Hostinger hPanel, pergi ke **Advanced** → **Git**
2. Click **Create Git Repository**
3. Masukkan URL GitHub: `https://github.com/USERNAME_ANDA/NAMA_REPO.git`
4. Branch: `main`
5. Click **Clone**

**Atau Cara Manual:**

1. Pergi ke **Files** → **File Manager**
2. Navigate ke `public_html` atau folder domain anda
3. Upload semua file (kecuali `node_modules`)
4. Extract jika upload sebagai ZIP

---

### 4️⃣ SETUP DI HOSTINGER

#### A. Install Dependencies

1. Di hPanel, pergi ke **Advanced** → **Node.js**
2. Pilih domain/folder project
3. Click **Install Dependencies**

#### B. Buat File .env (PALING PENTING!)

File `.env` mesti ada di server Hostinger:

1. Di File Manager, navigate ke folder project
2. Create new file bernama `.env`
3. Copy & paste template ini:

```env
PORT=3000

# MongoDB Atlas - MASUKKAN CREDENTIALS ANDA
MONGO_URI=mongodb+srv://USER_ANDA:PASSWORD_ANDA@cluster0.xxxxx.mongodb.net/sukma_db?retryWrites=true&w=majority

# Session Secret - Generate random string
# SSH ke server dan run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=db6ab87a6960912de981ca948076853d7f20c6fc126dd394f180c260f669ba33

# Admin Credentials - TUKAR PASSWORD INI!
ADMIN_USER=admin_msn_2026
ADMIN_PASS=PasswordKuatAnda123!

# Cloudflare R2 (jika guna)
R2_ACCOUNT_ID=account_id_anda
R2_ENDPOINT=https://account_id_anda.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=access_key_anda
R2_SECRET_ACCESS_KEY=secret_key_anda
R2_BUCKET_NAME=modulmace

NODE_ENV=production
```

4. **TUKAR** semua values dengan credentials anda!

#### C. Setup Node.js App

1. Di hPanel → Node.js:
   - **Application root**: `/home/username/public_html`
   - **Application startup file**: `app.js`
   - **Application port**: `3000`
2. Click **Save**
3. Click **Restart**

---

### 5️⃣ TEST WEBSITE

1. Buka browser: `https://domain-anda.com`
2. Test admin: `https://domain-anda.com/admin-mace`
3. Login dengan credentials yang anda set

---

## 🔧 JIKA ADA MASALAH

### Error: MongoDB Connection Failed
```
✅ Pastikan connection string betul dalam .env
✅ Di MongoDB Atlas: Network Access → Add IP → 0.0.0.0/0
```

### Error: Module not found
```
✅ Run: npm install --production di server
```

### Website tak load
```
✅ Check logs di hPanel → Node.js → Logs
✅ Restart application di hPanel
✅ Pastikan port 3000 tidak digunakan app lain
```

---

## 📞 NAK BANTUAN LEBIH LANJUT?

Baca panduan lengkap:
- 📄 `DEPLOY_HOSTINGER.md` - Panduan terperinci
- 📄 `SECURITY_AUDIT.md` - Laporan keselamatan

---

## ✅ CHECKLIST SEBELUM GO LIVE

- [ ] Code sudah push ke GitHub
- [ ] Code sudah clone/upload ke Hostinger
- [ ] `npm install` sudah dijalankan
- [ ] File `.env` sudah dibuat di server
- [ ] MongoDB connection string sudah ditukar
- [ ] SESSION_SECRET sudah ditukar (random string)
- [ ] Admin password sudah ditukar
- [ ] Node.js app sudah started di hPanel
- [ ] Website boleh diakses
- [ ] Admin login berfungsi

---

## 🎉 SELAMAT MENDEPLOY!

Kalau ada masalah, check log files atau contact Hostinger support.
