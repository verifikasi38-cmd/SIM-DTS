import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter,
  Download,
  QrCode,
  Send,
  Loader2,
  Trash2,
  Home,
  Store,
  Baby,
  Heart,
  Users,
  Banknote,
  Truck,
  FileSignature,
  MapPin,
  History,
  Music,
  CreditCard,
  UserCheck,
  Map,
  User,
  ShieldCheck,
  FileCheck,
  Zap,
  Printer,
  ChevronRight,
  Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs, limit, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { CitizenData, LetterRequest } from '../types';
import { LetterService } from '../services/LetterService';

export default function LetterSystem() {
  const { profile, user } = useAuth();
  const [letters, setLetters] = useState<LetterRequest[]>([]);
  const [citizen, setCitizen] = useState<CitizenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<CitizenData | null>(null);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [newLetter, setNewLetter] = useState({
    type: 'DOMISILI',
    purpose: '',
    // Land Details for SPORADIK
    batasUtara: '',
    batasSelatan: '',
    batasTimur: '',
    batasBarat: '',
    luasTanah: '',
    statusTanah: '',
    saksi1: '',
    saksi2: ''
  });

  const letterTypes = [
    { value: 'DOMISILI', label: 'Surat Keterangan Domisili', icon: Home, desc: 'Keterangan tempat tinggal penduduk.' },
    { value: 'SKU', label: 'Surat Keterangan Usaha', icon: Store, desc: 'Legalitas usaha mikro untuk perbankan/izin.' },
    { value: 'SKTM', label: 'Surat Ket. Tidak Mampu', icon: FileText, desc: 'Keringanan biaya pendidikan/kesehatan.' },
    { value: 'KELAHIRAN', label: 'Surat Ket. Kelahiran', icon: Baby, desc: 'Keterangan peristiwa kelahiran warga.' },
    { value: 'KEMATIAN', label: 'Surat Ket. Kematian', icon: FileText, desc: 'Laporan administratif peristiwa kematian.' },
    { value: 'NIKAH', label: 'Surat Pengantar Nikah', icon: Heart, desc: 'Syarat nikah di KUA (Model N1-N4).' },
    { value: 'BELUM_NIKAH', label: 'Surat Ket. Belum Menikah', icon: User, desc: 'Keterangan status perkawinan belum nikah.' },
    { value: 'JANDA_DUDA', label: 'Surat Ket. Janda/Duda', icon: User, desc: 'Keterangan status setelah pasangan meninggal.' },
    { value: 'WARIS', label: 'Surat Ket. Ahli Waris', icon: Users, desc: 'Penetapan waris dari keluarga yang meninggal.' },
    { value: 'PENGHASILAN', label: 'Surat Ket. Penghasilan', icon: Banknote, desc: 'Rincian pendapatan untuk administrasi.' },
    { value: 'KEHILANGAN', label: 'Surat Ket. Kehilangan', icon: Search, desc: 'Laporan pengantar dokumen yang hilang.' },
    { value: 'PINDAH', label: 'Surat Keterangan Pindah', icon: Truck, desc: 'Pengantar pindah domisili antar wilayah.' },
    { value: 'BEDA_NAMA', label: 'Surat Ket. Beda Nama', icon: FileSignature, desc: 'Identitas yang memiliki perbedaan penulisan.' },
    { value: 'TANAH', label: 'Surat Ket. Pemilikan Tanah', icon: MapPin, desc: 'Keterangan hak atas tanah warga.' },
    { value: 'RIWAYAT_TANAH', label: 'Surat Ket. Riwayat Tanah', icon: History, desc: 'Catatan penguasaan tanah dari masa ke masa.' },
    { value: 'KERAMAIAN', label: 'Surat Izin Keramaian', icon: Music, desc: 'Izin hajatan atau acara warga.' },
    { value: 'SKCK', label: 'Surat Pengantar SKCK', icon: ShieldCheck, desc: 'Syarat pembuatan catatan kepolisian.' },
    { value: 'KTP_KK', label: 'Surat Pengantar KTP/KK', icon: CreditCard, desc: 'Pengantar pengurusan identitas di Catpil.' },
    { value: 'WARGA', label: 'Surat Keterangan Warga', icon: UserCheck, desc: 'Keterangan aktif sebagai penduduk lokal.' },
    { value: 'SPORADIK', label: 'Pernyataan Tanah (Sporadik)', icon: Map, desc: 'Pernyataan penguasaan fisik tanah secara legal.' },
  ];

  const isOfficial = ['RT', 'RW', 'KADUS', 'ADMIN'].includes(profile?.role || '');

  const handleViewApplicant = async (citizenId: string | undefined) => {
    if (!citizenId) return;
    try {
      const docRef = doc(db, 'citizens', citizenId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSelectedApplicant({ id: snap.id, ...snap.data() } as CitizenData);
        setShowApplicantModal(true);
      } else {
        alert("Data pemohon tidak ditemukan.");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal memuat data pemohon.");
    }
  };

  const handleUpdateStatus = async (letter: LetterRequest, action: 'APPROVE' | 'REJECT') => {
    try {
      let nextStatus = letter.status;
      if (action === 'APPROVE') {
        if (profile?.role === 'ADMIN' || profile?.role === 'KADUS') nextStatus = 'COMPLETED';
        else if (profile?.role === 'RT') nextStatus = 'RT_APPROVED';
        else if (profile?.role === 'RW') nextStatus = 'RW_APPROVED';
        else nextStatus = 'COMPLETED'; // fallback
      } else {
        nextStatus = 'REJECTED';
      }
      
      const letterRef = doc(db, 'letters', letter.id);
      await updateDoc(letterRef, {
        status: nextStatus as any,
        isArchived: nextStatus === 'COMPLETED',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      alert('Gagal mengupdate status surat.');
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteLetter = async (letterId: string) => {
    try {
      setIsDeleting(letterId);
      console.log('Deleting letter:', letterId);
      
      await LetterService.deleteLetter(letterId);
      
      // Update local state immediately
      setLetters(prev => prev.filter(l => l.id !== letterId));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('ERROR HAPUS:', error);
      alert('Gagal menghapus: ' + (error.message || 'Error tidak diketahui'));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadPdf = async (letter: LetterRequest) => {
    try {
      let applicantData = citizen; 
      if (letter.citizenId !== citizen?.id) {
         const citizenSnap = await getDoc(doc(db, 'citizens', letter.citizenId));
         if (citizenSnap.exists()) {
             applicantData = { id: citizenSnap.id, ...citizenSnap.data() } as CitizenData;
         }
      }
      
      if (!applicantData) {
        alert("Data pemohon tidak ditemukan.");
        return;
      }

      // Fetch village data
      let villageData = {
         kabupaten: 'Banyumas',
         kecamatan: 'Baturraden',
         desa: 'Karangtengah',
         kepalaDesa: 'Budi Santoso, S.E.'
      };
      
      try {
         const vSnap = await getDoc(doc(db, 'settings', 'village_data'));
         if (vSnap.exists()) {
            const vData = vSnap.data();
            villageData.kabupaten = vData.kabupaten || villageData.kabupaten;
            villageData.kecamatan = vData.kecamatan || villageData.kecamatan;
            villageData.desa = vData.desa || villageData.desa;
            villageData.kepalaDesa = vData.kepalaDesa || villageData.kepalaDesa;
         }
      } catch (err) {
         console.warn("Could not fetch village settings, using defaults");
      }

      const _doc = new jsPDF();
      const pageWidth = _doc.internal.pageSize.getWidth();
      
      // Header
      _doc.setFontSize(16);
      _doc.setFont("helvetica", "bold");
      _doc.text(`PEMERINTAH KABUPATEN ${villageData.kabupaten.toUpperCase()}`, pageWidth / 2, 20, { align: "center" });
      _doc.setFontSize(14);
      _doc.text(`KECAMATAN ${villageData.kecamatan.toUpperCase()}`, pageWidth / 2, 28, { align: "center" });
      _doc.setFontSize(18);
      _doc.text(`DESA ${villageData.desa.toUpperCase()}`, pageWidth / 2, 36, { align: "center" });
      
      _doc.setLineWidth(1);
      _doc.line(20, 42, pageWidth - 20, 42);
      _doc.setLineWidth(0.5);
      _doc.line(20, 44, pageWidth - 20, 44);
      
      // Title
      _doc.setFontSize(14);
      _doc.setFont("helvetica", "bold");
      _doc.text("SURAT KETERANGAN " + letter.type.replace('_', ' '), pageWidth / 2, 55, { align: "center" });
      _doc.setLineWidth(0.5);
      const titleWidth = _doc.getTextWidth("SURAT KETERANGAN " + letter.type.replace('_', ' '));
      _doc.line((pageWidth - titleWidth)/2, 56, (pageWidth + titleWidth)/2, 56);
      
      _doc.setFontSize(11);
      _doc.setFont("helvetica", "normal");
      _doc.text(`Nomor: ${letter.trackingNumber}/${new Date().getFullYear()}/DKT`, pageWidth / 2, 63, { align: "center" });
      
      // Body    
      _doc.text(`Yang bertanda tangan di bawah ini Kepala Desa ${villageData.desa}, Kecamatan ${villageData.kecamatan},`, 20, 80);
      _doc.text("dengan ini menerangkan bahwa:", 20, 87);
      
      _doc.text("Nama", 30, 100); _doc.text(`: ${applicantData.name}`, 80, 100);
      _doc.text("NIK", 30, 108); _doc.text(`: ${applicantData.nik}`, 80, 108);
      _doc.text("Tempat, Tgl Lahir", 30, 116); _doc.text(`: ${applicantData.birthPlace}, ${applicantData.birthDate}`, 80, 116);
      _doc.text("Jenis Kelamin", 30, 124); _doc.text(`: ${applicantData.gender}`, 80, 124);
      _doc.text("Pekerjaan", 30, 132); _doc.text(`: ${applicantData.occupation || '-'}`, 80, 132);
      
      const addressStr = `${applicantData.address}, RT ${applicantData.rt}/RW ${applicantData.rw}, Dusun ${applicantData.dusun}`;
      const splitTitle = _doc.splitTextToSize(addressStr, 110);
      _doc.text("Alamat", 30, 140); _doc.text(": ", 80, 140);
      _doc.text(splitTitle, 83, 140);
      
      const yAfterAddress = 140 + (splitTitle.length * 7);
      
      if (letter.type === 'SPORADIK') {
        _doc.setFont("helvetica", "bold");
        _doc.text("DATA OBJEK TANAH", 20, yAfterAddress + 10);
        _doc.setFont("helvetica", "normal");
        _doc.text(`- Luas Tanah: ${letter.luasTanah || '-'} M2`, 30, yAfterAddress + 17);
        _doc.text(`- Status: ${letter.statusTanah || '-'}`, 30, yAfterAddress + 24);
        _doc.text("- Batas-batas:", 30, yAfterAddress + 31);
        _doc.text(`  Utara: ${letter.batasUtara || '-'}`, 35, yAfterAddress + 38);
        _doc.text(`  Selatan: ${letter.batasSelatan || '-'}`, 35, yAfterAddress + 45);
        _doc.text(`  Timur: ${letter.batasTimur || '-'}`, 35, yAfterAddress + 52);
        _doc.text(`  Barat: ${letter.batasBarat || '-'}`, 35, yAfterAddress + 59);

        _doc.setFontSize(9);
        _doc.text("PERNYATAAN TANGGUNG JAWAB", 20, yAfterAddress + 75);
        const lPernyataan = "Saya bertanggung jawab penuh secara hukum atas kebenaran penguasaan fisik tanah ini. Apabila di kemudian hari terbukti pernyataan ini tidak benar, saya bersedia dituntut sesuai hukum yang berlaku.";
        const splitPernyataan = _doc.splitTextToSize(lPernyataan, 170);
        _doc.text(splitPernyataan, 20, yAfterAddress + 82);
        
        _doc.text("SAKSI-SAKSI:", 20, yAfterAddress + 105);
        _doc.text(`1. ${letter.saksi1 || '-'}`, 25, yAfterAddress + 112);
        _doc.text(`2. ${letter.saksi2 || '-'}`, 25, yAfterAddress + 119);

        _doc.setFontSize(7);
        _doc.text("MATERAI 10.000", 20, yAfterAddress + 150);

        _doc.setFontSize(11);
        _doc.text(`Orang tersebut di atas benar memiliki tanah sesuai rincian di atas.`, 20, yAfterAddress + 170);
      } else {
        _doc.text(`Orang tersebut di atas adalah benar-benar warga Desa ${villageData.desa} berdomisili`, 20, yAfterAddress + 10);
        _doc.text("di alamat tersebut. Surat keterangan ini dibuat untuk keperluan:", 20, yAfterAddress + 17);
        
        _doc.setFont("helvetica", "bold");
        _doc.text(letter.purpose, 20, yAfterAddress + 26);
        _doc.setFont("helvetica", "normal");
        
        _doc.text("Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan", 20, yAfterAddress + 40);
        _doc.text("sebagaimana mestinya.", 20, yAfterAddress + 47);
      }
      
      // TTD
      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const ySigOffset = letter.type === 'SPORADIK' ? 200 : yAfterAddress + 70;

      _doc.text(`${villageData.desa}, ${dateStr}`, pageWidth - 80, ySigOffset);
      _doc.text(`Kepala Desa ${villageData.desa}`, pageWidth - 80, ySigOffset + 7);
      
      // Digital signature / QR Code
      try {
        const qrContent = `Otentikasi Digital Desa ${villageData.desa}\nPemohon: ${applicantData.name}\nNIK: ${applicantData.nik}\nTujuan: ${letter.purpose}\nID Surat: ${letter.trackingNumber}\nTanggal: ${dateStr}`;
        const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 100, margin: 1 });
        _doc.addImage(qrDataUrl, 'PNG', pageWidth - 80, ySigOffset + 12, 30, 30);
        
        _doc.setFontSize(7);
        _doc.setTextColor(100, 100, 100);
        _doc.text("Ditandatangani secara", pageWidth - 78, ySigOffset + 46);
        _doc.text("elektronik menggunakan QR", pageWidth - 78, ySigOffset + 49);
      } catch (qrErr) {
        console.error("Gagal membuat QR Code", qrErr);
      }
      
      _doc.setTextColor(0, 0, 0);
      _doc.setFontSize(11);
      _doc.setFont("helvetica", "bold");
      _doc.text(villageData.kepalaDesa, pageWidth - 80, ySigOffset + 65);
      _doc.setLineWidth(0.5);
      _doc.line(pageWidth - 80, ySigOffset + 67, pageWidth - 30, ySigOffset + 67);
      
      _doc.save(`Surat-${letter.type}-${letter.trackingNumber}.pdf`);
    } catch(e) {
      console.error(e);
      alert('Gagal menghasilkan PDF');
    }
  };

  useEffect(() => {
    if (!user) return;

    // Get current citizen data first
    const qCitizen = query(collection(db, 'citizens'), where('userId', '==', user.uid), limit(1));
    const unsubCitizen = onSnapshot(qCitizen, (snapshot) => {
      if (!snapshot.empty) {
        setCitizen({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CitizenData);
      }
    }, (error) => {
      console.error("Error in citizen data listener:", error);
    });

    // Get letters based on role
    const qLetters = isOfficial ? query(collection(db, 'letters')) : query(collection(db, 'letters'), where('userId', '==', user.uid));
    const unsubLetters = onSnapshot(qLetters, (sLetters) => {
      setLetters(sLetters.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterRequest)));
      setLoading(false);
    }, (error) => {
      console.error("Error in letters listener:", error);
      setLoading(false);
    });

    return () => {
      unsubCitizen();
      unsubLetters();
    };
  }, [user, isOfficial]);

  const handleRequest = async () => {
    if (!citizen) return;
    setLoading(true);
    try {
      const trackingNumber = 'DTS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'letters'), {
        ...newLetter,
        citizenId: citizen.id,
        userId: user.uid,
        citizenName: citizen.name,
        status: 'PENDING',
        trackingNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewLetter({ 
        type: 'DOMISILI', 
        purpose: '',
        batasUtara: '',
        batasSelatan: '',
        batasTimur: '',
        batasBarat: '',
        luasTanah: '',
        statusTanah: '',
        saksi1: '',
        saksi2: ''
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Header Service */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-10 h-[2px] bg-indigo-500"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.3em]">Smart Service</span>
           </div>
           <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">Layanan Surat Digital</h1>
           <p className="text-slate-500 font-medium mt-2 max-w-xl">Penerbitan surat keterangan mandiri dengan sistem tanda tangan elektronik dan verifikasi QR Code terpadu.</p>
        </div>
        
        {!isOfficial && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-3 h-14 px-8 gradient-primary text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5 shadow-sm" />
            Ajukan Surat Baru
          </button>
        )}
      </div>

      {/* Hero Stats for Letters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-6"
         >
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
               <FileCheck className="w-7 h-7" />
            </div>
            <div>
               <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-2">Surat Selesai</p>
               <h3 className="text-2xl font-extrabold text-slate-900">{letters.filter(l => l.status === 'COMPLETED').length} <span className="text-sm font-medium text-slate-400">Arsip</span></h3>
            </div>
         </motion.div>
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-6"
         >
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
               <Clock className="w-7 h-7" />
            </div>
            <div>
               <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-2">Sedang Proses</p>
               <h3 className="text-2xl font-extrabold text-slate-900">{letters.filter(l => l.status === 'PENDING').length} <span className="text-sm font-medium text-slate-400">Aktif</span></h3>
            </div>
         </motion.div>
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-indigo-600 p-6 rounded-[2rem] text-white flex items-center gap-6 relative overflow-hidden group sm:col-span-2 lg:col-span-1"
         >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700"><Zap className="w-14 h-14" /></div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white relative z-10">
               <Zap className="w-7 h-7" />
            </div>
            <div className="relative z-10">
               <p className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-widest leading-none mb-2">Estimasi Selesai</p>
               <h3 className="text-2xl font-extrabold">24 <span className="text-sm font-medium text-indigo-300">Jam Kerja</span></h3>
            </div>
         </motion.div>
      </div>

      {/* Main List Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[400px]">
         <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-6 bg-slate-50/30">
            <div className="flex items-center gap-6">
               <button 
                 onClick={() => setView('active')}
                 className={`text-xl font-extrabold tracking-tight pb-1 border-b-2 transition-all ${view === 'active' ? 'text-slate-900 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
               >
                 Riwayat Pengajuan
               </button>
               <button 
                 onClick={() => setView('archived')}
                 className={`text-xl font-extrabold tracking-tight pb-1 border-b-2 transition-all ${view === 'archived' ? 'text-slate-900 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
               >
                 Arsip Surat
               </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
               <div className="relative group w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                  <input 
                    type="text" 
                    placeholder="Cari surat..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold text-xs" 
                  />
               </div>
               <button className="h-11 px-6 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"><Filter className="w-4 h-4" /> Filter</button>
            </div>
         </div>

         <div className="p-4 sm:p-8 space-y-6">
            {loading ? (
              <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
            ) : letters.filter(l => (view === 'archived' ? !!l.isArchived : !l.isArchived) && (l.purpose.toLowerCase().includes(searchTerm.toLowerCase()) || l.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()))).length === 0 ? (
              <div className="py-20 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100 border-dashed">
                    <FileText className="w-10 h-10" />
                 </div>
                 <h4 className="text-xl font-extrabold text-slate-900 leading-none mb-2">
                   {(searchTerm && letters.length > 0) ? 'Tidak Ditemukan' : (view === 'active' ? 'Belum Ada Pengajuan' : 'Arsip Masih Kosong')}
                 </h4>
                 <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">
                   {searchTerm 
                     ? `Tidak ditemukan hasil untuk "${searchTerm}"`
                     : (view === 'active' 
                        ? "Anda dapat mengajukan permohonan surat secara mandiri melalui tombol 'Ajukan Surat Baru'." 
                        : "Surat yang telah selesai diproses akan otomatis masuk ke dalam arsip ini.")}
                 </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {letters
                  .filter(l => (view === 'archived' ? !!l.isArchived : !l.isArchived) && (l.purpose.toLowerCase().includes(searchTerm.toLowerCase()) || l.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())))
                  .map((letter, idx) => (
                    <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={letter.id} 
                    className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col gap-5 relative"
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                          letter.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                          letter.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                           <FileText className="w-7 h-7" />
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-10">
                           <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-[0.1em] border border-indigo-100/50 whitespace-nowrap">
                                    {letter.type.replace('_', ' ')}
                                 </span>
                                 <span className="text-[9px] font-medium text-slate-300 font-mono truncate">#{letter.trackingNumber}</span>
                              </div>
                              
                              {/* Simple Delete Button in the Top Right of the textual info area */}
                              {isOfficial && (
                                 <div className="absolute top-6 right-6">
                                    <button 
                                      type="button"
                                      disabled={isDeleting === letter.id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDeleteConfirm(letter.id);
                                      }}
                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                      title="Hapus Permohonan"
                                    >
                                      {isDeleting === letter.id ? (
                                         <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                         <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                 </div>
                              )}
                           </div>
                           <h4 className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight truncate">Keperluan: {letter.purpose}</h4>
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                           <Clock className="w-3.5 h-3.5" />
                           {letter.createdAt ? 
                             (typeof letter.createdAt === 'string' ? new Date(letter.createdAt).toLocaleDateString('id-ID') : 
                             (letter.createdAt as any).toDate ? (letter.createdAt as any).toDate().toLocaleDateString('id-ID') : '-') 
                           : '-'}
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border transition-all ${
                           letter.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                           letter.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                           {letter.status === 'PENDING' ? 'Antrean' : letter.status}
                           {letter.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-3 pt-2">
                        {isOfficial && (
                           <button
                             onClick={() => handleViewApplicant(letter.citizenId)}
                             className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all border border-slate-100 text-[10px] font-bold uppercase tracking-widest"
                           >
                             <User className="w-4 h-4" /> Profil
                           </button>
                        )}
                        {letter.status === 'COMPLETED' ? (
                          <button onClick={() => handleDownloadPdf(letter)} className="flex-1 h-10 px-4 bg-slate-900 text-white rounded-xl text-[9px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-100">
                             <Printer className="w-4 h-4" /> Unduh
                          </button>
                        ) : letter.status === 'REJECTED' && view === 'active' ? (
                          <button 
                            onClick={async () => {
                              const letterRef = doc(db, 'letters', letter.id);
                              await updateDoc(letterRef, { isArchived: true, updatedAt: new Date().toISOString() });
                            }}
                            className="flex-1 h-10 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                          >
                            Arsipkan
                          </button>
                        ) : isOfficial && letter.status !== 'REJECTED' && (
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => handleUpdateStatus(letter, 'REJECT')}
                              className="flex-1 h-10 border border-red-100 text-red-500 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
                            >
                              Tolak
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(letter, 'APPROVE')}
                              className="flex-1 h-10 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100"
                            >
                              Sesuai
                            </button>
                          </div>
                        )}
                     </div>
                  </motion.div>
                ))}
              </div>
            )}
         </div>
      </div>

      {/* Modern Dialog Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 50 }}
               transition={{ type: 'spring', damping: 25, stiffness: 300 }}
               className="relative w-full max-w-4xl bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
             >
                <div className="p-6 sm:px-12 sm:pt-12 sm:pb-8 flex items-center justify-between">
                   <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Ajukan Permohonan</h3>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mt-1">Smart Public Service Module v1.0</p>
                   </div>
                   <button onClick={() => setShowModal(false)} className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl sm:rounded-full transition-all flex items-center justify-center border border-slate-100">
                      <XCircle className="w-5 h-5 sm:w-6 h-6" />
                   </button>
                </div>
                
                <div className="overflow-y-auto px-6 sm:px-12 pb-6 flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 leading-relaxed">
                   <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Kategori Layanan Surat</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {letterTypes.map(type => (
                               <button 
                                 key={type.value}
                                 onClick={() => setNewLetter({...newLetter, type: type.value})}
                                 className={`p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all ${
                                    newLetter.type === type.value ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 hover:bg-slate-50 hover:border-slate-100'
                                 }`}
                               >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${newLetter.type === type.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                     <type.icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                     <p className={`text-xs font-extrabold leading-none mb-1 ${newLetter.type === type.value ? 'text-indigo-900' : 'text-slate-700'}`}>{type.label}</p>
                                     <p className="text-[10px] text-slate-400 font-medium leading-normal leading-none truncate w-32">{type.desc}</p>
                                  </div>
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="lg:col-span-5 space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Informasi Pemohon</label>
                         <div className="p-4 sm:p-6 bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center gap-4 mb-4 sm:mb-6 relative z-10">
                               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl shadow-indigo-100 shadow-lg border-2 border-white overflow-hidden bg-white">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div>
                                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight leading-none mb-1">{citizen?.name || 'Warga SIM-DTS'}</p>
                                  <p className="text-[9px] sm:text-[10px] text-indigo-600 font-bold font-mono tracking-tighter">{citizen?.nik || 'Data belum diverifikasi'}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 sm:p-3 bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest border border-indigo-100/30 relative z-10">
                               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                               Verifikasi Data Otomatis
                            </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Tujuan / Keperluan</label>
                            <span className={`text-[9px] font-bold ${newLetter.purpose.length > 5 ? 'text-emerald-500' : 'text-slate-300'}`}>
                               {newLetter.purpose.length}/100 Karakter
                            </span>
                         </div>
                         <textarea 
                            rows={3}
                            maxLength={100}
                            value={newLetter.purpose}
                            onChange={(e) => setNewLetter({...newLetter, purpose: e.target.value})}
                            placeholder="Contoh: Lampiran pengajuan kredit usaha mikro atau syarat pendaftaran KUA..."
                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold text-xs sm:text-sm resize-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                         />
                      </div>

                      {newLetter.type === 'SPORADIK' && (
                         <div className="space-y-4 pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block">Detail Objek Tanah (Wajib)</label>
                            <div className="grid grid-cols-2 gap-4">
                               <input placeholder="Batas Utara" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.batasUtara} onChange={e => setNewLetter({...newLetter, batasUtara: e.target.value})} />
                               <input placeholder="Batas Selatan" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.batasSelatan} onChange={e => setNewLetter({...newLetter, batasSelatan: e.target.value})} />
                               <input placeholder="Batas Timur" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.batasTimur} onChange={e => setNewLetter({...newLetter, batasTimur: e.target.value})} />
                               <input placeholder="Batas Barat" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.batasBarat} onChange={e => setNewLetter({...newLetter, batasBarat: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <input placeholder="Luas (M2)" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.luasTanah} onChange={e => setNewLetter({...newLetter, luasTanah: e.target.value})} />
                               <input placeholder="Status Tanah" className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.statusTanah} onChange={e => setNewLetter({...newLetter, statusTanah: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                               <input placeholder="Nama Saksi 1" className="w-full p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.saksi1} onChange={e => setNewLetter({...newLetter, saksi1: e.target.value})} />
                               <input placeholder="Nama Saksi 2" className="w-full p-3 bg-slate-50 rounded-xl text-xs border border-slate-100" value={newLetter.saksi2} onChange={e => setNewLetter({...newLetter, saksi2: e.target.value})} />
                            </div>
                         </div>
                      )}
                   </div>
                 </div>
                </div>

                <div className="px-6 py-6 sm:px-12 sm:pb-12 sm:pt-6 bg-slate-50/50 border-t border-slate-100">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                      <div className="hidden sm:flex items-center gap-3 text-slate-400">
                         <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-indigo-500">
                           <QrCode className="w-6 h-6" />
                         </div>
                         <p className="text-[10px] font-bold leading-tight max-w-[180px] uppercase tracking-wide">Digital ID & QR Code Authentikasi Otomatis</p>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                         <button onClick={() => setShowModal(false)} className="flex-1 sm:flex-none h-12 sm:h-14 px-6 sm:px-8 text-slate-500 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-white rounded-2xl transition-all">Batal</button>
                         <button 
                           onClick={handleRequest}
                           disabled={loading || !newLetter.purpose || !citizen}
                           className="flex-1 sm:flex-none h-12 sm:h-14 px-6 sm:px-10 gradient-primary text-white rounded-2xl font-extrabold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                         >
                           {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-3.5 h-3.5 sm:w-4 h-4" /> Kirim</>}
                         </button>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApplicantModal && selectedApplicant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
               onClick={() => setShowApplicantModal(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-xl bg-white rounded-[2rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Detail Pemohon</h3>
                   <button onClick={() => setShowApplicantModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors">
                      <XCircle className="w-6 h-6" />
                   </button>
                </div>
                
                <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">NIK</label>
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-mono font-bold text-sm mt-2">{selectedApplicant.nik}</div>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Nama Lengkap</label>
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-extrabold text-lg mt-2">{selectedApplicant.name}</div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Tempat, Tgl Lahir</label>
                       <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-bold text-sm mt-2">{selectedApplicant.birthPlace}, {selectedApplicant.birthDate}</div>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Jenis Kelamin</label>
                       <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-bold text-sm mt-2">{selectedApplicant.gender}</div>
                     </div>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Alamat (RT/RW / Dusun)</label>
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-bold text-sm mt-2 leading-relaxed">
                        {selectedApplicant.address} <br/> 
                        <span className="text-slate-400">RT {selectedApplicant.rt} / RW {selectedApplicant.rw} — {selectedApplicant.dusun}</span>
                     </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Hapus Permohonan?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">Tindakan ini tidak dapat dibatalkan. Permohonan akan dihapus selamanya dari sistem.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleDeleteLetter(deleteConfirm)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  {isDeleting === deleteConfirm ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-20 p-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none mb-1">SIM-DTS Smart Service 2.0</h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digital Governance Trust Alliance</p>
            </div>
         </div>
         <p className="text-[10px] text-slate-400 font-bold max-w-sm text-center md:text-right leading-relaxed">
            Layanan ini dilindungi oleh UU ITE. Pemalsuan data atau keterangan dalam pengajuan surat dapat dikenai sanksi hukum sesuai ketentuan yang berlaku.
         </p>
      </footer>
    </div>
  );
}
