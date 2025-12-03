// --- 1. CONFIG FIREBASE (GANTI INI DENGAN CONFIG ANDA) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjRgaXbCAiGO-sr3KBuZJPsX0cfB0qLBY",
    authDomain: "challenge-no-sugar.firebaseapp.com",
    projectId: "challenge-no-sugar",
    storageBucket: "challenge-no-sugar.firebasestorage.app",
    messagingSenderId: "606918704920",
    appId: "1:606918704920:web:2cf2890e854d42b7dd686d",
    measurementId: "G-STFEFJQPVM"
};

// Inisialisasi Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const logsRef = collection(db, "daily_logs");

// --- 2. GLOBAL STATE ---
let currentCheckIn = { sugar: null, if: null, sport: null };
let myChart = null; // Variable untuk Chart instance

// --- 3. LOGIC APLIKASI ---
window.app = {
    // Fungsi Ganti Tab
    switchTab: (tabName) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabName + '-view').classList.add('active');
        
        // Highlight tombol tab
        const btns = document.querySelectorAll('.tab-btn');
        if(tabName === 'checkin') btns[0].classList.add('active');
        else btns[1].classList.add('active');
    },

    // Fungsi Pilih Status (Berhasil/Gagal)
    setStatus: (type, isSuccess) => {
        currentCheckIn[type] = isSuccess;
        const grp = document.getElementById(`grp-${type}`);
        const btns = grp.querySelectorAll('button');
        const inputNote = document.getElementById(`note-${type}`);

        // Reset class
        btns[0].className = 'toggle-btn';
        btns[1].className = 'toggle-btn';

        if (isSuccess) {
            btns[0].classList.add('success');
            inputNote.classList.add('hidden');
            inputNote.value = '';
        } else {
            btns[1].classList.add('fail');
            inputNote.classList.remove('hidden');
        }
    },

    // Reset form setelah submit sukses
    resetForm: () => {
        currentCheckIn = { sugar: null, if: null, sport: null };

        ['sugar', 'if', 'sport'].forEach(type => {
            const grp = document.getElementById(`grp-${type}`);
            const btns = grp.querySelectorAll('button');
            const inputNote = document.getElementById(`note-${type}`);

            btns[0].className = 'toggle-btn';
            btns[1].className = 'toggle-btn';

            inputNote.value = '';
            inputNote.classList.add('hidden');
        });

        // Tanggal tetap di hari yang sama, hanya alasan & status yang direset
    }
};

// --- 4. EVENT LISTENER SUBMIT ---
document.getElementById('btnSubmit').addEventListener('click', async () => {
    const user = document.getElementById('userSelect').value;
    const date = document.getElementById('dateInput').value;

    // Validasi Input Kosong
    if (currentCheckIn.sugar === null || currentCheckIn.if === null || currentCheckIn.sport === null) {
        alert("Harap isi status Berhasil/Gagal untuk semua kategori!"); return;
    }
    if (!date) { alert("Pilih tanggal dulu!"); return; }

    // Validasi Alasan
    let notes = [];
    if (!currentCheckIn.sugar && !document.getElementById('note-sugar').value) {
        alert("Alasan gagal Sugar wajib diisi!"); return;
    }
    if (!currentCheckIn.sugar) notes.push(`Sugar: ${document.getElementById('note-sugar').value}`);

    if (!currentCheckIn.if && !document.getElementById('note-if').value) {
        alert("Alasan gagal IF wajib diisi!"); return;
    }
    if (!currentCheckIn.if) notes.push(`IF: ${document.getElementById('note-if').value}`);

    if (!currentCheckIn.sport && !document.getElementById('note-sport').value) {
        alert("Alasan gagal Olahraga wajib diisi!"); return;
    }
    if (!currentCheckIn.sport) notes.push(`Sport: ${document.getElementById('note-sport').value}`);

    // Loading State
    const btn = document.getElementById('btnSubmit');
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    try {
        // SIMPAN KE FIREBASE
        await addDoc(logsRef, {
            date: date,
            user: user,
            sugar: currentCheckIn.sugar,
            if: currentCheckIn.if,
            sport: currentCheckIn.sport,
            notes: notes.join(', '),
            timestamp: new Date() // untuk sorting teknis
        });

        alert("Berhasil lapor! Data tersimpan di cloud.");
        window.app.resetForm();
        window.app.switchTab('progress'); // otomatis pindah ke tab Grafik & Log
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Gagal menyimpan: " + e.message);
        btn.innerText = "Simpan Laporan";
        btn.disabled = false;
    }
});

// --- 5. BACA DATA REALTIME & RENDER ---
const q = query(logsRef, orderBy("date", "desc")); // Urutkan tanggal terbaru

onSnapshot(q, (snapshot) => {
    const logs = [];
    const tbody = document.querySelector('#logTable tbody');
    tbody.innerHTML = '';

    snapshot.forEach((doc) => {
        const data = doc.data();

        // Hitung skor harian (0-3)
        let score = 0;
        if (data.sugar) score++;
        if (data.if) score++;
        if (data.sport) score++;

        const enriched = { ...data, score };
        logs.push(enriched);

        // Potong notes untuk tampilan singkat di tabel
        const shortNotes = data.notes && data.notes.length > 40
            ? data.notes.substring(0, 37) + '...'
            : (data.notes || '');

        // Render Tabel Log (baris utama)
        const row = document.createElement('tr');
        row.className = 'log-row';
        row.dataset.notes = data.notes || '';
        row.dataset.score = String(score);
        row.dataset.sugar = data.sugar ? '1' : '0';
        row.dataset.if = data.if ? '1' : '0';
        row.dataset.sport = data.sport ? '1' : '0';

        row.innerHTML = `
            <td>${data.date.substring(5)}</td>
            <td><strong>${data.user}</strong></td>
            <td>${data.sugar ? '<span class="dot dot-green"></span>' : '<span class="dot dot-red"></span>'}</td>
            <td>${data.if ? '<span class="dot dot-green"></span>' : '<span class="dot dot-red"></span>'}</td>
            <td>${data.sport ? '<span class="dot dot-green"></span>' : '<span class="dot dot-red"></span>'}</td>
            <td>
                <div class="ket-main">
                    ${data.notes ? '📝' : '-'}
                    ${shortNotes ? `<span style="font-size:10px; color:#888;">${shortNotes}</span>` : ''}
                </div>
                <div class="ket-sub">Skor: ${score} / 3</div>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Pasang event click untuk show/hide detail alasan di bawah baris
    document.querySelectorAll('.log-row').forEach(row => {
        row.addEventListener('click', () => {
            const next = row.nextElementSibling;
            if (next && next.classList.contains('detail-row')) {
                // Jika sudah ada detail row, toggle (hapus)
                next.remove();
                return;
            }

            const notes = row.dataset.notes;
            const score = row.dataset.score;
            const sugar = row.dataset.sugar === '1';
            const ifVal = row.dataset.if === '1';
            const sport = row.dataset.sport === '1';

            const detail = document.createElement('tr');
            detail.className = 'detail-row';
            detail.innerHTML = `
                <td colspan="6">
                    <div><strong>Ringkasan Hari Ini:</strong> Skor ${score} / 3</div>
                    <div style="margin:4px 0 2px;">
                        Sugar: ${sugar ? '✅' : '❌'} &nbsp;|&nbsp;
                        IF: ${ifVal ? '✅' : '❌'} &nbsp;|&nbsp;
                        Olahraga: ${sport ? '✅' : '❌'}
                    </div>
                    <div>
                        <strong>Alasan:</strong>
                        <span>${notes || '-'}</span>
                    </div>
                </td>
            `;

            row.parentNode.insertBefore(detail, row.nextSibling);
        });
    });

    updateChart(logs);
});

// --- 6. LOGIKA GRAFIK CHART.JS ---
function updateChart(logs) {
    // Kita perlu mengubah format data agar bisa dibaca Chart.js
    // Format: Group by Date -> Calculate Score per User
    
    // Sort logs dari lama ke baru untuk grafik (kiri ke kanan)
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Siapkan struktur data
    let chartData = {
        Roy: [],
        Abeen: []
    };

    sortedLogs.forEach(log => {
        // Hitung Skor (Max 3 poin per hari)
        let score = 0;
        if (log.sugar) score++;
        if (log.if) score++;
        if (log.sport) score++;

        if (log.user === 'Roy') {
            chartData.Roy.push({ x: log.date, y: score });
        } else if (log.user === 'Abeen') {
            chartData.Abeen.push({ x: log.date, y: score });
        }
    });

    const ctx = document.getElementById('performanceChart').getContext('2d');

    if (myChart) myChart.destroy(); // Hapus chart lama jika ada update

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Roy',
                    data: chartData.Roy,
                    borderColor: '#4a90e2', // Biru
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Abeen',
                    data: chartData.Abeen,
                    borderColor: '#e84393', // Pink
                    backgroundColor: 'rgba(232, 67, 147, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 3, // Skor maksimal 3
                    ticks: { stepSize: 1 }
                },
                x: {
                    type: 'category', // Sumbu X berupa tanggal
                    labels: [...new Set(sortedLogs.map(l => l.date))] // Ambil tanggal unik
                }
            }
        }
    });
}

// Set default tanggal hari ini
document.getElementById('dateInput').valueAsDate = new Date();