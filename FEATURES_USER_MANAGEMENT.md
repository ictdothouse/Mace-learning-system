# DOKUMENTASI SISTEM PENGURUSAN PENGGUNA & E-LEARNING

## 📋 Ringkasan Features Baru

Sistem telah dikemaskini dengan ciri-ciri berikut:

### 1. **Sistem Peranan Pengguna (Role-Based Access Control)**
   - **Admin**: Akses penuh kepada semua features
   - **Teacher/Instruktor**: Boleh create/edit modul, lesson, kuiz, group pelajar
   - **Student/Pelajar**: Hanya akses modul yang diberikan

### 2. **Pengurusan Teacher (Oleh Admin)**
   - ✅ Daftar teacher baru (dengan email & password)
   - ✅ Edit maklumat teacher
   - ✅ Reset password teacher
   - ✅ Delete akaun teacher
   - ✅ Lihat senarai semua teacher

### 3. **Pengurusan Student/Pelajar (Oleh Admin)**
   - ✅ Tetapkan group kepada pelajar
   - ✅ Edit maklumat pelajar
   - ✅ Reset password pelajar
   - ✅ **DELETE akaun pelajar** (masalah sebelumnya telah diselesaikan)
   - ✅ Lihat enrollment history

### 4. **Sistem Group E-Learning (Standard Practice)**
   - ✅ Cipta group dengan nama & deskripsi
   - ✅ **Enrollment Key** unik untuk setiap group (auto-generated atau custom)
   - ✅ Teacher ditugaskan kepada group tertentu
   - ✅ Pelajar boleh join sendiri menggunakan enrollment key
   - ✅ Admin/Teacher boleh add/remove pelajar dari group
   - ✅ Set maksimum bilangan pelajar (optional)

### 5. **Module Access Control**
   - ✅ Modul boleh di-set "restricted" kepada group tertentu
   - ✅ Jika tidak restricted = semua pelajar boleh akses
   - ✅ Jika restricted = hanya group yang ditetapkan boleh akses
   - ✅ Teacher boleh assign modul kepada group yang diuruskan

---

## 🗂️ Struktur Database Baru

### Model: User (`models/User.js`)
```javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  role: 'admin' | 'teacher' | 'student',
  athleteId: ObjectId (ref: Athlete, untuk student sahaja),
  managedGroups: [ObjectId] (untuk teacher/admin),
  enrolledGroups: [ObjectId] (untuk student),
  isActive: Boolean,
  lastLogin: Date
}
```

### Model: Group (`models/Group.js`)
```javascript
{
  name: String,
  description: String,
  enrollmentKey: String (unique, auto-generated),
  teacherId: ObjectId (ref: User),
  createdBy: ObjectId (ref: User),
  modules: [ObjectId] (ref: Module),
  students: [ObjectId] (ref: User),
  isActive: Boolean,
  maxStudents: Number (0 = unlimited),
  startDate: Date,
  endDate: Date
}
```

### Model: Module (Updated)
```javascript
{
  title: String,
  description: String,
  accessibleByGroups: [ObjectId] (ref: Group),
  isRestricted: Boolean (default: false)
}
```

---

## 🔐 Routes Baru

### Authentication Routes (`/auth`)
```
GET  /auth/login                    - Halaman login
POST /auth/login                    - Process login
GET  /auth/logout                   - Logout

// Admin: Teacher Management
GET  /auth/admin/teachers           - Senarai teacher
GET  /auth/admin/teachers/new       - Form tambah teacher
POST /auth/admin/teachers/create    - Cipta teacher
GET  /auth/admin/teachers/edit/:id  - Form edit teacher
POST /auth/admin/teachers/update/:id - Update teacher
POST /auth/admin/teachers/delete/:id - Delete teacher
POST /auth/admin/teachers/reset-password/:id - Reset password

// Admin: Student Management
GET  /auth/admin/students           - Senarai student
POST /auth/admin/students/update/:id - Update student & group
POST /auth/admin/students/reset-password/:id - Reset password
POST /auth/admin/students/delete/:id - Delete student (FIXED!)
```

### Teacher Routes (`/teacher`)
```
GET  /teacher/dashboard             - Dashboard teacher
GET  /teacher/groups                - Senarai group
GET  /teacher/groups/new            - Form cipta group
POST /teacher/groups/create         - Cipta group
GET  /teacher/groups/edit/:id       - Form edit group
POST /teacher/groups/update/:id     - Update group
POST /teacher/groups/delete/:id     - Delete group

// Module Assignment
GET  /teacher/groups/:id/modules    - Assign modul ke group
POST /teacher/groups/:id/modules    - Save module assignment

// Student Management in Group
GET  /teacher/groups/:id/students   - Senarai pelajar dalam group
POST /teacher/groups/:id/students/add - Tambah pelajar
POST /teacher/groups/:id/students/remove/:studentId - Remove pelajar

// Enrollment Key
GET  /teacher/join                  - Halaman join group
POST /teacher/join                  - Join dengan enrollment key
```

---

## 🚀 Cara Menggunakan

### 1. **Mendaftarkan Teacher Baru (Admin)**
```
1. Login sebagai admin
2. Pergi ke: /auth/admin/teachers
3. Klik "Tambah Teacher Baru"
4. Isi maklumat: Nama, Email, Password
5. Teacher boleh login di: /auth/login
```

### 2. **Mendaftarkan Student & Tetapkan Group (Admin)**
```
1. Login sebagai admin
2. Pergi ke: /auth/admin/students
3. Pilih student yang ingin diedit
4. Tetapkan group dalam field "enrolledGroups"
5. Untuk delete: Klik butang "Delete" (sebelum ini tidak berfungsi)
```

### 3. **Teacher Mencipta Group**
```
1. Login sebagai teacher
2. Pergi ke: /teacher/dashboard
3. Klik "Cipta Group Baru"
4. Isi nama, deskripsi (optional)
5. Enrollment key akan dijana automatik (contoh: GRP-A1B2C3D4)
6. Kongsi enrollment key dengan pelajar
```

### 4. **Pelajar Join Group Sendiri**
```
1. Pelajar login dengan akaun mereka
2. Pergi ke: /teacher/join
3. Masukkan enrollment key yang diberikan oleh teacher
4. Sistem akan validate dan masukkan pelajar ke group
```

### 5. **Teacher Assign Modul kepada Group**
```
1. Teacher login
2. Pergi ke: /teacher/groups
3. Pilih group yang ingin diedit
4. Klik "Assign Modules"
5. Pilih modul yang ingin diberikan akses
6. Save - hanya pelajar dalam group ini boleh akses modul tersebut
```

---

## 🔧 Migration Guide (Untuk Existing Data)

### Langkah 1: Install Dependencies
```bash
npm install bcryptjs --save
```

### Langkah 2: Update Database Schema
```bash
# Models baru telah ditambah:
- models/User.js
- models/Group.js

# Model existing telah diupdate:
- models/Module.js (tambah fields: accessibleByGroups, isRestricted)
```

### Langkah 3: Create Admin User Pertama (Manual)
```javascript
// Jalankan script ini sekali untuk create admin pertama
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

User.create({
  fullName: 'Admin Utama',
  email: 'admin@domain.com',
  password: 'password123', // Akan di-hash automatik
  role: 'admin',
  isActive: true
}).then(() => {
  console.log('✅ Admin user created!');
  process.exit();
});
```

### Langkah 4: Migrate Existing Athletes ke User System
```javascript
// Script untuk convert existing athletes kepada user accounts
const Athlete = require('./models/Athlete');
const User = require('./models/User');

Athlete.find().then(async (athletes) => {
  for (const athlete of athletes) {
    // Create user account untuk setiap athlete
    await User.create({
      fullName: athlete.fullName,
      email: athlete.icNumber + '@athlete.local', // Generate email dari IC
      password: athlete.icNumber, // Default password = IC number
      role: 'student',
      athleteId: athlete._id,
      isActive: true
    });
  }
  console.log('✅ Migration complete!');
  process.exit();
});
```

---

## 🛡️ Security Features

1. **Password Hashing**: Semua password di-hash menggunakan bcryptjs
2. **Session-based Authentication**: Menggunakan express-session dengan MongoStore
3. **Role-based Middleware**: Setiap route dilindungi mengikut peranan
4. **Email Validation**: Email adalah unique dan case-insensitive
5. **Active/Inactive Status**: Akaun boleh di-deactivate tanpa delete

---

## 📊 Best Practices E-Learning

### Pengurusan Group
- **Saiz Group**: Disarankan 20-30 pelajar per group untuk pengurusan efektif
- **Enrollment Key**: Gunakan format yang mudah (contoh: BOLA2024, SUKMA-JOHOR)
- **Module Access**: 
  - Group-based untuk kursus khusus (contoh: Bola Sepak, Renang)
  - Open access untuk modul umum (contoh: Pemakanan, Kesihatan)

### Workflow Cadangan
1. Admin daftar semua teacher
2. Teacher create group untuk kelas/sukan mereka
3. Admin daftar pelajar dan tetapkan kepada group (atau beri enrollment key)
4. Teacher assign modul kepada group
5. Pelajar login dan hanya nampak modul untuk group mereka

---

## 🐛 Bug Fixes

### Masalah Delete Student (FIXED)
**Sebelum**: Student tidak boleh delete selepas daftar
**Selepas**: Route `/auth/admin/students/delete/:id` telah ditambah dengan:
- Removal dari semua group
- Delete user account
- Optional delete athlete record

### Code:
```javascript
router.post('/admin/students/delete/:id', requireAdmin, async (req, res) => {
  const student = await User.findById(req.params.id);
  
  // Remove from groups
  await Group.updateMany(
    { students: student._id }, 
    { $pull: { students: student._id } }
  );
  
  // Delete user
  await User.findByIdAndDelete(req.params.id);
  
  // Optional: delete athlete record
  if (student.athleteId) {
    await Athlete.findByIdAndDelete(student.athleteId);
  }
  
  res.redirect('/auth/admin/students?msg=student_deleted');
});
```

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check logs: `node server.log`
2. Verify database connection
3. Ensure all models are loaded correctly
4. Test routes dengan Postman atau browser

---

**Last Updated**: June 2024
**Version**: 2.0.0
