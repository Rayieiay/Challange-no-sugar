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

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const logsRef = collection(db, "daily_logs");

// --- 2. GLOBAL STATE ---
let currentCheckIn = { sugar: null, if: null, sport: null };
let myChart = null;

// --- 3. LOGIC APLIKASI ---
window.app = {
    switchTab: (tabName) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabName + '-view').classList.add('active');
        
        const btns = document.querySelectorAll('.tab-btn');
        if(tabName === 'checkin') btns[0].classList.add('active');
        else btns[1].classList.add('active');
    },

    setStatus: (type, isSuccess) => {
        currentCheckIn[type] = isSuccess;
        const grp = document.getElementById(`grp-${type}`);
        const btns = grp.querySelectorAll('button');
        const inputNote = document.getElementById(`note-${type}`);

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
    }
};

// --- 4. EVENT LISTENER SUBMIT ---
document.getElementById('btnSubmit').addEventListener('click', async () => {
    const user = document.getElementById('userSelect').value;
    const date = document.getElementById('dateInput').value;

    if (currentCheckIn.sugar === null || currentCheckIn.if === null || currentCheckIn.sport === null) {
        alert("Harap isi status Berhasil/Gagal untuk semua kategori!"); return;
    }
    if (!date) { alert("Pilih tanggal dulu!"); return; }

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

    const btn = document.getElementById('btnSubmit');
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    btn.disabled = true;

    try {
        await addDoc(logsRef, {
            date: date,
            user: user,
            sugar: currentCheckIn.sugar,
            if: currentCheckIn.if,
            sport: currentCheckIn.sport,
            notes: notes.join(', '),
            timestamp: new Date()
        });

        alert("Berhasil lapor! Data tersimpan di cloud.");
        window.app.resetForm();
        window.app.switchTab('progress');
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Gagal menyimpan: " + e.message);
    } finally {
        btn.innerHTML = 'Simpan Laporan';
        btn.disabled = false;
    }
});

// --- 5. EVENT DELEGATION UNTUK LOG TABLE ---
document.querySelector('#logTable tbody').addEventListener('click', (e) => {
    const row = e.target.closest('.log-row');
    if (!row) return;

    const next = row.nextElementSibling;
    if (next && next.classList.contains('detail-row')) {
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

// --- 6. RENDER EMPTY STATE ---
function renderEmptyState(tbody) {
    tbody.innerHTML = `
        <tr class="empty-state-row">
            <td colspan="6">
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">Belum ada data</div>
                    <div class="empty-state-hint">Mulai dengan mengisi laporan harian di tab Check-in</div>
                </div>
            </td>
        </tr>
    `;
}

// --- 7. BACA DATA REALTIME & RENDER ---
const q = query(logsRef, orderBy("date", "desc"));

onSnapshot(q, (snapshot) => {
    const logs = [];
    const tbody = document.querySelector('#logTable tbody');
    tbody.innerHTML = '';

    if (snapshot.empty) {
        renderEmptyState(tbody);
        updateChart([]);
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();

        let score = 0;
        if (data.sugar) score++;
        if (data.if) score++;
        if (data.sport) score++;

        const enriched = { ...data, score };
        logs.push(enriched);

        const shortNotes = data.notes && data.notes.length > 40
            ? data.notes.substring(0, 37) + '...'
            : (data.notes || '');

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
            <td><span class="status-indicator ${data.sugar ? 'success-indicator' : 'fail-indicator'}">${data.sugar ? '✓' : '✕'}</span></td>
            <td><span class="status-indicator ${data.if ? 'success-indicator' : 'fail-indicator'}">${data.if ? '✓' : '✕'}</span></td>
            <td><span class="status-indicator ${data.sport ? 'success-indicator' : 'fail-indicator'}">${data.sport ? '✓' : '✕'}</span></td>
            <td>
                <div class="ket-main">
                    ${data.notes ? '📝' : '-'}
                    ${shortNotes ? `<span style="font-size:10px; color:#8b949e;">${shortNotes}</span>` : ''}
                </div>
                <div class="ket-sub">Skor: ${score} / 3</div>
            </td>
        `;

        tbody.appendChild(row);
    });

    updateChart(logs);
}, (error) => {
    console.error("Firebase connection error:", error);
    alert("Koneksi ke database gagal. Pastikan Anda terhubung ke internet.");
});

// --- 8. LOGIKA GRAFIK CHART.JS ---
function updateChart(logs) {
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let chartData = {
        Roy: [],
        Abeen: []
    };

    sortedLogs.forEach(log => {
        if (log.user === 'Roy') {
            chartData.Roy.push({ x: log.date, y: log.score, sugar: log.sugar, if: log.if, sport: log.sport });
        } else if (log.user === 'Abeen') {
            chartData.Abeen.push({ x: log.date, y: log.score, sugar: log.sugar, if: log.if, sport: log.sport });
        }
    });

    const ctx = document.getElementById('performanceChart').getContext('2d');

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Roy',
                    data: chartData.Roy,
                    borderColor: '#58a6ff',
                    backgroundColor: 'rgba(88, 166, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#58a6ff',
                    pointBorderColor: '#0d1117',
                    pointBorderWidth: 2
                },
                {
                    label: 'Abeen',
                    data: chartData.Abeen,
                    borderColor: '#f78166',
                    backgroundColor: 'rgba(247, 129, 102, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#f78166',
                    pointBorderColor: '#0d1117',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e6edf3',
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' },
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(22, 27, 34, 0.95)',
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                    displayColors: true,
                    callbacks: {
                        title: (items) => {
                            const date = new Date(items[0].raw.x);
                            return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                        },
                        label: (context) => {
                            const d = context.raw;
                            return [
                                `${context.dataset.label}: ${d.y}/3 poin`,
                                `  Sugar: ${d.sugar ? '✓' : '✕'} | IF: ${d.if ? '✓' : '✕'} | Olahraga: ${d.sport ? '✓' : '✕'}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 3,
                    ticks: { 
                        stepSize: 1,
                        color: '#8b949e',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    },
                    grid: {
                        color: 'rgba(48, 54, 61, 0.5)',
                        drawBorder: false
                    }
                },
                x: {
                    type: 'category',
                    labels: [...new Set(sortedLogs.map(l => l.date))],
                    ticks: {
                        color: '#8b949e',
                        font: { family: 'Plus Jakarta Sans', size: 10 },
                        maxRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

document.getElementById('dateInput').valueAsDate = new Date();