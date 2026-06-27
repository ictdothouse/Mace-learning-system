// data/courseData.js
const courseData = [
    {
        id: 1,
        wpId: 2177,
        title: "Jom kuasai asas dulu sebelum jadi pro!",
        // Kandungan diambil terus dari Description CSV Lesson ID 2177
        content: `
            <figure class="wp-block-video"><video controls src="https://incandescent-gnome-4695da.netlify.app/video%2Fvideos%2F1pengenalan.mp4"></video></figure>
            <p>Jom kuasai asas dulu sebelum jadi pro!<br>Topik pembelajaran ini mengenai Peraturan Asas. Tonton topik ini dan uji kefahaman anda melalui Kuiz!</p>
        `,
        quiz: [
            { q: "Apa yang tidak boleh dibuat semasa acara atau aktiviti sukan?", opts: ["Minum air", "Minum alkohol", "Pakai kasut sukan", "Berjalan"], ans: 1 },
            { q: "Produk apa yang dilarang dalam acara sukan KBS?", opts: ["Air dan makanan", "Pakaian Sukan", "Vape", "Buku dan pen"], ans: 2 },
            { q: "Siapa yang tidak boleh terlibat dengan rokok dan alkohol ketika acara sukan?", opts: ["Semua orang dan semua organisasi", "Atlet sahaja", "Penonton sahaja", "Guru dan pegawai sahaja"], ans: 0 }
        ]
    },
    {
        id: 2,
        wpId: 2179,
        title: "Kenali kesalahan, elak jadi pelaku!",
        content: `
            <figure class="wp-block-video"><video controls src="https://incredible-naiad-9d9322.netlify.app/video%2Fvideos%2F2salahlaku.mp4"></video></figure>
            <p>Jenis-Jenis Salah Laku: Kenali kesalahan, elak jadi pelaku!<br>Tonton topik ini dan uji kefahaman anda melalui Kuiz!</p>
        `,
        quiz: [
            { q: "Apa yang BUKAN salah laku dalam sukan?", opts: ["Gangguan seksual", "Buli", "Jual makanan sihat", "Antun seksual"], ans: 2 },
            { q: "Gangguan seksual adalah...", opts: ["Berjabat tangan", "Beri hadiah", "Tepuk tangan", "Tingkah laku seksual yang tak diingini, sama ada kata-kata atau sentuhan"], ans: 3 },
            { q: "Apa maksud antun seksual?", opts: ["Sentuhan atau kata-kata seksual tanpa izin", "Beri salam", "Bantu naik basikal", "Ajar main bola"], ans: 0 },
            { q: "'Grooming' dalam gangguan seksual bermaksud...", opts: ["Sikat rambut", "Pakai baju cantik", "Pujuk dan jadi kawan baik untuk tipu mangsa", "Pilih kasut sukan"], ans: 2 },
            { q: "Gangguan psikologi bermaksud...", opts: ["Menangis bila kalah", "Tingkah laku tak baik yang sakitkan hati atau fikiran seseorang", "Bermain dengan kuat", "Lari pantas"], ans: 1 },
            { q: "Gangguan fizikal bermaksud...", opts: ["Tulis di buku", "Minum air", "Sentuhan yang boleh sebabkan kecederaan", "Berbual dengan rakan"], ans: 2 },
            { q: "Buli bermaksud...", opts: ["Tingkah laku yang sakitkan hati, takuti atau sakiti orang lain", "Berkongsi makanan", "Bantu kawan", "Main bersama"], ans: 0 }
        ]
    },
    {
        id: 3,
        wpId: 2181,
        title: "Ambil tindakan yang betul, laporkan tanpa ragu!",
        content: `
            <figure class="wp-block-video"><video controls src="https://joyful-frangipane-23b620.netlify.app/video%2Fvideos%2F3Laporan.mp4"></video></figure>
            <p>Ambil tindakan yang betul, laporkan tanpa ragu!<br>Tonton topik ini dan uji kefahaman anda melalui Kuiz!</p>
        `,
        quiz: [
            { q: "Budaya buli perlu…", opts: ["Diteruskan", "Dihentikan", "Disokong", "Diabaikan"], ans: 1 },
            { q: "Kalau diganggu, apa yang perlu buat dulu?", opts: ["Laporkan", "Abaikan", "Balas balik", "Sembunyikan"], ans: 0 },
            { q: "Kalau dalam situasi tidak selesa, apa yang perlu kita cakap?", opts: ["“Tunggu dulu”", "“Tak apa”", "“Esok jom”", "“Tidak!” dan lapor"], ans: 3 },
            { q: "Apa yang perlu ditulis kalau diganggu?", opts: ["Warna baju", "Menu makanan", "Masa, tempat, dan orang yang lihat kejadian", "Lagu kegemaran"], ans: 2 },
            { q: "Di mana boleh kita lapor kalau diganggu?", opts: ["Media sosial", "Taman permainan", "Guru dan Pegawai KBS", "Kedai runcit"], ans: 2 }
        ]
    }
];

module.exports = courseData;