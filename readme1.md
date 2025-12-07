Berikut adalah akun default yang sudah kita atur di dalam kodingan AuthContext.js:

1. Akun Admin
(Bisa terima pesanan, ubah status masak, dan kelola menu)

Email: admin@cafe.com

Password: admin123

2. Akun Kepala Toko
(Bisa melihat laporan keuangan dan grafik penjualan)

Email: head@cafe.com

Password: head123

⚠️ PENTING:
Link Login: Gunakan halaman khusus staff di http://localhost:3000/staff-login.

Wajib Daftar Manual: Karena kodingan kita tidak menyediakan fitur "Daftar Staff" (demi keamanan), Anda harus membuat akun ini secara manual di Firebase Console:

Buka Firebase Console -> Menu Authentication.

Klik tab Users.

Klik tombol Add user.

Masukkan email & password di atas satu per satu.

Jika belum ditambahkan di Firebase, saat login nanti akan muncul error "User not found".