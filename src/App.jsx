import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Users, Calculator, Printer, Save, Trash2,
  Plus, GraduationCap, Menu, X, LogOut, Shield,
  Loader, RefreshCw, UserPlus, Key, Edit, FileText, Settings, AlertTriangle, Info,
  Search, ChevronLeft, ChevronRight, Filter, AlertCircle, Award, Grid, BarChart2, LayoutDashboard,
  CreditCard, Calendar, Activity, Pencil, File
} from 'lucide-react';

// =================================================================
// KONFIGURASI API (BACKEND)
// =================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzn0ZX8J0GwmQ1BEmkJc5q0wKGW5BI9o20Trx8MFcnsyvE3ezCtTGZh42fQUPHZV8tfA/exec";
const LOGO_URL = "https://freeimghost.com/images/2025/11/21/fococlipping-20220208-133942.th.png";
const KARTU_URL = "https://freeimghost.com/images/2025/11/20/Kabupaten-Bekasi.th.png";
const STEMPEL_URL = "https://freeimghost.com/images/2025/11/26/STEMPEL-KEPSEK.th.png";
const TUTWURI_URL = "https://freeimghost.com/images/2025/11/26/tutwuri.jpeg";

const HEADMASTER_NAME = "NURHAYATI, S.Pd";
const HEADMASTER_NIP = "197809162008012004";

const INITIAL_SUBJECTS = [
  { id: 'pai', name: 'Pendidikan Agama', kkm: 75 },
  { id: 'pkn', name: 'Pendidikan Pancasila', kkm: 75 },
  { id: 'indo', name: 'Bahasa Indonesia', kkm: 70 },
  { id: 'mtk', name: 'Matematika', kkm: 65 },
  { id: 'ipas', name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', kkm: 70 },
  { id: 'sbdp', name: 'Seni Budaya', kkm: 75 },
  { id: 'pjok', name: 'Pendidikan Jasmani dan Olahraga', kkm: 75 },
  { id: 'bing', name: 'Bahasa Inggris', kkm: 70 },
  { id: 'mulok', name: 'Bahasa Sunda', kkm: 75 },
];

const DEFAULT_ADMIN = { id: 'admin', username: 'admin', password: '123', role: 'admin', name: 'Operator Sekolah (OPS)', assignedClass: null };
const ACADEMIC_YEARS = ["2024/2025", "2025/2026", "2026/2027", "2027/2028", "2028/2029", "2030/2031"];

// HELPER: Chunk array into smaller arrays (untuk membagi kartu per halaman isi 6)
const chunkArray = (arr, size) => {
  const chunkedArr = [];
  for (let i = 0; i < arr.length; i += size) {
    chunkedArr.push(arr.slice(i, i + size));
  }
  return chunkedArr;
};

const PaginationControls = ({ currentPage, totalPages, totalData, rowsPerPage, setRowsPerPage, setCurrentPage }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t bg-white print:hidden">
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span>Baris:</span>
      <select className="border rounded p-1" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
        <option value={30}>30</option><option value={60}>60</option><option value={90}>90</option><option value={100}>100</option>
        <option value={9999}>Semua</option>
      </select>
      <span>/ {totalData} Data</span>
    </div>
    <div className="flex items-center gap-2">
      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={20} /></button>
      <span className="text-sm font-medium">Hal {currentPage} / {totalPages || 1}</span>
      <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={20} /></button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  const [rawNilai, setRawNilai] = useState([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [tempGrades, setTempGrades] = useState({});
  const [tempNonAcademic, setTempNonAcademic] = useState({ ekskul: '', predikatEkskul: '', ketEkskul: '', sakit: 0, izin: 0, alpha: 0 });

  const [reportSemester, setReportSemester] = useState('2 (Dua)');
  const [reportYear, setReportYear] = useState('2024/2025');
  const [reportRombelFilter, setReportRombelFilter] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(9999);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRombelFilter, setSelectedRombelFilter] = useState('');

  const [cardRombelFilter, setCardRombelFilter] = useState('');
  const [cardDate, setCardDate] = useState(new Date().toISOString().slice(0, 10));
  const [cardSemester, setCardSemester] = useState('2 (Dua)');

  const [gradingSubTab, setGradingSubTab] = useState('input');
  const [reportSubTab, setReportSubTab] = useState('nilai');

  useEffect(() => { setSearchTerm(''); setCurrentPage(1); setSelectedStudentId(null); }, [activeTab]);
  useEffect(() => { if (activeTab === 'report') setSelectedStudentId(null); }, [reportRombelFilter, activeTab]);
  // Reset halaman saat filter kartu ujian berubah
  useEffect(() => { if (activeTab === 'print_cards') setCurrentPage(1); }, [cardRombelFilter, activeTab]);

  useEffect(() => { if (GOOGLE_SCRIPT_URL && !user) { handleSyncFromGoogleSheet(true); } }, []);

  useEffect(() => {
    if (user?.role === 'guru' && user.assignedClass) {
      const rombels = user.assignedClass.split(',').map(c => c.trim());
      if (rombels.length > 0) {
        setSelectedRombelFilter(rombels[0]);
        setReportRombelFilter(rombels[0]);
        setCardRombelFilter(rombels[0]);
      }
    } else {
      setSelectedRombelFilter('');
      setReportRombelFilter('');
      setCardRombelFilter('');
    }
  }, [user]);

  const teacherStats = useMemo(() => {
    const uniqueUsernames = new Set(teachers.map(t => t.username.trim().toLowerCase()));
    const uniqueRombels = new Set();
    teachers.forEach(t => {
      if (t.assignedClass) {
        const classes = t.assignedClass.split(',').map(c => c.trim());
        classes.forEach(c => { if (c) uniqueRombels.add(c); });
      }
    });
    return { totalGuru: uniqueUsernames.size, totalRombel: uniqueRombels.size, totalAkun: uniqueUsernames.size };
  }, [teachers]);

  const allStudentRombels = useMemo(() => {
    const rombels = students.map(s => s.rombel).filter(Boolean);
    return [...new Set(rombels)].sort();
  }, [students]);

  const getTeacherRombels = useMemo(() => {
    if (user?.role !== 'guru' || !user.assignedClass) return [];
    return user.assignedClass.split(',').map(s => s.trim()).filter(Boolean);
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (loginUsername === DEFAULT_ADMIN.username && loginPassword === DEFAULT_ADMIN.password) {
      setUser(DEFAULT_ADMIN); setActiveTab('admin_dashboard'); return;
    }
    if (teachers.length === 0) { setLoginError('Data Guru KOSONG! Hubungi Admin/OPS.'); return; }
    const matchedTeachers = teachers.filter(t => {
      return String(loginUsername).trim().toLowerCase() === String(t.username).trim().toLowerCase() &&
        String(loginPassword).trim() === String(t.password).trim();
    });
    if (matchedTeachers.length > 0) {
      const uniqueRombels = [...new Set(matchedTeachers.map(t => t.assignedClass))];
      const primaryTeacher = matchedTeachers[0];
      setUser({ ...primaryTeacher, assignedClass: uniqueRombels.join(', '), role: 'guru' });
      setActiveTab('dashboard_rekap');
    } else { setLoginError(`Username atau Password SALAH.`); }
  };

  const handleLogout = () => { setUser(null); setLoginUsername(''); setLoginPassword(''); setActiveTab('dashboard'); };

  const handleSyncFromGoogleSheet = async (silent = false) => {
    if (!GOOGLE_SCRIPT_URL) { if (!silent) alert("URL Script belum diisi!"); return; }
    setIsSyncing(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getData' }) });
      const result = await response.json();
      if (result.status === 'success') {
        setStudents(result.students || []);
        setTeachers(result.teachers || []);
        setRekapData(result.rekap || []);
        setRawNilai(result.rawNilai || []);
        setLastSync(new Date());
        if (!silent) alert(`SINKRONISASI BERHASIL!\nData Guru: ${result.teachers.length}\nData Siswa: ${result.students.length}`);
      } else { if (!silent) alert('Terhubung tapi ada pesan: ' + result.message); }
    } catch (error) { console.error("Sync Error:", error); if (!silent) alert('Gagal mengambil data.'); }
    finally { setIsSyncing(false); }
  };

  const handleSaveGrades = async () => {
    if (!GOOGLE_SCRIPT_URL) return alert("Belum terkoneksi.");
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    setIsSyncing(true);
    try {
      const payload = {
        action: 'saveGrades', nisn: student.nisn, name: student.name, className: student.rombel,
        semester: reportSemester, grades: tempGrades, nonAcademic: tempNonAcademic,
        teacherName: user.name, teacherNip: user.nip
      };
      await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });

      const updatedStudent = {
        ...student,
        grades: tempGrades,
        nonAcademic: tempNonAcademic,
        namaGuru: user.name
      };

      setStudents(students.map(s => s.id === selectedStudentId ? updatedStudent : s));
      handleSyncFromGoogleSheet(true);
      alert('Data berhasil disimpan!');
    } catch (error) { alert('Gagal menyimpan.'); } finally { setIsSyncing(false); }
  };

  const handleEditStudent = async (student) => {
    const newName = prompt("Edit Nama Murid:", student.name);
    if (newName === null) return;
    const newOrtu = prompt("Edit Nama Orang Tua:", student.namaOrtu);
    if (newOrtu === null) return;
    if (newName !== student.name || newOrtu !== student.namaOrtu) {
      setIsSyncing(true);
      try {
        const payload = { action: 'updateStudent', nisn: student.nisn, name: newName, namaOrtu: newOrtu };
        await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const updatedStudents = students.map(s => s.id === student.id ? { ...s, name: newName, namaOrtu: newOrtu } : s);
        setStudents(updatedStudents);
        alert("Data Siswa berhasil diperbarui!");
      } catch (error) { alert("Gagal update data siswa."); } finally { setIsSyncing(false); }
    }
  };

  const handleTPChange = (subjectId, tpKey, value) => {
    setTempGrades(prev => {
      const currentSubject = prev[subjectId] || {};
      const updatedSubject = { ...currentSubject, [tpKey]: parseInt(value) || 0 };
      const tps = [updatedSubject.tp1, updatedSubject.tp2, updatedSubject.tp3, updatedSubject.tp4, updatedSubject.tp5].map(v => v || 0);
      const sum = tps.reduce((a, b) => a + b, 0);
      const filledCount = tps.filter(v => v > 0).length;
      const final = filledCount > 0 ? Math.round(sum / filledCount) : 0;
      updatedSubject.final = final;
      return { ...prev, [subjectId]: updatedSubject };
    });
  };

  const handleDescChange = (subjectId, descKey, value) => {
    setTempGrades(prev => {
      const currentSubject = prev[subjectId] || {};
      const updatedSubject = { ...currentSubject, [descKey]: value };
      return { ...prev, [subjectId]: updatedSubject };
    });
  };

  const calculateRankings = () => {
    const studentsWithAvg = students.map(s => {
      const grades = s.grades || {};
      const scores = Object.values(grades).map(val => {
        if (typeof val === 'object' && val !== null) return Number(val.final) || 0;
        return Number(val) || 0;
      });
      const total = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length > 0 ? (total / INITIAL_SUBJECTS.length) : 0;
      return { ...s, average: parseFloat(avg.toFixed(2)) };
    });
    let targetStudents = studentsWithAvg;
    if (selectedRombelFilter) {
      targetStudents = studentsWithAvg.filter(s => s.rombel && s.rombel.toLowerCase().trim() === selectedRombelFilter.toLowerCase().trim());
    } else if (user?.role === 'guru') {
      const guruClasses = user.assignedClass.toLowerCase().split(',').map(c => c.trim());
      targetStudents = studentsWithAvg.filter(s => s.rombel && guruClasses.includes(s.rombel.toLowerCase().trim()));
    }
    targetStudents.sort((a, b) => b.average - a.average);
    return targetStudents.map((s, i) => ({ ...s, rank: i + 1 }));
  };

  const handleSaveDashboard = async () => {
    if (!GOOGLE_SCRIPT_URL) return alert("Belum terkoneksi.");
    setIsSyncing(true);
    try {
      const rankedData = calculateRankings();
      if (rankedData.length === 0) { alert("Tidak ada data."); setIsSyncing(false); return; }
      const details = rankedData.map(s => ({
        nisn: s.nisn, name: s.name, rombel: s.rombel, semester: reportSemester, avg: s.average, nip: user.nip || '-', guru: user.name
      }));
      const classGroups = {};
      rankedData.forEach(s => {
        const cls = s.rombel || 'Tanpa Kelas';
        if (!classGroups[cls]) classGroups[cls] = { count: 0, sum: 0, max: 0, min: 100 };
        classGroups[cls].count++; classGroups[cls].sum += s.average;
        classGroups[cls].max = Math.max(classGroups[cls].max, s.average);
        classGroups[cls].min = Math.min(classGroups[cls].min, s.average);
      });
      const summary = Object.keys(classGroups).map(cls => ({
        kelas: cls, count: classGroups[cls].count, avgKelas: (classGroups[cls].sum / classGroups[cls].count).toFixed(2),
        max: classGroups[cls].max, min: classGroups[cls].min
      }));
      const payload = { action: 'saveDashboard', details: details, summary: summary };
      await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      alert('Rekap Nilai & Dasbor berhasil disinkronkan!');
    } catch (error) { alert('Gagal menyimpan Dasbor.'); } finally { setIsSyncing(false); }
  };

  // Filtered Students untuk Dropdown Rapor
  const filteredReportStudents = useMemo(() => {
    if (!reportRombelFilter) return [];
    return students.filter(s => s.rombel && s.rombel.toLowerCase().trim() === reportRombelFilter.toLowerCase().trim());
  }, [students, reportRombelFilter]);

  // Filter untuk Kartu Ujian (Menampilkan semua jika filter kosong)
  const filteredCardStudents = useMemo(() => {
    let data = students;
    if (user?.role === 'guru') {
      const guruClasses = getTeacherRombels.map(c => c.toLowerCase());
      data = data.filter(s => s.rombel && guruClasses.includes(s.rombel.toLowerCase().trim()));
    }
    if (cardRombelFilter) {
      data = data.filter(s => s.rombel && s.rombel.trim() === cardRombelFilter);
    }
    // Jika cardRombelFilter kosong, tampilkan semua (untuk admin)
    return data;
  }, [students, user, cardRombelFilter, getTeacherRombels]);

  const filteredStudents = useMemo(() => {
    let data = students;
    if (user?.role === 'guru') {
      const guruClasses = getTeacherRombels.map(c => c.toLowerCase());
      data = data.filter(s => s.rombel && guruClasses.includes(s.rombel.toLowerCase().trim()));
    }
    if (activeTab === 'print_cards') {
      // Do nothing, handled by filteredCardStudents
    } else if (activeTab === 'report') {
      if (reportRombelFilter) {
        data = data.filter(s => s.rombel && s.rombel.toLowerCase().trim() === reportRombelFilter.toLowerCase().trim());
      }
    } else if (selectedRombelFilter) {
      data = data.filter(s => s.rombel && s.rombel.toLowerCase().trim() === selectedRombelFilter.toLowerCase().trim());
    }
    return data;
  }, [students, user, selectedRombelFilter, reportRombelFilter, getTeacherRombels, activeTab]);

  const { paginatedData, totalDataPages } = useMemo(() => {
    let data = [];
    if (activeTab === 'admin_dashboard') data = teachers;
    else if (activeTab === 'dashboard_rekap') data = calculateRankings();
    else data = filteredStudents;

    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    return {
      paginatedData: data.slice(indexOfFirst, indexOfLast),
      totalDataPages: Math.ceil(data.length / rowsPerPage)
    };

    function calculateRankings() {
      const studentsWithAvg = students.map(s => {
        const grades = s.grades || {};
        const scores = Object.values(grades).map(val => {
          if (typeof val === 'object' && val !== null) return Number(val.final) || 0;
          return Number(val) || 0;
        });
        const total = scores.reduce((a, b) => a + b, 0);
        const avg = scores.length > 0 ? (total / INITIAL_SUBJECTS.length) : 0;
        return { ...s, average: parseFloat(avg.toFixed(2)) };
      });
      let target = studentsWithAvg;
      if (selectedRombelFilter) {
        target = target.filter(s => s.rombel && s.rombel.toLowerCase().trim() === selectedRombelFilter.toLowerCase().trim());
      } else if (user?.role === 'guru') {
        const guruClasses = user.assignedClass.toLowerCase().split(',').map(c => c.trim());
        target = target.filter(s => s.rombel && guruClasses.includes(s.rombel.toLowerCase().trim()));
      }
      target.sort((a, b) => b.average - a.average);
      return target.map((s, i) => ({ ...s, rank: i + 1 }));
    }
  }, [activeTab, teachers, filteredStudents, currentPage, rowsPerPage, students, user, selectedRombelFilter]);

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setActiveTab(id); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${activeTab === id ? 'bg-green-700 text-white shadow-inner' : 'text-green-50 hover:bg-green-600'}`}>
      <Icon size={20} /> <span className="font-medium">{label}</span>
    </button>
  );

  const getReportData = () => {
    if (!selectedStudentId) return null;
    const s = students.find(x => x.id === selectedStudentId);
    if (!s) return null;

    const currentGrades = s.grades || {};
    const scores = Object.values(currentGrades).map(g => (typeof g === 'object' && g !== null) ? (g.final || 0) : (Number(g) || 0));
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const avg = scores.length > 0 ? (totalScore / INITIAL_SUBJECTS.length).toFixed(1) : 0;

    const waliKelasName = s.namaGuru || (user?.role === 'guru' ? user.name : '.........................');
    const teacherObj = teachers.find(t => t.name === waliKelasName);
    const waliKelasNIP = teacherObj ? teacherObj.nip : (user?.role === 'guru' && user.name === waliKelasName ? user.nip : '.........................');
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const nonAcademic = s.nonAcademic || {};
    const pd = s.pd || {};

    return { s, currentGrades, avg, waliKelasName, waliKelasNIP, currentDate, nonAcademic, pd };
  };

  const reportData = useMemo(() => getReportData(), [selectedStudentId, students, user, teachers]);
  const [sidebarOpenState, setSidebarOpenState] = useState(true);

  // --- UI RENDER ---
  if (!user) {
    /* LOGIN UI */
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border-t-4 border-green-600">
          <div className="bg-white p-8 text-center border-b border-slate-100">
            <img src={LOGO_URL} alt="Logo" className="w-24 h-auto mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">SINIRA</h1>
            <p className="text-green-700 font-bold text-sm">SDN BABELAN KOTA 02</p>
            <p className="text-slate-500 text-sm font-semibold mt-1">Sistem Nilai Rapor</p>
          </div>
          <div className="p-8 pt-6">
            <h2 className="text-xl font-bold text-slate-800 text-center mb-2">LOGIN</h2>
            <p className="text-sm text-slate-500 text-center mb-6">(Login dengan Akun Masing-masing)</p>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 text-left"><AlertCircle size={24} className="flex-shrink-0" /> <div>{loginError}</div></div>}
              <div className="relative"><UserPlus className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} /></div>
              <div className="relative"><Key className="absolute left-3 top-3 text-slate-400" size={18} /><input type="password" className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition-all active:scale-95">Masuk Aplikasi</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-green-800 text-white transform transition-transform duration-300 ${sidebarOpenState ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 print:hidden flex flex-col shadow-xl`}>
        <div className="p-6 border-b border-green-700 flex items-center gap-3">
          <img src={LOGO_URL} alt="Logo" className="w-10 h-auto bg-white rounded-full p-0.5" />
          <div><h1 className="text-lg font-bold">SINIRA</h1><p className="text-[10px] text-green-200">BABELAN KOTA 02</p></div>
          <button onClick={() => setSidebarOpenState(false)} className="md:hidden ml-auto text-green-100"><X size={24} /></button>
        </div>
        <div className="p-4 bg-green-900/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-lg uppercase">{user.username[0]}</div>
          <div className="overflow-hidden"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-xs text-green-300 truncate capitalize">{user.role}</p></div>
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-bold text-green-300 uppercase tracking-wider">Menu Utama</div>
          <SidebarItem id="dashboard_rekap" icon={Grid} label="Dasbor & Peringkat" />
          {user.role === 'admin' && <><div className="px-4 py-2 text-xs font-bold text-green-300 uppercase tracking-wider mt-2">Menu Admin</div><SidebarItem id="admin_dashboard" icon={Shield} label="Data Guru" /><SidebarItem id="print_cards" icon={CreditCard} label="Cetak Kartu Ujian" /></>}
          <div className="px-4 py-2 text-xs font-bold text-green-300 uppercase tracking-wider mt-2">Menu Akademik</div>
          <SidebarItem id="students" icon={Users} label="Data Siswa" />
          <SidebarItem id="grading" icon={BookOpen} label="Input Nilai" />
          <SidebarItem id="report" icon={Printer} label="Cetak Rapor" />
          <div className="px-4 py-2 text-xs font-bold text-green-300 uppercase tracking-wider mt-4">Database</div>
          <button onClick={() => handleSyncFromGoogleSheet(false)} disabled={isSyncing} className="w-full flex items-center gap-3 px-4 py-3 text-green-100 hover:bg-green-600 transition-colors text-left disabled:opacity-50">
            {isSyncing ? <Loader className="animate-spin" size={20} /> : <RefreshCw size={20} />} <span className="font-medium">{isSyncing ? 'Loading...' : 'SINKRON DATA'}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-green-700"><button onClick={handleLogout} className="flex items-center gap-2 text-red-200 hover:text-white w-full"><LogOut size={18} /> <span>Keluar</span></button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between print:hidden z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpenState(!sidebarOpenState)} className="md:hidden text-slate-600"><Menu size={24} /></button>
            <h2 className="text-xl font-bold text-slate-800">{activeTab === 'students' ? 'Data Siswa' : activeTab === 'grading' ? 'Input Nilai' : activeTab === 'report' ? 'Cetak Rapor' : activeTab === 'print_cards' ? 'Kartu Ujian SAS' : 'Dashboard'}</h2>
          </div>
          <div className="flex items-center gap-4">
            {isSyncing && <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full animate-pulse font-medium">Sedang Sinkronisasi...</span>}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${GOOGLE_SCRIPT_URL ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <div className={`w-2 h-2 rounded-full ${GOOGLE_SCRIPT_URL ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div> {GOOGLE_SCRIPT_URL ? 'Online Mode' : 'Offline'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/50">

          {/* ADMIN: DATA GURU (STATISTIK) */}
          {activeTab === 'admin_dashboard' && user.role === 'admin' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div><div><p className="text-sm text-slate-500">Jumlah Guru</p><h3 className="text-2xl font-bold">{teacherStats.totalGuru}</h3></div></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4"><div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Grid size={24} /></div><div><p className="text-sm text-slate-500">Jumlah Rombel</p><h3 className="text-2xl font-bold">{teacherStats.totalRombel}</h3></div></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4"><div className="p-3 bg-green-100 text-green-600 rounded-lg"><Key size={24} /></div><div><p className="text-sm text-slate-500">Jumlah Akun</p><h3 className="text-2xl font-bold">{teacherStats.totalAkun}</h3></div></div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 flex justify-between items-center">
                <div><h3 className="text-lg font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Data Guru</h3><p className="text-xs text-slate-500">Kelola di Spreadsheet &gt; Data_Guru</p></div>
                <button onClick={() => handleSyncFromGoogleSheet(false)} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm disabled:opacity-50"><RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? "SINKRON" : "SINKRON"}</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex-shrink-0 flex justify-between"><span>Daftar Guru Terdaftar</span></div>
                <div className="overflow-auto flex-1 relative">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm"><tr><th className="p-3 w-10 bg-slate-100">No</th><th className="p-3 bg-slate-100">NIP</th><th className="p-3 bg-slate-100">Nama Guru</th><th className="p-3 bg-slate-100">Rombel</th><th className="p-3 bg-slate-100">Username</th><th className="p-3 bg-slate-100">Password</th></tr></thead>
                    <tbody className="divide-y">{paginatedData.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">Data tidak ditemukan.</td></tr> : paginatedData.map((t, idx) => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-3 text-center text-slate-400">{(currentPage - 1) * rowsPerPage + idx + 1}</td><td className="p-3 font-mono">{t.nip}</td><td className="p-3 font-bold">{t.name}</td><td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{t.assignedClass}</span></td><td className="p-3">{t.username}</td><td className="p-3 font-mono text-slate-500">{t.password}</td></tr>))}</tbody>
                  </table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalDataPages} totalData={paginatedData.length} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
              </div>
            </div>
          )}

          {/* DASBOR REKAP (ADMIN OPS FILTER) */}
          {activeTab === 'dashboard_rekap' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                  <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Award className="text-yellow-500" /> Peringkat Siswa</h3></div>
                  <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"><Printer size={18} /> Cetak Peringkat</button>
                </div>
                <div className="flex gap-4 mb-4">
                  <select className="p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50 outline-none" value={selectedRombelFilter} onChange={e => setSelectedRombelFilter(e.target.value)}>
                    {user.role === 'admin' && <option value="">Semua Kelas</option>}
                    {(user.role === 'guru' ? getTeacherRombels : allStudentRombels).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="text" placeholder="Cari Siswa..." className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[600px] print:h-auto print:border-none print:shadow-none">
                {/* JUDUL CETAK PERINGKAT */}
                <div className="hidden print:block text-center mb-6 mt-4">
                  <h2 className="text-xl font-bold uppercase">Peringkat Nilai Kelas {selectedRombelFilter || user.assignedClass}</h2>
                  <p>SDN BABELAN KOTA 02</p>
                </div>
                <div className="overflow-auto flex-1 relative">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 uppercase text-slate-600 sticky top-0 z-10 shadow-sm print:static"><tr><th className="p-4 w-10 bg-slate-50 text-center border-b print:border">Rank</th><th className="p-4 bg-slate-50 border-b print:border">Nama Siswa</th><th className="p-4 bg-slate-50 border-b print:border">Rombel</th><th className="p-4 bg-slate-50 text-center border-b print:border">Nilai Rata-rata</th><th className="p-4 bg-slate-50 border-b print:border">Status</th></tr></thead>
                    <tbody className="divide-y">
                      {paginatedData.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">Belum ada data.</td></tr> :
                        paginatedData.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-purple-50">
                            <td className="p-4 text-center font-bold text-slate-600 border-b print:border"><span className={`inline-block w-8 h-8 leading-8 rounded-full ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100'} print:bg-white`}>{(currentPage - 1) * rowsPerPage + idx + 1}</span></td>
                            <td className="p-4 font-medium border-b print:border">{s.name}</td><td className="p-4 border-b print:border"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold print:bg-white print:text-black">{s.rombel}</span></td><td className="p-4 text-center font-bold text-lg border-b print:border">{s.average || 0}</td><td className="p-4 border-b print:border">{s.average >= 75 ? <span className="text-green-600 font-bold text-xs">TUNTAS</span> : <span className="text-red-600 font-bold text-xs">BELUM TUNTAS</span>}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {/* Hide Pagination on Print */}
                <div className="print:hidden">
                  <PaginationControls currentPage={currentPage} totalPages={totalDataPages} totalData={paginatedData.length} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: DATA SISWA */}
          {activeTab === 'students' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div><h2 className="text-lg font-bold flex items-center gap-2"><Users className="text-green-600" /> Data Siswa</h2><p className="text-sm text-slate-500">Total: {filteredStudents.length} Siswa</p></div>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
                    <select className="w-full md:w-40 p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50 outline-none" value={selectedRombelFilter} onChange={e => setSelectedRombelFilter(e.target.value)}>
                      {user.role === 'admin' && <option value="">Semua Kelas</option>}
                      {(user.role === 'guru' ? getTeacherRombels : allStudentRombels).map(rombel => <option key={rombel} value={rombel}>{rombel}</option>)}
                    </select>
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="text" placeholder="Cari Nama / Rombel..." className="w-full md:w-64 pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <button onClick={() => handleSyncFromGoogleSheet(false)} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"><RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> SINKRON DATA</button>
                  </div>
                </div>
                {user.role === 'guru' && <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800 flex gap-2 items-start"><Info size={18} className="flex-shrink-0 mt-0.5" /><div><strong>Info Guru:</strong> Login sebagai <u>{user.name}</u>. <br />Menampilkan siswa dengan Rombel: <strong>{user.assignedClass}</strong>.{selectedRombelFilter && <span className="block mt-1 font-bold">Menampilkan hanya: {selectedRombelFilter}</span>}</div></div>}
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[600px]">
                <div className="overflow-auto flex-1 relative">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 uppercase text-slate-600 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 w-10 bg-slate-50">No</th>
                        <th className="p-4 bg-slate-50">NISN</th>
                        <th className="p-4 bg-slate-50">Nama</th>
                        <th className="p-4 bg-slate-50">Rombel</th>
                        <th className="p-4 bg-slate-50">Nama Guru</th>
                        <th className="p-4 bg-slate-50">Nama Ortu</th>
                        <th className="p-4 bg-slate-50">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedData.length === 0 ? <tr><td colSpan="7" className="p-8 text-center text-slate-400">{user.role === 'guru' ? 'Tidak ada siswa di Rombel ini.' : 'Data kosong.'}</td></tr> :
                        paginatedData.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-4 text-center font-bold text-slate-400">{(currentPage - 1) * rowsPerPage + idx + 1}</td><td className="p-4 font-mono text-slate-600">{s.nisn || '-'}</td><td className="p-4 font-medium">{s.name || '-'}</td><td className="p-4"><span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">{s.rombel || '-'}</span></td><td className="p-4">{s.namaGuru || '-'}</td><td className="p-4">{s.namaOrtu || '-'}</td>
                            <td className="p-4"><button onClick={() => handleEditStudent(s)} className="text-blue-600 hover:bg-blue-100 p-2 rounded"><Edit size={16} /></button></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalDataPages} totalData={paginatedData.length} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} setCurrentPage={setCurrentPage} />
              </div>
            </div>
          )}

          {/* TAB: GRADING */}
          {activeTab === 'grading' && (
            <div className="max-w-6xl mx-auto h-full">
              <div className="flex gap-4 mb-6 border-b overflow-x-auto">
                {['input', 'ekskul', 'attendance', 'rekap'].map(tab => (
                  <button key={tab} onClick={() => setGradingSubTab(tab)} className={`px-4 py-2 font-bold border-b-2 whitespace-nowrap ${gradingSubTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{tab === 'input' ? 'Input Nilai (TP)' : tab === 'ekskul' ? 'Kegiatan (Ekskul)' : tab === 'attendance' ? 'Ketidakhadiran' : 'Rekap Nilai'}</button>
                ))}
              </div>
              <div className="flex flex-col lg:flex-row gap-6 h-full">
                {gradingSubTab !== 'rekap' && (
                  <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border p-2 overflow-y-auto h-[600px] flex flex-col">
                    <div className="p-2 mb-2 sticky top-0 bg-white z-10 space-y-2 border-b">
                      {user.role === 'guru' && getTeacherRombels.length > 1 && <select className="w-full p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50" value={selectedRombelFilter} onChange={e => setSelectedRombelFilter(e.target.value)}><option value="">Semua Kelas</option>{getTeacherRombels.map(rombel => <option key={rombel} value={rombel}>📂 {rombel}</option>)}</select>}
                      <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="text" placeholder="Cari Siswa..." className="w-full p-2 pl-9 border rounded text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {filteredStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                        <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setTempGrades(s.grades || {}); setTempNonAcademic(s.nonAcademic || { ekskul: '', predikatEkskul: '', ketEkskul: '', sakit: 0, izin: 0, alpha: 0 }); }} className={`w-full text-left p-3 rounded-lg mb-1 border ${selectedStudentId === s.id ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'hover:bg-slate-50 border-transparent'}`}>
                          <div className="font-bold text-sm">{s.name}</div><div className="text-xs text-slate-500 flex justify-between mt-1"><span>{s.nisn}</span><span className="bg-slate-100 px-1 rounded">{s.rombel}</span></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {gradingSubTab !== 'rekap' ? (
                  <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[600px] overflow-hidden">
                    {selectedStudentId ? (
                      <>
                        <div className="flex justify-between mb-4 items-center border-b pb-4 flex-shrink-0">
                          <div><h2 className="font-bold text-xl text-slate-800">{students.find(s => s.id === selectedStudentId)?.name}</h2><p className="text-xs text-slate-500 mt-1">{students.find(s => s.id === selectedStudentId)?.rombel}</p></div>
                          <button onClick={handleSaveGrades} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2 hover:bg-blue-700 disabled:opacity-50"><Save size={18} /> Simpan</button>
                        </div>
                        <div className="overflow-y-auto flex-1 pr-2">
                          {gradingSubTab === 'input' && INITIAL_SUBJECTS.map(subj => {
                            const subjectData = (tempGrades[subj.id] || {});
                            const finalScore = subjectData.final || 0;
                            const isBelowKKM = finalScore > 0 && finalScore < subj.kkm;
                            const studentName = students.find(s => s.id === selectedStudentId)?.name || "Ananda";

                            return (
                              <div key={subj.id} className={`mb-4 p-4 rounded-lg border transition-all ${isBelowKKM ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-2"><label className={`font-bold ${isBelowKKM ? 'text-red-700' : 'text-slate-700'}`}>{subj.name}</label><span className="text-xs bg-white px-2 py-0.5 rounded border">KKM: {subj.kkm}</span></div>
                                <div className="grid grid-cols-5 gap-2 mb-4">{[1, 2, 3, 4, 5].map(tp => {
                                  const tpVal = subjectData[`tp${tp}`] || 0;
                                  const tpBelow = tpVal > 0 && tpVal < subj.kkm;
                                  return (<div key={tp}><span className="text-[10px] text-slate-500 block text-center">TP {tp}</span><input type="number" className={`w-full p-1 text-center border rounded focus:ring-2 ${tpBelow ? 'bg-red-50 border-red-300 text-red-600' : 'focus:ring-blue-500'}`} value={subjectData[`tp${tp}`] || ''} onChange={e => handleTPChange(subj.id, `tp${tp}`, e.target.value)} /></div>)
                                })}</div>
                                <div className={`text-right text-sm font-bold mb-4 ${isBelowKKM ? 'text-red-800' : 'text-blue-700'}`}>Rata-rata: {finalScore}</div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500">Capaian Kompetensi:</label>
                                  <textarea className="w-full p-2 border rounded text-xs h-16 focus:ring-2 focus:ring-blue-500" placeholder="Deskripsi Capaian Tertinggi..." value={subjectData.desc1 || `Ananda ${studentName} sangat menguasai dalam...`} onChange={e => handleDescChange(subj.id, 'desc1', e.target.value)} />
                                  <textarea className="w-full p-2 border rounded text-xs h-16 focus:ring-2 focus:ring-red-500" placeholder="Deskripsi Capaian Terendah..." value={subjectData.desc2 || `Ananda ${studentName} perlu bimbingan dalam...`} onChange={e => handleDescChange(subj.id, 'desc2', e.target.value)} />
                                </div>
                              </div>
                            )
                          })}
                          {gradingSubTab === 'ekskul' && (<div className="p-4 border rounded-lg bg-slate-50"><h3 className="font-bold mb-4">Kegiatan Ekstrakurikuler</h3><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Jenis Kegiatan</label><select className="w-full p-2 border rounded" value={tempNonAcademic.ekskul} onChange={e => setTempNonAcademic({ ...tempNonAcademic, ekskul: e.target.value })}><option value="">- Pilih -</option><option value="Pramuka">Pramuka</option><option value="Paskibra">Paskibra</option><option value="Karate">Karate</option><option value="Futsal">Futsal</option><option value="Drumband">Drumband</option><option value="Angklung">Angklung</option></select></div><div><label className="block text-sm font-medium mb-1">Predikat</label><select className="w-full p-2 border rounded" value={tempNonAcademic.predikatEkskul} onChange={e => setTempNonAcademic({ ...tempNonAcademic, predikatEkskul: e.target.value })}><option value="">- Pilih -</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div><div><label className="block text-sm font-medium mb-1">Keterangan</label><select className="w-full p-2 border rounded" value={tempNonAcademic.ketEkskul} onChange={e => setTempNonAcademic({ ...tempNonAcademic, ketEkskul: e.target.value })}><option value="">- Pilih -</option><option value="Sangat Baik">Sangat Baik</option><option value="Baik">Baik</option><option value="Cukup">Cukup</option></select></div></div></div>)}
                          {gradingSubTab === 'attendance' && (<div className="p-4 border rounded-lg bg-slate-50"><h3 className="font-bold mb-4">Ketidakhadiran (Jumlah Hari)</h3><div className="grid grid-cols-1 gap-4"><div className="flex justify-between items-center"><label>Sakit</label><input type="number" className="w-20 p-2 border rounded" value={tempNonAcademic.sakit} onChange={e => setTempNonAcademic({ ...tempNonAcademic, sakit: e.target.value })} /></div><div className="flex justify-between items-center"><label>Izin</label><input type="number" className="w-20 p-2 border rounded" value={tempNonAcademic.izin} onChange={e => setTempNonAcademic({ ...tempNonAcademic, izin: e.target.value })} /></div><div className="flex justify-between items-center"><label>Tanpa Keterangan</label><input type="number" className="w-20 p-2 border rounded" value={tempNonAcademic.alpha} onChange={e => setTempNonAcademic({ ...tempNonAcademic, alpha: e.target.value })} /></div></div></div>)}
                        </div>
                      </>
                    ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><BookOpen size={64} className="mb-4 opacity-20" /><p>Pilih siswa untuk input data.</p></div>}
                  </div>
                ) : (
                  <div className="w-full bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex justify-between"><span>Rekap Nilai Detail (Dari Data_Nilai)</span><button onClick={() => handleSyncFromGoogleSheet(false)} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center gap-1"><RefreshCw size={12} /> Refresh</button></div>
                    <div className="overflow-auto flex-1 relative">
                      <table className="w-full text-left text-xs border-collapse"><thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm"><tr><th className="p-2 border">NISN</th><th className="p-2 border">Nama</th><th className="p-2 border">Kelas</th><th className="p-2 border">Mapel</th><th className="p-2 border text-center">Nilai</th><th className="p-2 border">Ekskul</th><th className="p-2 border">Predikat</th><th className="p-2 border">Ket</th><th className="p-2 border text-center">S</th><th className="p-2 border text-center">I</th><th className="p-2 border text-center">A</th><th className="p-2 border w-32">Cap. Komp 1</th><th className="p-2 border w-32">Cap. Komp 2</th></tr></thead>
                        <tbody className="divide-y">{rawNilai.length === 0 ? <tr><td colSpan="13" className="p-8 text-center text-slate-400">Belum ada data nilai detail.</td></tr> : rawNilai.filter(r => user.role === 'admin' || (user.assignedClass && user.assignedClass.includes(r.kelas))).map((r, idx) => (<tr key={idx} className="hover:bg-slate-50"><td className="p-2 border font-mono">{r.nisn}</td><td className="p-2 border">{r.nama}</td><td className="p-2 border">{r.kelas}</td><td className="p-2 border">{r.mapel}</td><td className="p-2 border text-center font-bold">{r.nilai}</td><td className="p-2 border">{r.ekskul}</td><td className="p-2 border">{r.predikatEkskul}</td><td className="p-2 border">{r.ketEkskul}</td><td className="p-2 border text-center">{r.sakit}</td><td className="p-2 border text-center">{r.izin}</td><td className="p-2 border text-center">{r.alpha}</td><td className="p-2 border text-[10px] truncate max-w-xs" title={r.desc1}>{r.desc1}</td><td className="p-2 border text-[10px] truncate max-w-xs" title={r.desc2}>{r.desc2}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CETAK RAPOR */}
          {activeTab === 'report' && (
            <div className="max-w-[210mm] mx-auto bg-white p-8 shadow-lg min-h-[800px]">
              <div className="flex gap-4 mb-8 print:hidden flex-col md:flex-row items-end bg-slate-50 p-4 rounded-lg border">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <div className="flex gap-2 bg-white p-1 rounded border">
                    <button onClick={() => setReportSubTab('nilai')} className={`px-3 py-1 rounded text-sm ${reportSubTab === 'nilai' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Rapor Nilai</button>
                    <button onClick={() => setReportSubTab('sampul')} className={`px-3 py-1 rounded text-sm ${reportSubTab === 'sampul' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Sampul (Kelas 1)</button>
                  </div>
                </div>
                <div className="w-full md:w-1/4"><label className="text-xs font-bold text-slate-500 mb-1 block">Pilih Rombel</label><select className="p-2 border rounded w-full text-sm" value={reportRombelFilter} onChange={e => setReportRombelFilter(e.target.value)}>
                  {user.role === 'admin' && <option value="">-- Pilih --</option>}
                  {(user.role === 'guru' ? getTeacherRombels : allStudentRombels).map(r => <option key={r} value={r}>{r}</option>)}
                </select></div>
                <div className="w-full md:w-1/3"><label className="text-xs font-bold text-slate-500 mb-1 block">Pilih Siswa</label><select className="p-2 border rounded w-full text-sm" onChange={e => { const val = Number(e.target.value); if (val) { setSelectedStudentId(val); } else { setSelectedStudentId(null); } }} value={selectedStudentId || ''}><option value="">-- Pilih Siswa --</option>{filteredReportStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rombel})</option>)}</select></div>
                <button onClick={() => window.print()} disabled={!selectedStudentId} className="bg-slate-800 text-white px-6 py-2 rounded flex gap-2 hover:bg-slate-900 disabled:opacity-50"><Printer size={18} /> Print</button>
              </div>

              {reportData && selectedStudentId ? (
                <div className="relative font-arial font-sans text-black max-w-[210mm] mx-auto text-sm leading-relaxed">
                  {reportSubTab === 'sampul' && (
                    <>
                      <div className="flex flex-col items-center justify-center text-center h-[297mm] p-10 border-4 border-double border-black mb-8 page-break relative"><img src={TUTWURI_URL} alt="Tut Wuri" className="w-40 h-auto mb-10" /><h1 className="text-2xl font-bold mb-16 mt-4">RAPOR<br />PESERTA DIDIK<br />SEKOLAH DASAR<br />(SD)</h1><div className="w-full max-w-md mb-6"><p className="mb-2 font-bold">Nama Peserta Didik:</p><div className="border-2 border-black p-3 mb-6 bg-white"><p className="text-xl font-bold uppercase tracking-wide">{reportData.s.name}</p></div><p className="mb-2 font-bold">NISN/NIS:</p><div className="border-2 border-black p-3 bg-white"><p className="text-xl font-bold tracking-wider">{reportData.pd.nisn_nis || reportData.s.nisn}</p></div></div><div className="mt-auto mb-20"><p className="font-bold text-lg uppercase tracking-wide">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH<br />REPUBLIK INDONESIA</p></div></div>
                      <div className="h-[297mm] p-14 mb-8 page-break"><h2 className="text-xl font-bold text-center mb-12 uppercase mt-10">Rapor Peserta Didik<br />Sekolah Dasar (SD)</h2><table className="w-full text-sm"><tbody><tr className="h-10"><td className="w-48 font-bold">Nama Sekolah</td><td>: <span className="font-bold">SDN BABELAN KOTA 02</span></td></tr><tr className="h-10"><td className="font-bold">NPSN</td><td>: 20219136</td></tr><tr className="h-10"><td className="font-bold">Alamat Sekolah</td><td>: Jl. Raya Babelan Rt.013/003</td></tr><tr className="h-10"><td className="font-bold">Kode Pos</td><td>: 17610</td></tr><tr className="h-10"><td className="font-bold">Desa/Kelurahan</td><td>: BABELAN KOTA</td></tr><tr className="h-10"><td className="font-bold">Kecamatan</td><td>: BABELAN</td></tr><tr className="h-10"><td className="font-bold">Kabupaten/Kota</td><td>: Bekasi</td></tr><tr className="h-10"><td className="font-bold">Provinsi</td><td>: JAWA BARAT</td></tr><tr className="h-10"><td className="font-bold">Email</td><td>: sdn.babelankota02@gmail.com</td></tr></tbody></table></div>
                      <div className="h-[297mm] p-12 page-break"><h2 className="text-xl font-bold text-center mb-10 uppercase mt-6">Identitas Peserta Didik</h2><table className="w-full text-sm"><tbody>
                        <tr className="h-7"><td className="w-4 font-bold">1.</td><td className="w-48 font-bold">Nama Peserta Didik</td><td>: <span className="font-bold uppercase">{reportData.pd?.namaLengkap || reportData.s.name}</span></td></tr>
                        <tr className="h-7"><td className="font-bold">2.</td><td className="font-bold">NISN/NIS</td><td>: {reportData.pd?.nisn_nis || reportData.s.nisn}</td></tr>
                        <tr className="h-7"><td className="font-bold">3.</td><td className="font-bold">Tempat, Tanggal Lahir</td><td>: {reportData.pd?.ttl || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">4.</td><td className="font-bold">Jenis Kelamin</td><td>: {reportData.pd?.jkl || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">5.</td><td className="font-bold">Agama</td><td>: {reportData.pd?.agama || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">6.</td><td className="font-bold">Alamat Peserta Didik</td><td>: {reportData.pd?.alamat || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">7.</td><td className="font-bold" colSpan="2">Nama Orang Tua</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Ayah</td><td>: {reportData.pd?.namaAyah || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Ibu</td><td>: {reportData.pd?.namaIbu || reportData.s.namaOrtu || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">8.</td><td className="font-bold" colSpan="2">Pekerjaan Orang Tua</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Ayah</td><td>: {reportData.pd?.pekAyah || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Ibu</td><td>: {reportData.pd?.pekIbu || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">9.</td><td className="font-bold" colSpan="2">Alamat Orang Tua</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Jalan</td><td>: {reportData.pd?.jalan || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Kelurahan/Desa</td><td>: {reportData.pd?.kelurahan || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Kecamatan</td><td>: {reportData.pd?.kecamatan || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Kabupaten/Kota</td><td>: {reportData.pd?.kabkota || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Provinsi</td><td>: {reportData.pd?.provinsi || '..........'}</td></tr>
                        <tr className="h-7"><td className="font-bold">10.</td><td className="font-bold" colSpan="2">Wali Peserta Didik</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Nama</td><td>: {reportData.pd?.namaWali || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Pekerjaan</td><td>: {reportData.pd?.pekWali || '..........'}</td></tr>
                        <tr className="h-7"><td></td><td className="pl-4">Alamat</td><td>: {reportData.pd?.alamatWali || '..........'}</td></tr>
                      </tbody></table><div className="flex items-center mt-12"><div className="w-32 h-40 border-2 border-black flex items-center justify-center text-center text-sm mr-8 ml-10">Pas Foto<br />3 x 4</div><div className="flex-1 text-center pl-12"><p>Bekasi, {reportData.currentDate}</p><p className="mb-20">Kepala Sekolah,</p><p className="font-bold underline">{HEADMASTER_NAME}</p><p>NIP. {HEADMASTER_NIP}</p></div></div></div>
                    </>
                  )}
                  {reportSubTab === 'nilai' && (
                    <>
                      <div className="text-center mb-6"><h2 className="text-xl font-bold underline uppercase">Laporan Hasil Belajar Siswa (Rapor)</h2></div>
                      <div className="grid grid-cols-2 gap-8 text-sm mt-6 mb-6">
                        <div className="text-left"><table className="w-full"><tbody><tr><td className="font-bold w-32">Nama Murid</td><td>: {reportData.s.name}</td></tr><tr><td className="font-bold">NISN</td><td>: {reportData.s.nisn}</td></tr><tr><td className="font-bold">Sekolah</td><td>: SDN BABELAN KOTA 02</td></tr><tr><td className="font-bold">Alamat</td><td>: JLN RAYA BABELAN RT 13/03</td></tr></tbody></table></div>
                        <div className="text-left pl-8"><table className="w-full"><tbody><tr><td className="font-bold w-24">Kelas</td><td>: {reportData.s.rombel}</td></tr><tr><td className="font-bold">Fase</td><td>: A</td></tr><tr><td className="font-bold">Semester</td><td>: {reportSemester}</td></tr><tr><td className="font-bold">Tahun</td><td>: {reportYear}</td></tr></tbody></table></div>
                      </div>
                      <table className="w-full border-collapse border border-black text-sm mb-8"><thead className="bg-slate-100"><tr><th className="border border-black p-2 w-10">No</th><th className="border border-black p-2 text-left">Muatan Pelajaran</th><th className="border border-black p-2 w-16">Nilai</th><th className="border border-black p-2 text-left">Capaian Kompetensi</th></tr></thead><tbody>{INITIAL_SUBJECTS.map((sub, i) => { const d = reportData.currentGrades[sub.id] || {}; const score = (typeof d === 'object' ? d.final : d) || 0; const desc = [d.desc1, d.desc2].filter(Boolean).join('\n\n'); return (<tr key={sub.id}><td className="border border-black p-2 text-center">{i + 1}</td><td className="border border-black p-2">{sub.name}</td><td className="border border-black p-2 text-center font-bold">{score}</td><td className="border border-black p-2 text-xs italic whitespace-pre-line">{desc}</td></tr>) })}</tbody></table>
                      <div className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid"><div><h3 className="font-bold mb-2">Ekstrakurikuler</h3><table className="w-full border-collapse border border-black text-xs"><thead><tr className="bg-slate-100"><th className="border border-black p-1">Kegiatan</th><th className="border border-black p-1">Predikat</th><th className="border border-black p-1">Keterangan</th></tr></thead><tbody><tr><td className="border border-black p-1">{reportData.nonAcademic.ekskul}</td><td className="border border-black p-1 text-center">{reportData.nonAcademic.predikatEkskul}</td><td className="border border-black p-1">{reportData.nonAcademic.ketEkskul}</td></tr></tbody></table></div><div><h3 className="font-bold mb-2">Ketidakhadiran</h3><table className="w-full border-collapse border border-black text-xs"><tbody><tr><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 text-center">{reportData.nonAcademic.sakit} hari</td></tr><tr><td className="border border-black p-1">Izin</td><td className="border border-black p-1 text-center">{reportData.nonAcademic.izin} hari</td></tr><tr><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 text-center">{reportData.nonAcademic.alpha} hari</td></tr></tbody></table></div></div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm break-inside-avoid mt-8 px-4"><div><p className="mb-20">Mengetahui,<br />Orang Tua / Wali</p><p className="font-bold uppercase">{reportData.s.namaOrtu}</p></div><div><p className="mb-20">Mengetahui,<br />Kepala Sekolah</p><p className="font-bold underline uppercase">{HEADMASTER_NAME}</p><p>NIP. {HEADMASTER_NIP}</p></div><div><p className="mb-20">Bekasi, {reportData.currentDate}<br />Guru Kelas</p><p className="font-bold uppercase">{reportData.waliKelasName}</p><p>NIP. {reportData.waliKelasNIP}</p></div></div>
                    </>
                  )}
                </div>
              ) : <div className="text-center p-10 text-slate-400 border-2 border-dashed">Silakan pilih rombel dan siswa untuk melihat preview.</div>}
            </div>
          )}

          {/* TAB: CETAK KARTU UJIAN (OPS Only) - REVISI: 6 KARTU/HALAMAN F4, FALLBACK DISPLAY */}
          {activeTab === 'print_cards' && user.role === 'admin' && (
            <div className="max-w-[215mm] mx-auto bg-white p-8 shadow-lg min-h-[330mm]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 print:hidden gap-4">
                <h2 className="text-lg font-bold">Cetak Kartu Ujian SAS (F4)</h2>
                <div className="flex gap-2">
                  <input type="date" className="border p-2 rounded text-sm" value={cardDate} onChange={e => setCardDate(e.target.value)} />
                  <select className="p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50 outline-none" value={cardSemester} onChange={e => setCardSemester(e.target.value)}><option value="1 (Ganjil)">1 (Ganjil)</option><option value="2 (Genap)">2 (Genap)</option></select>
                  <select className="p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50 outline-none w-full md:w-48" value={cardRombelFilter} onChange={e => setCardRombelFilter(e.target.value)}><option value="">-- Pilih Rombel --</option>{allStudentRombels.map(rombel => <option key={rombel} value={rombel}>{rombel}</option>)}</select>
                </div>
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2"><Printer size={18} /> Print Kartu</button>
              </div>

              {/* LAYOUT KARTU: 6 KARTU PER HALAMAN (F4) */}
              <div className="block w-full">
                {/* Fallback: Tampilkan semua siswa yang terfilter jika ada */}
                {(filteredCardStudents.length > 0 ? chunkArray(filteredCardStudents, 6) : []).map((chunk, pageIdx) => (
                  <div key={pageIdx} className="grid grid-cols-2 gap-x-4 gap-y-6 break-after-page mb-8">
                    {chunk.map((s) => (
                      <div key={s.id} className="border-2 border-black p-4 h-[9cm] relative bg-white font-sans text-xs break-inside-avoid">
                        <div className="flex items-center border-b-2 border-black pb-2 mb-2">
                          <img src={KARTU_URL} alt="KARTU" className="w-12 h-auto" />
                          <div className="text-center flex-1">
                            <h3 className="font-bold">DINAS PENDIDIKAN KAB. BEKASI</h3>
                            <h2 className="text-sm font-extrabold">SD NEGERI BABELAN KOTA 02</h2>
                            <p className="text-[10px]">KARTU PESERTA UJIAN SAS</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-20 h-24 border border-black flex items-center justify-center bg-slate-100 text-xs text-slate-400">FOTO 3x4</div>
                          <div className="flex-1 space-y-1.5 text-left">
                            <div className="flex"><span className="w-20 font-bold">NISN</span><span>: {s.nisn}</span></div>
                            <div className="flex"><span className="w-20 font-bold">Nama</span><span>: {s.name}</span></div>
                            <div className="flex"><span className="w-20 font-bold">Kelas</span><span>: {s.rombel}</span></div>
                            <div className="flex"><span className="w-20 font-bold">Semester</span><span>: {cardSemester}</span></div>
                            <div className="flex"><span className="w-20 font-bold">Tgl Ujian</span><span>: {new Date(cardDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-4 text-center">
                          <img src={STEMPEL_URL} alt="Stempel" className="w-20 h-auto mx-auto my-1" />
                          <p className="font-bold underline">{HEADMASTER_NAME}</p>
                          <p>NIP. {HEADMASTER_NIP}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {filteredCardStudents.length === 0 && <div className="text-center p-10 text-slate-400 border-2 border-dashed">Tidak ada siswa atau rombel belum dipilih.</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}