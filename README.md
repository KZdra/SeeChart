# SeeChart — Live Stage Sheet & Chord Viewer 🎵🎸🎹

Aplikasi web interaktif Single-Page (SPA) berbasis **HTML5**, **CSS3**, dan **Vanilla JavaScript murni** (tanpa framework eksternal). Dirancang khusus sebagai sistem contekan chord dan lirik lagu saat latihan band atau tampil live di atas panggung (stage mode).

---

## 🌟 Fitur Utama

### 1. Input & Auto-Parser Chord (Format Chordtela / Ultimate Guitar)
- **Modal Input / Paste Teks**: Mendukung copy-paste langsung teks chord mentah dari situs Chordtela, Ultimate Guitar, atau format teks standar.
- **Smart Line Classifier**: Mendeteksi otomatis:
  - Baris Chord vs Baris Lirik
  - Bagian Lagu (*Section Headers*): `[Intro]`, `[Verse]`, `[Chorus]`, `[Reff]`, `[Bridge]`, `[Solo]`, `[Outro]`, dll.
  - Tablatur Gitar (e.g. `e|---0---|`)
  - Komentar/petunjuk tempo/capo
- **Presisi Monospace & Alignment**: Menjaga perataan spasi antara baris chord dan lirik di bawahnya tetap sejajar 100% tanpa distorsi.
- **Auto-Clean Ads**: Tombol otomatis untuk membersihkan teks iklan, tautan, dan teks pengganggu khas situs web chord.

### 2. Stage Mode & Kontras Tinggi (High Contrast Dark Mode)
- **Desain Khusus Panggung**: Latar belakang hitam pekat (`#0a0b10`) dengan teks lirik putih tajam dan chord berwarna menyala dengan efek glow kontras tinggi (mudah dibaca dari jarak 1-2 meter dalam kondisi panggung remang-remang).
- **Preset Warna Chord Panggung**:
  - 🟡 *Stage Amber (Emas)*
  - 🔵 *Electric Cyan (Biru)*
  - 🟢 *Neon Lime (Hijau)*
  - 🌸 *Cyber Pink (Magenta)*
  - ⚪ *High Contrast White*
- **Kontrol Ukuran Font Real-Time**: Penyesuaian ukuran font dinamis (14px - 42px) melalui tombol antarmuka atau keyboard.
- **Stage Clean Mode (`[H]`)**: Sembunyikan seluruh tombol navigasi dan panel samping untuk fokus total ke teks chord dan lirik. Disertai floating HUD minimalis.
- **Stage Fullscreen Mode (`[F]`)**: Maksimalkan layar penuh tanpa bilah peramban.

### 3. Fitur Transpose Chord Real-Time
- **Transpose Naik (+1) / Turun (-1)**: Mengubah seluruh chord lagu secara instan per semitone.
- **Preservasi Spasi & Kolom**: Saat chord bertambah panjang (misal: `C` menjadi `C#`), sistem otomatis menyesuaikan spasi berikutnya agar kata lirik di bawahnya tetap sinkron.
- **Dukungan Slash Chords**: Mengubah nada dasar sekaligus nada bass secara akurat (contoh: `C/E` menjadi `C#/F` atau `Db/F`).
- **Mode Kres (#) & Mol (b)**: Fleksibilitas memilih preferensi notasi kres atau mol.
- **Reset ke Nada Asal**: Kembalikan ke kunci asli lagu dengan 1 klik.

### 4. Auto-Scroll Mode Bebas Hambatan
- **Smooth Animation Loop**: Menggunakan `requestAnimationFrame` untuk pergerakan scroll halus tanpa tersendat-sendat (*anti-stuttering*).
- **Pengatur Kecepatan**: Multiplier kecepatan dari `0.5x` hingga `5.0x` dengan indikator visual dan tombol pintas.
- **Indikator Progres**: Bilah progres di bagian atas layar menunjukkan posisi lagu dari awal hingga akhir.
- **Play / Pause Instan**: Cukup tekan tombol `Spasi` pada laptop.

### 5. Manajemen Multi-Setlist Custom & Urutan Lagu
- **Pembuat Setlist Khusus**: Buat beberapa setlist berbeda sesuai kebutuhan acara panggung (misal: *"Wedding Gig Akustik"*, *"Festival Rock 60 Menit"*, *"Kafe Reguler"*).
- **Pemilihan Lagu Fleksibel**: Centang lagu-lagu dari pustaka yang ingin dimasukkan ke dalam setlist aktif.
- **Reorder Lagu (Panah ▲ / ▼)**: Geser urutan urutan tampil lagu secara instan di sidebar panggung.
- **Penyimpanan Lokal (LocalStorage)**: Semua setlist dan urutan lagu tersimpan otomatis secara permanen.
- **Ekspor & Impor JSON**: Cadangkan atau bagikan setlist antarmusisi.
- **Lagu Bawaan Lengkap**:
  1. *Dewa 19 — Kangen*
  2. *Sheila on 7 — Dan*
  3. *Andra and The Backbone — Sempurna*
  4. *Eagles — Hotel California*

### 6. Mode 2 Kolom (Split-Screen Widescreen) (`[C]`)
- **Tampilan 2 Kolom Berdampingan**: Membagi baris chord dan lirik menjadi 2 kolom vertikal berdampingan saat menggunakan monitor/laptop layar lebar (widescreen).
- **Bebas Scroll Vertikal**: Seluruh lagu dapat langsung terbaca dari atas ke bawah tanpa perlu melakukan scroll ke bawah.

### 7. Diagram Fretboard Gitar 6-Senar & Visualizer Piano
- **Dual Instrument Support**: Tab switcher instan antara **Piano** dan **Gitar**.
- **Diagram Fretboard Interaktif**: Menampilkan posisi jari (fret & senar), string open (O), string mute/dead (X), serta nomor fret acuan.
- **Algoritma Barre Chord Otomatis**: Mendukung seluruh jenis chord standar dan otomatis menghitung bentuk chord palang (*Barre chord shape*) untuk nada-nada kres/mol atau hasil transpose.

### 8. Catatan Panggung Khusus Lagu (Stage Cue Notes)
- **Kotak Catatan Khusus**: Tulis petunjuk aransemen penting untuk setiap lagu, seperti: *"Intro 4 bar drum only"*, *"Kunci masuk vokal: G"*, *"Solo gitar setelah Reff 2"*, atau *"Outro fade-out perlahan"*.
- **Edit & Simpan Cepat**: Klik tombol pensil untuk mengedit langsung di layar panggung, tersimpan otomatis per lagu di LocalStorage.

### 9. Stage Countdown Timer & Stopwatch (`[W]`)
- **Pencegah Overtime**: Memantau jatah waktu manggung agar band tidak melewati batas waktu panggung yang ditentukan panitia (*rundown*).
- **Preset Instan**: Tombol cepat 15m, 30m, 45m, dan 60 menit.
- **Indikator Bahaya Visual**:
  - Hijau: Waktu aman
  - Kuning: Sisa waktu 5 menit
  - Merah Berkedip (*Pulsing Glow*): Sisa waktu kurang dari 2 menit / waktu habis (overtime).
- **Stopwatch Mode**: Menghitung maju durasi tampil sejak nada pertama dimainkan.
- **Stage Metronome**: Ketukan tempo visual & audio (menggunakan Web Audio API) lengkap dengan fitur *Tap Tempo*.
- **Mode Cetak / PDF**: Tampilan cetak hitam-putih bersih untuk lembar fisik cadangan.

### 10. Desain Responsif & UX Khusus Panggung (Mobile, Tablet & Stand Holder)
- **Screen Wake Lock API (Anti-Sleep)**: Fitur esensial bagi musisi di panggung agar layar smartphone/tablet tidak padam atau redup di tengah-tengah lagu. Dilengkapi indikator lampu hijau panggung.
- **Mobile Stage Controller Dock**: Bilah kontrol khusus di bagian bawah layar smartphone dengan tombol sentuh berukuran besar (mudah dijangkau ibu jari saat ponsel terpasang di mic stand holder):
  - Tombol cepat buka Setlist
  - Navigasi lagu (*Prev / Next*)
  - Tombol utama Play / Pause auto-scroll yang menonjol
  - Quick Transpose (*b / Key / #*)
- **Gesture Sentuh (Touch Swipe & Double-Tap)**:
  - *Swipe Kiri*: Pindah ke lagu berikutnya dalam setlist layaknya membalik lembar partitur.
  - *Swipe Kanan*: Pindah ke lagu sebelumnya.
  - *Double-Tap di Lembar*: Play / Pause auto-scroll instan tanpa harus mencari tombol.
- **Auto-Responsive 2-Column Mode**: Mode 2 kolom otomatis beralih rapi menjadi 1 kolom pada layar di bawah 850px agar spasi monospace chord tetap presisi dan tidak terdistorsi.
- **Large Touch Targets**: Area sentuh tombol dan chord diperbesar (minimal 44-48px) dengan `touch-action: manipulation` untuk respon sentuh instan tanpa jeda 300ms dari browser mobile.

---

## ⌨️ Daftar Tombol Pintas Keyboard (Stage Keybindings)

Musisi di atas panggung dapat mengendalikan seluruh aplikasi langsung melalui keyboard laptop:

| Tombol Keyboard | Fungsi |
| :--- | :--- |
| <kbd>Spasi</kbd> | **Play / Pause Auto-Scroll** |
| <kbd>&darr;</kbd> atau <kbd>PageDown</kbd> | **Scroll Turun Halus** (per section) |
| <kbd>&uarr;</kbd> atau <kbd>PageUp</kbd> | **Scroll Naik Halus** |
| <kbd>+</kbd> / <kbd>=</kbd> | **Perbesar Ukuran Font** |
| <kbd>-</kbd> | **Perkecil Ukuran Font** |
| <kbd>]</kbd> atau <kbd>&gt;</kbd> | **Transpose Nada Naik (+1 Semitone)** |
| <kbd>[</kbd> atau <kbd>&lt;</kbd> | **Transpose Nada Turun (-1 Semitone)** |
| <kbd>0</kbd> | **Reset Nada ke Kunci Asli** |
| <kbd>T</kbd> | **Buka / Fokus Kontrol Transpose** |
| <kbd>&larr;</kbd> &amp; <kbd>&rarr;</kbd> | **Perlambat / Percepat Auto-Scroll** |
| <kbd>C</kbd> | **Toggle Mode 2 Kolom (Split-Screen)** |
| <kbd>W</kbd> | **Buka / Atur Timer Panggung (Countdown / Stopwatch)** |
| <kbd>H</kbd> | **Stage Clean Mode (Sembunyikan/Tampilkan Panel)** |
| <kbd>F</kbd> | **Layar Penuh (Fullscreen)** |
| <kbd>S</kbd> | **Buka / Tutup Daftar Setlist** |
| <kbd>M</kbd> | **Buka / Tutup Metronom Panggung** |
| <kbd>N</kbd> | **Input / Tempel Lagu Baru** |
| <kbd>?</kbd> | **Panduan Tombol Pintas Panggung** |
| <kbd>Esc</kbd> | **Tutup Jendela / Keluar Clean Mode** |

---

## 🚀 Cara Menjalankan

### Opsi 1: Aplikasi Desktop (Electron — Fullscreen Panggung Otomatis)
Aplikasi telah dibungkus ke dalam **Electron Desktop Application**. Saat dijalankan, aplikasi akan langsung membuka dalam mode **Fullscreen Penuh** dengan sistem pencegah layar mati bawaan (*Native Power Save Blocker*):
```bash
# Jalankan aplikasi desktop
npm start
```

### Opsi 2: Browser Web / Live Preview
Aplikasi ini tetap 100% kompatibel sebagai web browser SPA:
- Buka file [`index.html`](file:///h:/projekk/SeeChart/index.html) langsung di peramban web modern, ATAU
- Gunakan ekstensi **Live Preview / Live Server** pada editor kode Anda.


