import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings,
  Bell,
  LogOut, 
  ChevronRight,
  ShieldCheck, 
  Trash2,
  Database,
  Check,
  X,
  Key,
  Info,
  Loader2,
  Download,
  Upload,
  Camera
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, getDocs, deleteDoc, addDoc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { SAMPLE_CITIZENS } from '../constants/seedData';
import Papa from 'papaparse';
import { CitizenData, VillageSettings } from '../types';
import { CitizenDataService } from '../services/CitizenDataService';

export default function ProfileView() {
  const { user, profile, logout } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [villageSettings, setVillageSettings] = useState<VillageSettings | null>(null);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'village_data');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setVillageSettings(snap.data() as VillageSettings);
        } else {
          setVillageSettings({
            kabupaten: 'Kepulauan Anambas',
            kecamatan: 'Siantan',
            desa: 'Tarempa Selatan',
            kepalaDesa: '',
            sekretarisDesa: '',
            rts: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013'],
            rws: ['001', '002', '003', '004'],
            dusuns: ['Dusun I Batu Tambun', 'Dusun II Gudang Tengah Rintis'],
            kaduses: []
          });
        }
      } catch (err) {
        console.error("Gagal mendapatkan pengaturan desa:", err);
      }
    };
    fetchSettings();
  }, []);
  
  const [editForm, setEditForm] = useState({
    name: profile?.fullName || '',
    rt: profile?.rt || '',
    rw: profile?.rw || '',
    dusun: profile?.dusun || '',
    nik: profile?.nik || '',
    phoneNumber: profile?.phoneNumber || '',
    gender: profile?.gender || 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    birthPlace: profile?.birthPlace || '',
    birthDate: profile?.birthDate || '',
    kk: profile?.kk || '',
    address: profile?.address || ''
  });

  React.useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.fullName || '',
        rt: profile.rt || '',
        rw: profile.rw || '',
        dusun: profile.dusun || '',
        nik: profile.nik || '',
        phoneNumber: profile.phoneNumber || '',
        gender: profile.gender || 'Laki-laki',
        birthPlace: profile.birthPlace || '',
        birthDate: profile.birthDate || '',
        kk: profile.kk || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const handleSeedData = async () => {
    if (!user) return;
    if (!window.confirm("Ini akan memasukkan data penduduk contoh berdasarkan data Anda. Lanjutkan?")) return;
    
    setSeeding(true);
    try {
      for (const citizen of SAMPLE_CITIZENS) {
        await addDoc(collection(db, 'citizens'), {
          ...citizen,
          userId: user.uid,
          verificationStatus: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      alert("Data berhasil diimpor.");
      window.location.reload();
    } catch (error) {
      alert("Gagal mengimpor data.");
    } finally {
      setSeeding(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Menggunakan titik koma (;) karena Excel versi Indonesia umumnya menggunakan format ini untuk CSV
    const csvContent = "NIK;Nama Lengkap;Alamat Jalan;Tempat Lahir;Tanggal Lahir (YYYY-MM-DD);Jenis Kelamin (Laki-laki/Perempuan);Pekerjaan;Pendidikan;Nomor KK;Nama Kepala Keluarga;RT;RW;Dusun\n1234567890123456;Ahmad Supriyadi;Jalan Anggrek No 1;Bandung;1980-05-12;Laki-laki;Wiraswasta;S1;0987654321098765;Ahmad Supriyadi;001;002;Dusun I Batu Tambun";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'template_data_warga.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!window.confirm(`Anda akan mengimpor data warga dari file ${file.name}. Lanjutkan?`)) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setImporting(true);
    // Kita biarkan PapaParse mendeteksi delimiter secara otomatis (umumnya , atau ;)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(), // Pastikan tidak ada spasi di awal/akhir header dan hilangkan karakter BOM dari Excel
      complete: async (results) => {
        try {
          // Tangani jika auto-detect delimiter mungkin salah (misalnya header tergabung menjadi satu string panjang dengan semicolon)
          let rows = results.data as any[];
          if (rows.length > 0 && Object.keys(rows[0]).length === 1) {
            const firstKey = Object.keys(rows[0])[0];
            if (firstKey.includes(';') || firstKey.includes(',')) {
              // Parse kembali dengan delimiter spesifik jika dirasa salah
              const text = await file.text();
              const reParsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                delimiter: firstKey.includes(';') ? ';' : ',',
                transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
              });
              rows = reParsed.data as any[];
            }
          }

          let importedCount = 0;
          let failedCount = 0;
          let errors: string[] = [];

          if (rows.length === 0) {
            alert("File CSV kosong atau format tidak sesuai.");
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let nik = row['NIK']?.toString().replace(/\D/g, '').trim(); // hanya simpan angka
            const nama = row['Nama Lengkap']?.toString().trim() || row['Nama']?.toString().trim();
            
            // Basic validation
            if (!nik || !nama) continue;
            
            if (nik.length !== 16) {
                // Warning
                failedCount++;
                errors.push(`Baris ${i + 2}: NIK (${nik || 'Kosong'}) tidak 16 digit. Pastikan data tipe text agar tidak hilang. (${nik.length} digit)`);
                continue;
            }

            const newCitizen: Partial<CitizenData> = {
              nik: String(nik),
              name: String(nama),
              address: String(row['Alamat Jalan'] || row['Alamat Lengkap'] || ''),
              birthPlace: String(row['Tempat Lahir'] || ''),
              birthDate: String(row['Tanggal Lahir (YYYY-MM-DD)'] || '1970-01-01'),
              gender: (row['Jenis Kelamin (Laki-laki/Perempuan)'] || '').toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-laki',
              occupation: String(row['Pekerjaan'] || ''),
              education: String(row['Pendidikan'] || ''),
              nkk: String(row['Nomor KK'] || row['No KK'] || ''),
              familyHead: String(row['Nama Kepala Keluarga'] || ''),
              socialAssistance: [],
              economicStatus: "Mampu",
              rt: String(row['RT'] || ''),
              rw: String(row['RW'] || ''),
              dusun: String(row['Dusun'] || ''),
              userId: user.uid, // Admin's user ID since they imported it
              verificationStatus: 'ADMIN_APPROVED', // Auto approved since admin uploaded it
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            try {
              await addDoc(collection(db, 'citizens'), newCitizen);
              importedCount++;
            } catch (err: any) {
              console.error("Failed to add row", i + 2, err);
              failedCount++;
              errors.push(`Baris ${i + 2}: ${err.message || 'Gagal menyimpan ke DB'}`);
            }
          }
          
          if (importedCount === 0) {
             alert(`Tidak ada data yang berhasil diimpor.\n\nGagal: ${failedCount} baris.\nAlasan Penolakan (contoh):\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
          } else {
             alert(`Impor selesai!\n\nSukses: ${importedCount} data.\nGagal: ${failedCount} data.\n${failedCount > 0 ? 'Alasan Penolakan:\n' + errors.slice(0, 3).join('\n') : ''}`);
             window.location.reload();
          }
        } catch (error) {
          console.error("Import error", error);
          alert("Terjadi kesalahan sistem saat memproses.");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
          setImporting(false);
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        alert("Gagal membaca file CSV.");
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const handleResetData = async () => {
    if (!window.confirm("PERINGATAN: Ini akan menghapus TOTAL data Warga, Surat, dan Pengaduan. Lanjutkan?")) return;
    
    setResetting(true);
    try {
      const collections = ['citizens', 'letters', 'complaints'];
      for (const colName of collections) {
        const q = collection(db, colName);
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
      alert("Database dikosongkan.");
      window.location.reload();
    } catch (error) {
      alert("Gagal membersihkan data.");
    } finally {
      setResetting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        fullName: editForm.name,
        rt: editForm.rt,
        rw: editForm.rw,
        dusun: editForm.dusun,
        nik: editForm.nik,
        phoneNumber: editForm.phoneNumber,
        gender: editForm.gender,
        birthPlace: editForm.birthPlace,
        birthDate: editForm.birthDate,
        kk: editForm.kk,
        address: editForm.address,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);

      // Also try to sync with citizens record if it exists
      const citizenData = await CitizenDataService.getCitizenByUserId(user.uid);
      if (citizenData && citizenData.id) {
        await CitizenDataService.updateCitizenData(citizenData.id, {
          name: editForm.name,
          rt: editForm.rt,
          rw: editForm.rw,
          dusun: editForm.dusun,
          nik: editForm.nik,
          gender: editForm.gender,
          birthPlace: editForm.birthPlace,
          birthDate: editForm.birthDate,
          nkk: editForm.kk, // Use nkk for citizens, kk for users
          address: editForm.address,
        });
      }

      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui profil.");
    } finally {
      setUpdating(false);
    }
  };

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUpdatingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: base64String,
          updatedAt: serverTimestamp()
        });
        setUpdatingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setUpdatingPhoto(false);
      alert("Gagal mengunggah foto.");
    }
  };

  // Remove handleRoleSwitch (no longer needed)

  const roles = []; // Empty, as it's no longer used

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-10 h-[2px] bg-indigo-500"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.3em]">Account Center</span>
           </div>
           <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">Informasi Akun</h1>
        </div>
        
        <button 
          onClick={() => logout()}
          className="h-12 px-6 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100"
        >
          <LogOut className="w-4 h-4" /> Keluar dari Sistem
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Profile Card Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-32 gradient-primary"></div>
              
              <div className="relative z-10 pt-16">
                 <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1 mx-auto shadow-2xl mb-6 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-[2.2rem] bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden">
                       {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                       ) : (
                          <User className="w-16 h-16" />
                       )}
                    </div>
                 </div>
                 
                 <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">{profile?.fullName}</h2>
                 <p className="text-slate-400 font-medium mb-6 text-sm italic">{profile?.email}</p>
                 
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest border border-indigo-100 mb-8">
                    <ShieldCheck className="w-4 h-4" /> {profile?.role}
                 </div>

                  <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-50">
                    <div className="text-center">
                       <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">RT</p>
                       <p className="font-bold text-slate-900">{profile?.rt || '-'}</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                       <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">RW</p>
                       <p className="font-bold text-slate-900">{profile?.rw || '-'}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Dusun</p>
                       <p className="font-bold text-slate-900 truncate px-1">{profile?.dusun || '-'}</p>
                    </div>
                 </div>

                 {profile?.nik && (
                   <div className="grid grid-cols-1 gap-2 py-4 border-t border-slate-50">
                      <div className="flex justify-between items-center px-2">
                         <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">No. KK</p>
                         <p className="font-bold text-slate-900 font-mono text-xs">{profile.kk || '-'}</p>
                      </div>
                      <div className="flex justify-between items-center px-2">
                         <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">NIK</p>
                         <p className="font-bold text-slate-900 font-mono text-xs">{profile.nik}</p>
                      </div>
                      <div className="flex justify-between items-center px-2">
                         <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">HP / WA</p>
                         <p className="font-bold text-slate-900 font-mono text-xs">{profile.phoneNumber || '-'}</p>
                      </div>
                   </div>
                 )}

                 {profile?.address && (
                    <div className="py-4 border-t border-slate-50 px-2">
                       <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Detail Alamat</p>
                       <p className="text-xs font-bold text-slate-700 leading-relaxed">{profile.address}</p>
                    </div>
                 )}

                 {profile?.gender && (
                   <div className="py-4 border-t border-slate-50 px-2">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Biodata</p>
                      <p className="text-xs font-bold text-slate-700">
                        {profile.gender}
                        {profile.birthPlace || profile.birthDate ? ` • ${profile.birthPlace}, ${profile.birthDate}` : ''}
                      </p>
                   </div>
                 )}
              </div>
           </div>

           {/* Settings list */}
           <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportCSV} 
           />
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              {[
                { label: 'Ubah Data Profil', icon: Settings, action: () => setShowEditModal(true) },
                { label: 'Notifikasi Sistem', icon: Bell, action: () => setShowNotificationModal(true) },
                { label: 'Keamanan & Sandi', icon: Key, action: () => setShowSecurityModal(true) },
                ...(profile?.role === 'ADMIN' ? [
                  { label: 'Impor Data Warga dari CSV', icon: Upload, action: () => setShowImportModal(true), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Impor Data Dasar (Dummy)', icon: Database, action: handleSeedData, loading: seeding, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Hapus Seluruh Data', icon: Trash2, action: handleResetData, loading: resetting, color: 'text-red-600', bg: 'bg-red-50' }
                ] : [])
              ].map((item, idx) => (
                <button 
                  key={idx}
                  onClick={item.action}
                  disabled={item.loading}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all border-b border-slate-50 last:border-none"
                >
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg || 'bg-slate-100'} ${item.color || 'text-slate-500'}`}>
                         {item.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <item.icon className="w-5 h-5" />}
                      </div>
                      <span className={`text-sm font-bold ${item.color || 'text-slate-700'}`}>{item.label}</span>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
           </div>
        </div>

        {/* Removed Role Simulation Section */}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showEditModal || showNotificationModal || showSecurityModal || showImportModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => {
                 setShowEditModal(false);
                 setShowNotificationModal(false);
                 setShowSecurityModal(false);
                 setShowImportModal(false);
               }}
               className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 50 }}
               className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8 sm:p-12"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                     {showEditModal && "Kustomisasi Profil"}
                     {showNotificationModal && "Pengaturan Notifikasi"}
                     {showSecurityModal && "Keamanan & Sandi"}
                     {showImportModal && "Pusat Impor Data"}
                   </h3>
                   <button onClick={() => {
                     setShowEditModal(false);
                     setShowNotificationModal(false);
                     setShowSecurityModal(false);
                     setShowImportModal(false);
                   }} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full flex items-center justify-center transition-all">
                      <X className="w-5 h-5" />
                   </button>
                </div>

                {/* Content based on active state */}
                {showImportModal && (
                  <div className="space-y-6">
                    <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 flex gap-4">
                      <Info className="w-6 h-6 text-blue-500 shrink-0" />
                      <div className="text-sm text-blue-800 space-y-2">
                        <p className="font-bold">Panduan Impor Data:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Unduh template file dalam bentuk CSV.</li>
                          <li>Buka file tersebut menggunakan Microsoft Excel / Google Sheets.</li>
                          <li className="text-red-500 font-bold underline">Ubah format NIK & Nomor KK menjadi Teks agar tidak berubah menjadi format aneh (seperti 1,23E+15).</li>
                          <li>Isi data warga sesuai dengan judul kolom (NIK & Nama Lengkap wajib).</li>
                          <li>Simpan file. (Jika menggunakan Excel, pilih "Save as..." tipe CSV UTF-8).</li>
                          <li>Unggah kembali file tersebut di bawah ini.</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                         onClick={handleDownloadTemplate}
                         className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-slate-600"
                      >
                         <Download className="w-8 h-8" />
                         <span className="text-sm font-bold text-center">1. Unduh<br/>Template CSV</span>
                      </button>
                      
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         disabled={importing}
                         className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all text-slate-600 disabled:opacity-50"
                      >
                         {importing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                         <span className="text-sm font-bold text-center">2. Unggah<br/>File CSV</span>
                      </button>
                    </div>
                  </div>
                )}
                {showEditModal && (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                     <div className="flex flex-col items-center py-6 bg-slate-50/50 rounded-3xl border border-slate-100 mb-6 group">
                        <div className="relative">
                           <div className="w-24 h-24 rounded-[2rem] bg-white p-1 shadow-xl overflow-hidden ring-4 ring-white">
                              <div className="w-full h-full rounded-[1.8rem] bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden relative">
                                 {profile?.photoURL ? (
                                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                    <User className="w-10 h-10" />
                                 )}
                                 {updatingPhoto && (
                                   <div className="absolute inset-0 bg-white/80 flex items-center justify-center transition-all">
                                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                   </div>
                                 )}
                              </div>
                           </div>
                           <button 
                             type="button"
                             onClick={() => photoInputRef.current?.click()}
                             className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center text-indigo-600 hover:scale-110 active:scale-95 transition-all border border-indigo-50"
                           >
                              <Camera className="w-5 h-5" />
                           </button>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Ketuk Kamera untuk Ganti Foto</p>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={photoInputRef}
                          onChange={handleUpdatePhoto} 
                        />
                     </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap (Sesuai KTP)</label>
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className={`w-full h-12 px-5 rounded-2xl outline-none font-bold transition-all ${
                          profile?.fullName && profile.fullName !== 'Warga Baru' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                        }`}
                        disabled={!!profile?.fullName && profile.fullName !== 'Warga Baru'}
                      />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">NIK (Nomor Induk Kependudukan)</label>
                      <input 
                        type="text" 
                        maxLength={16}
                        value={editForm.nik}
                        onChange={(e) => setEditForm({...editForm, nik: e.target.value})}
                        className={`w-full h-12 px-5 rounded-2xl outline-none font-bold font-mono transition-all ${
                          profile?.nik ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                        }`}
                        disabled={!!profile?.nik}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest ml-1">Nomor Kartu Keluarga (KK)</label>
                      <input 
                        type="text" 
                        maxLength={16}
                        placeholder="16 Digit No. KK"
                        value={editForm.kk}
                        onChange={(e) => setEditForm({...editForm, kk: e.target.value})}
                        className="w-full h-12 px-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold font-mono transition-all" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                        <select 
                          value={editForm.gender}
                          onChange={(e) => setEditForm({...editForm, gender: e.target.value as any})}
                          className={`w-full h-12 px-5 rounded-2xl outline-none font-bold transition-all appearance-none ${
                            profile?.gender ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                          }`}
                          disabled={!!profile?.gender}
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest ml-1">No. HP / WhatsApp</label>
                        <input 
                           type="tel" 
                           placeholder="08..."
                           value={editForm.phoneNumber}
                           onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                           className="w-full h-12 px-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold font-mono transition-all" 
                        />
                      </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Tempat Lahir</label>
                         <input 
                           type="text" 
                           value={editForm.birthPlace}
                           onChange={(e) => setEditForm({...editForm, birthPlace: e.target.value})}
                           className={`w-full h-12 px-5 rounded-2xl outline-none font-bold transition-all ${
                             profile?.birthPlace ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                           }`}
                           disabled={!!profile?.birthPlace}
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Tanggal Lahir</label>
                         <input 
                           type="date" 
                           value={editForm.birthDate}
                           onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                           className={`w-full h-12 px-5 rounded-2xl outline-none font-bold font-mono transition-all ${
                             profile?.birthDate ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                           }`}
                           disabled={!!profile?.birthDate}
                         />
                       </div>
                     </div>

                     <div className="space-y-2">
                       <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest ml-1">Detail Alamat (Jalan/Gg/No. Rumah)</label>
                       <input 
                         type="text" 
                         placeholder="Contoh: Jl. Merdeka No. 10, Gg. Kelinci"
                         value={editForm.address}
                         onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                         className="w-full h-12 px-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold transition-all" 
                       />
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-2">
                           <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">RW</label>
                            <select 
                              value={editForm.rw}
                              onChange={(e) => setEditForm({...editForm, rw: e.target.value})}
                              className={`w-full h-12 px-5 rounded-2xl outline-none font-bold font-mono transition-all appearance-none ${
                                profile?.rw ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                              }`}
                              disabled={!!profile?.rw}
                            >
                              <option value="">RW</option>
                              {villageSettings?.rws.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">RT</label>
                            <select 
                              value={editForm.rt}
                              onChange={(e) => setEditForm({...editForm, rt: e.target.value})}
                              className={`w-full h-12 px-5 rounded-2xl outline-none font-bold font-mono transition-all appearance-none ${
                                profile?.rt ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                              }`}
                              disabled={!!profile?.rt}
                            >
                              <option value="">RT</option>
                              {villageSettings?.rts.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                       </div>
                       <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Wilayah Dusun</label>
                        <select 
                          value={editForm.dusun}
                          onChange={(e) => setEditForm({...editForm, dusun: e.target.value})}
                          className={`w-full h-12 px-5 rounded-2xl outline-none font-bold transition-all appearance-none ${
                            profile?.dusun ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/30 border-indigo-100 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500'
                          }`}
                          disabled={!!profile?.dusun}
                        >
                          <option value="">Pilih Dusun</option>
                          {villageSettings?.dusuns.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                     </div>
                    <div className="pt-4 sticky bottom-0 bg-white">
                      <button 
                        type="submit"
                        disabled={updating}
                        className="w-full h-14 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:opacity-90 transition-all disabled:opacity-50"
                      >
                          {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Simpan Perubahan</>}
                      </button>
                    </div>
                  </form>
                )}

                {(showNotificationModal || showSecurityModal) && (
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                    <Info className="w-16 h-16 text-indigo-200" />
                    <p className="text-slate-600 font-medium">Fitur ini sedang dalam pengembangan tahap akhir.</p>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
