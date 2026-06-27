# 🚀 PANDUAN MUDAH DEPLOY KE HOSTINGER

## ✅ SEMUA SUDAH SIAP! Anda hanya perlu ikut 5 langkah mudah ini.

---

## LANGKAH 1: SETUP GITHUB (Jika belum ada)

```bash
# Di terminal komputer anda:
git init
git add .
git commit -m "Initial commit - ready for Hostinger"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
git push -u origin main
```

⚠️ **PENTING**: Fail `.env` TIDAK akan di-upload ke GitHub (sudah dilindungi).

---

## LANGKAH 2: LOGIN KE HOSTINGER

1. Pergi ke https://www.hostinger.com/
2. Login ke akaun anda
3. Pilih hosting yang ada Node.js support

---

## LANGKAH 3: UPLOAD CODE KE HOSTINGER

### Cara A: Gunakan Git (Recommended)

Di Hostinger hPanel:
1. Pergi ke **Advanced** → **Git**
2. Click **Create Git Repository**
3. Masukkan URL GitHub anda: `https://github.com/USERNAME/NAMA_REPO.git`
4. Branch: `main`
5. Click **Clone**

### Cara B: Upload Manual (File Manager)

1. Pergi ke **Files** → **File Manager**
2. Navigate ke folder `public_html` atau folder domain anda
3. Upload semua file project (KECUALI `node_modules` dan `.env`)
4. Atau upload ZIP file, kemudian extract

---

## LANGKAH 4: SETUP DI HOSTINGER

### 4.1 Install Dependencies

Di Hostinger hPanel:
1. Pergi ke **Advanced** → **Node.js**
2. Pilih domain/folder project anda
3. Click **Install Dependencies** atau run command:
   ```bash
   npm install --production
   ```

### 4.2 Buat File .env DI SERVER

Ini PALING PENTING! File `.env` mesti ada di server Hostinger:

1. Di File Manager Hostinger, navigate ke folder project
2. Create new file bernama `.env`
3. Copy & paste content ini dan **GANTIKAN DENGAN CREDENTIALS ANDA**:

```env
PORT=3000

# MongoDB Atlas - MASUKKAN CONNECTION STRING ANDA
MONGO_URI=mongodb+srv://USER_ANDA:PASSWORD_ANDA@cluster0.xxxxx.mongodb.net/sukma_db?retryWrites=true&w=majority

# Session Secret - Generate random string (run di server):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=paste_random_string_panjang_di_sini

# Admin Credentials - TUKAR PASSWORD!
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

### 4.3 Setup Node.js App

Di Hostinger hPanel → Node.js:
1. **Application root**: `/home/username/public_html` (atau folder project anda)
2. **Application startup file**: `app.js`
3. **Application port**: `3000`
4. Click **Save** kemudian **Restart**

---

## LANGKAH 5: TEST WEBSITE

1. Buka browser, pergi ke: `https://domain-anda.com`
2. Test admin panel: `https://domain-anda.com/admin-mace`
3. Login dengan credentials yang anda set dalam `.env`

---

## 🔧 TROUBLESHOOTING

### Error: "MongoDB Connection Failed"
- Semak connection string dalam `.env` betul
- Pastikan IP address Hostinger dibenarkan di MongoDB Atlas:
  1. Login MongoDB Atlas
  2. Network Access → Add IP Address
  3. Add `0.0.0.0/0` (allow from anywhere) atau IP khusus Hostinger

### Error: "Module not found"
- Run `npm install` di server Hostinger
- Pastikan semua dependencies ada dalam `package.json`

### Website tak load
- Check logs di Hostinger: **Advanced** → **Node.js** → **Logs**
- Pastikan port 3000 tidak digunakan oleh aplikasi lain
- Restart Node.js application di hPanel

---

## 📞 NAK LEBIH BANTUAN?

Dokumentasi penuh ada dalam fail ini:
- `SECURITY_AUDIT.md` - Laporan keselamatan
- `DEPLOYMENT_GUIDE.md` - Panduan detail semua kaedah deploy

---

## ✅ CHECKLIST SEBELUM GO LIVE

- [ ] `.env` file created di server dengan credentials BETUL
- [ ] MongoDB connection string updated
- [ ] SESSION_SECRET ditukar (random string panjang)
- [ ] Admin password ditukar dari default
- [ ] `npm install` sudah dijalankan
- [ ] Node.js app started di hPanel
- [ ] Website boleh diakses via browser
- [ ] Admin login berfungsi

**SELAMAT MENDEPLOY!** 🎉
