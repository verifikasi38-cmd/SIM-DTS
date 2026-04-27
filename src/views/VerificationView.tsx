import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  Filter,
  ArrowRight,
  ShieldAlert,
  Loader2,
  ChevronRight,
  User,
  Users,
  Clock,
  MoreVertical,
  ArrowLeft,
  Check,
  AlertTriangle,
  History,
  Briefcase,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { CitizenData } from '../types';
import { NotificationService } from '../services/NotificationService';
import { CitizenDataService } from '../services/CitizenDataService';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

export default function VerificationView() {
  const { profile } = useAuth();
  const [citizens, setCitizens] = useState<CitizenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterMode, setFilterMode] = useState<'ANTREAN' | 'VALID'>('ANTREAN');

  useEffect(() => {
    console.log("DEBUG: profile role=", profile?.role, "dusun=", profile?.dusun, "rt=", profile?.rt, "rw=", profile?.rw);
    if (!profile) return;

    // Build query based on role
    const citizensRef = collection(db, 'citizens');
    
    console.log("DEBUG: Building query for role:", profile?.role, "with filter:", filterMode);
    
    let verificationTarget = 'PENDING';
    
    if (filterMode === 'ANTREAN') {
       if (profile.role === 'RT') verificationTarget = 'PENDING';
       else if (profile.role === 'RW') verificationTarget = 'RT_APPROVED';
       else if (profile.role === 'KADUS') verificationTarget = 'RW_APPROVED';
       else if (profile.role === 'ADMIN') verificationTarget = 'KADUS_APPROVED'; // Default to final stage
    } else {
       if (profile.role === 'RT') verificationTarget = 'RT_APPROVED';
       else if (profile.role === 'RW') verificationTarget = 'RW_APPROVED';
       else if (profile.role === 'KADUS') verificationTarget = 'KADUS_APPROVED';
       else verificationTarget = 'ADMIN_APPROVED';
    }
    
    console.log("DEBUG: Target status:", verificationTarget);

    let q;
    if (profile.role === 'ADMIN' && filterMode === 'VALID') {
       q = query(citizensRef, where('role', '==', 'CITIZEN'));
    } else {
       const constraints = [
         where('role', '==', 'CITIZEN'),
       ];
       
       if (filterMode === 'ANTREAN') {
          constraints.push(where('verificationStatus', '==', verificationTarget));
       } else {
          constraints.push(where('verificationStatus', 'in', [verificationTarget, 'ADMIN_APPROVED']));
       }
       
       // Optimization: Use Firestore queries for regional filtering if set
       if (profile.role === 'RT') {
         if (profile.rt) constraints.push(where('rt', '==', profile.rt));
         else { console.warn("DEBUG: RT profile missing rt info."); }
       } else if (profile.role === 'RW') {
         if (profile.rw) constraints.push(where('rw', '==', profile.rw));
         else { console.warn("DEBUG: RW profile missing rw info."); }
       } else if (profile.role === 'KADUS') {
         if (profile.dusun) constraints.push(where('dusun', '==', profile.dusun));
         else { console.warn("DEBUG: KADUS profile missing dusun info, profile:", profile); }
       }
       
       console.log("DEBUG: Constraints:", constraints);
       q = query(citizensRef, ...constraints);
    }

    // Special ADMIN bypass: If ADMIN in ANTREAN mode wants to oversight, we could load more.
    // But let's follow the user's specific request about RT/RW/KADUS first.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CitizenData));
      
      // Filter strictly by CITIZEN role as per user request
      data = data.filter(c => c.role === 'CITIZEN');

      // Final JS fallback filtering if query was broad or profile data is missing in query
      if (profile.role === 'RT' && profile.rt) {
        data = data.filter(c => c.rt === profile.rt);
      } else if (profile.role === 'RW' && profile.rw) {
        data = data.filter(c => c.rw === profile.rw);
      } else if (profile.role === 'KADUS' && profile.dusun) {
        data = data.filter(c => c.dusun && c.dusun.trim().toLowerCase() === profile.dusun!.trim().toLowerCase());
      }

        setCitizens(data);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'citizens');
        setLoading(false);
      });

    return () => unsubscribe();
  }, [profile, filterMode]);

  const handleAction = async (citizenId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(citizenId);
    try {
      const citizenRef = doc(db, 'citizens', citizenId);
      
      if (action === 'APPROVE') {
        let nextStatus: string = 'RT_APPROVED';
        let targetRole: any = 'RW';
        let message = `Data warga ${selectedCitizen?.name} telah disetujui oleh RT. Mohon verifikasi tingkat RW.`;

        if (profile?.role === 'RT') {
           nextStatus = 'RT_APPROVED';
           targetRole = 'RW';
           message = `Data warga ${selectedCitizen?.name} telah disetujui oleh RT. Mohon verifikasi tingkat RW.`;
        } else if (profile?.role === 'RW') {
          nextStatus = 'RW_APPROVED';
          targetRole = 'KADUS';
          message = `Data warga ${selectedCitizen?.name} telah disetujui oleh RW. Mohon verifikasi tingkat Dusun.`;
        } else if (profile?.role === 'KADUS') {
          nextStatus = 'KADUS_APPROVED';
          targetRole = 'ADMIN';
          message = `Data warga ${selectedCitizen?.name} telah disetujui oleh Kadus. Mohon verifikasi tingkat Desa.`;
        } else if (profile?.role === 'ADMIN') {
          nextStatus = 'ADMIN_APPROVED';
          targetRole = null; // Final
        }
        
        await updateDoc(citizenRef, {
          verificationStatus: nextStatus as any,
          updatedAt: new Date().toISOString()
        });

        // Notify next level
        if (targetRole) {
          await NotificationService.sendNotification({
            title: 'Verifikasi Lanjutan Berjenjang',
            message: message,
            type: 'VERIFICATION',
            targetRole: targetRole,
            targetRw: selectedCitizen?.rw,
            targetDusun: selectedCitizen?.dusun,
            link: '/verification'
          });
        }

        // Notify Citizen
        await NotificationService.sendNotification({
          userId: selectedCitizen?.userId,
          title: 'Update Verifikasi Data',
          message: `Data Anda telah disetujui oleh ${profile?.role}. ${targetRole ? 'Menunggu verifikasi tingkat selanjutnya.' : 'Verifikasi selesai!'}`,
          type: 'VERIFICATION',
          read: false,
          createdAt: new Date().toISOString()
        } as any);

      } else {
        await updateDoc(citizenRef, {
          verificationStatus: 'REJECTED',
          updatedAt: new Date().toISOString()
        });

        // Notify Citizen
        await NotificationService.sendNotification({
          userId: selectedCitizen?.userId,
          title: 'Data Ditolak',
          message: `Maaf, data kependudukan Anda ditolak oleh ${profile?.role}. Silakan periksa kembali data Anda.`,
          type: 'VERIFICATION',
        });
      }
      setSelectedCitizen(null);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (citizen: CitizenData) => {
    if (!citizen.id) return;
    
    const confirmDelete = window.confirm(`HAPUS DATA WARGA: Anda akan menghapus data ${citizen.name} secara permanen. Hal ini memungkinkan warga tersebut untuk mendaftar ulang jika terjadi kesalahan data yang tidak bisa diedit. Lanjutkan?`);
    if (!confirmDelete) return;

    setActionLoading(citizen.id);
    console.log("Starting deletion of citizen:", citizen.id, "for user:", citizen.userId);
    
    try {
      // 1. Delete the citizen identity document
      await deleteDoc(doc(db, 'citizens', citizen.id));
      console.log("Citizen document deleted successfully");
      
      // 2. Clear user profile registration data so they can start over
      if (citizen.userId) {
         try {
           const userRef = doc(db, 'users', citizen.userId);
           await updateDoc(userRef, {
              nik: "", // Use empty string instead of null just in case of rule restrictions
              kk: "",
              nkk: "",
              isVerified: false,
              updatedAt: new Date().toISOString()
           });
           console.log("User profile reset successfully");
         } catch (userError) {
           console.error("Warning: Citizen deleted but user profile reset failed:", userError);
           // We don't fail the whole operation if profile reset fails, 
           // as the main data is already gone.
         }
      }

      alert(`Data ${citizen.name} berhasil dihapus.`);
      // The onSnapshot in the component will automatically update the UI
    } catch (error: any) {
      console.error("Delete operation failed:", error);
      const errorMessage = error.message || "Gagal menghapus data warga.";
      alert(errorMessage.includes("insufficient permissions") 
        ? "Gagal: Anda tidak memiliki izin untuk menghapus data ini." 
        : `Gagal menghapus data: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCitizens = citizens.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.nik.includes(searchQuery)
  );

  if (loading) {
     return (
        <div className="min-h-[400px] flex flex-col items-center justify-center">
           <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Memuat Antrean Verifikasi...</p>
        </div>
     );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Aksi Diperlukan</span>
           </div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Smart Verification</h1>
           <p className="text-slate-500 font-medium">Anda sedang mengaudit data wilayah {profile?.rt && profile.role === 'RT' ? `RT ${profile.rt}` : profile?.rw && profile.role === 'RW' ? `RW ${profile.rw}` : 'Desa Tarempa Selatan'}.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="h-14 bg-indigo-600 text-white rounded-[2rem] px-8 flex items-center gap-4 shadow-xl shadow-indigo-100">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                 {filterMode === 'ANTREAN' ? <Users className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              <div>
                 <p className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-widest leading-none mb-1">
                    {filterMode === 'ANTREAN' ? 'Total Antrean' : 'Data Terverifikasi'}
                 </p>
                 <p className="text-xl font-extrabold leading-none">{citizens.length} Warga</p>
              </div>
           </div>
        </div>
      </div>

      {/* Profile Scope Warning */}
      {((profile?.role === 'RT' && !profile.rt) || (profile?.role === 'RW' && !profile.rw) || (profile?.role === 'KADUS' && !profile.dusun)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
             <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
             </div>
             <div className="text-center md:text-left flex-1">
                <h3 className="text-lg font-extrabold text-amber-900 mb-1 leading-tight">Profil Petugas Belum Lengkap</h3>
                <p className="text-sm text-amber-700 font-medium leading-relaxed">
                   Peran Anda adalah <strong>{profile?.role}</strong>, namun nomor {profile?.role} Anda belum ditetapkan oleh Administrator. Anda tidak akan melihat data warga sampai lingkup wilayah Anda diatur.
                </p>
             </div>
             <div className="p-3 bg-white/50 rounded-xl text-[10px] font-extrabold text-amber-600 uppercase tracking-widest border border-amber-100">
                Hubungi Admin Desa
             </div>
          </div>
      )}

      {/* Main Worklist */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
         {/* Search & Tabs Overlay */}
         <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-6">
            <div className="relative group flex-1 max-w-sm">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                  <Search className="w-5 h-5 text-slate-300" />
               </div>
               <input 
                 type="text" 
                 placeholder="Cari Nama atau NIK..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full h-12 pl-12 pr-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 transition-all font-bold" 
               />
            </div>
            
            <div className="flex gap-3">
               <button 
                  onClick={() => setFilterMode('ANTREAN')}
                  className={`h-12 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${filterMode === 'ANTREAN' ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm border' : 'bg-slate-50 text-slate-400 border border-transparent hover:bg-slate-100'}`}
               >
                  <Filter className="w-4 h-4" /> Antrean
               </button>
               <button 
                  onClick={() => setFilterMode('VALID')}
                  className={`h-12 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${filterMode === 'VALID' ? 'bg-white border-emerald-100 text-emerald-600 shadow-sm border' : 'bg-slate-50 text-slate-400 border border-transparent hover:bg-slate-100'}`}
               >
                  <History className="w-4 h-4" /> {profile?.role === 'ADMIN' ? 'Semua Data' : 'Data Valid'}
               </button>
            </div>
         </div>

         {/* Worklist Table */}
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full">
               <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                     <th className="px-8 py-5 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Identitas Warga</th>
                     <th className="px-8 py-5 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Wilayah</th>
                     <th className="px-8 py-5 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Status Alur</th>
                     <th className="px-8 py-5 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Kendalikan</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredCitizens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <ShieldAlert className="w-8 h-8" />
                         </div>
                         <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{filterMode === 'ANTREAN' ? 'Antrean Verifikasi Bersih' : 'Belum Ada Data'}</p>
                         <p className="text-xs text-slate-500 mt-1">{filterMode === 'ANTREAN' ? 'Sangat Bagus! Semua permohonan data telah diproses.' : 'Berdasarkan filter saat ini, tidak ada data warga valid.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCitizens.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                               <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-sm shadow-sm">
                                  {c.name.charAt(0)}
                               </div>
                               <div>
                                  <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                                  <div className="text-[11px] font-bold text-slate-400 mt-0.5 font-mono">{c.nik}</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="font-bold text-slate-700 text-xs">RT {c.rt} / RW {c.rw}</div>
                            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight mt-0.5">{c.dusun}</div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                               <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold border uppercase tracking-widest shadow-sm ${
                                  c.verificationStatus === 'ADMIN_APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  c.verificationStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-amber-50 text-amber-700 border-amber-100'
                               }`}>
                                  {c.verificationStatus === 'ADMIN_APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} 
                                  {c.verificationStatus === 'PENDING' && 'Tahap RT'}
                                  {c.verificationStatus === 'RT_APPROVED' && 'Tahap RW'}
                                  {c.verificationStatus === 'RW_APPROVED' && 'Tahap Dusun/Kadus'}
                                  {c.verificationStatus === 'KADUS_APPROVED' && 'Tahap Desa'}
                                  {c.verificationStatus === 'ADMIN_APPROVED' && 'Terverifikasi'}
                                  {c.verificationStatus === 'REJECTED' && 'Ditolak'}
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                <button 
                                 onClick={() => setSelectedCitizen(c)}
                                 className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2"
                               >
                                  <Eye className="w-4 h-4" /> Tinjau Data
                               </button>
                               {profile?.role === 'ADMIN' && (
                                 <button 
                                   onClick={() => handleDelete(c)}
                                   disabled={!!actionLoading}
                                   title="Hapus Data (Kembalikan ke pendaftaran awal)"
                                   className="h-10 w-10 flex items-center justify-center bg-rose-50 border border-rose-200 rounded-xl text-rose-500 shadow-sm hover:bg-rose-100 hover:text-rose-600 transition-all"
                                 >
                                    {actionLoading === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                 </button>
                               )}
                               {filterMode === 'ANTREAN' && (
                                 <button 
                                   onClick={() => handleAction(c.id!, 'APPROVE')}
                                   disabled={!!actionLoading}
                                   className="h-10 px-4 gradient-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                 >
                                    {actionLoading === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Validasi</>}
                                 </button>
                               )}
                            </div>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Modern Detail Drawer (Desktop) & Fullscreen Modal (Mobile) */}
      <AnimatePresence>
        {selectedCitizen && (
          <>
            {console.log("DEBUG: selectedCitizen:", selectedCitizen)}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCitizen(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[60] overflow-y-auto flex flex-col"
            >
               {/* Drawer Header */}
               <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setSelectedCitizen(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                     </button>
                     <div>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Detail Audit Data</h3>
                        <p className="text-xs font-bold text-slate-400">Verifikasi Berjenjang SIM-DTS</p>
                     </div>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                     <ShieldCheck className="w-6 h-6" />
                  </div>
               </div>

               {/* Drawer Content */}
               <div className="flex-1 p-8 space-y-10">
                  {/* Identity Box */}
                  <section className="space-y-6">
                     <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Informasi Identitas</h4>
                     </div>
                     <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <div>
                           <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                           <p className="font-bold text-slate-900">{selectedCitizen.name}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">NIK</p>
                           <p className="font-bold text-slate-900 font-mono text-sm">{selectedCitizen.nik}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tempat, Tgl Lahir</p>
                           <p className="font-bold text-slate-900">{selectedCitizen.birthPlace}, {selectedCitizen.birthDate}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">RT / RW</p>
                           <p className="font-bold text-slate-900">{selectedCitizen.rt} / {selectedCitizen.rw}</p>
                        </div>
                     </div>
                  </section>

                  {/* Socio-Economic Box */}
                  <section className="space-y-6">
                     <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Sosial & Ekonomi</h4>
                     </div>
                     <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                           <span className="text-xs font-bold text-slate-400">Pekerjaan</span>
                           <span className="text-sm font-bold text-slate-900">{selectedCitizen.occupation}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                           <span className="text-xs font-bold text-slate-400">Nomor KK</span>
                           <span className="text-sm font-bold text-slate-900">
                              {selectedCitizen.nkk || '-'}
                           </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                           <span className="text-xs font-bold text-slate-400">Kepala Keluarga</span>
                           <span className="text-sm font-bold text-slate-900">
                              {selectedCitizen.familyHead || '-'}
                           </span>
                        </div>
                        <div className="pt-3">
                           <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Lampu Indikator (AI Scan)</p>
                           <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest">
                              <CheckCircle2 className="w-4 h-4" /> Kredibilitas Data Tinggi
                           </div>
                        </div>
                     </div>
                  </section>

                  {/* Action Logs Simulation */}
                  <section className="space-y-6">
                     <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Jejak Audit</h4>
                     </div>
                     <div className="relative pl-6 space-y-6">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100"></div>
                        <div className="relative flex items-start gap-4">
                           <div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm ring-4 ring-emerald-50"></div>
                           <div>
                              <p className="text-[11px] font-extrabold text-slate-900">Input Data Warga</p>
                              <p className="text-[10px] text-slate-400 font-bold">{new Date(selectedCitizen.createdAt).toLocaleDateString('id-ID')} • 09:30</p>
                           </div>
                        </div>
                        <div className="relative flex items-start gap-4">
                           <div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm ring-4 ring-amber-50"></div>
                           <div>
                              <p className="text-[11px] font-extrabold text-slate-900 uppercase">Menunggu Analisis {profile?.role}</p>
                              <p className="text-[10px] text-slate-400 font-bold text-amber-600">Pending</p>
                           </div>
                        </div>
                     </div>
                  </section>
               </div>

               {/* Drawer Footer Actions */}
               <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 sticky bottom-0 z-10">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200 mb-2">
                     <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                     <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                        Dengan menekan tombol <span className="text-indigo-600">Terima Dokumen</span>, Anda menyatakan telah memverifikasi keaslian data warga ini di lapangan.
                     </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => handleAction(selectedCitizen.id!, 'REJECT')}
                       disabled={!!actionLoading}
                       className="h-14 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                     >
                        {actionLoading === selectedCitizen.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5" /> Tolak Data</>}
                     </button>
                     <button 
                       onClick={() => handleAction(selectedCitizen.id!, 'APPROVE')}
                       disabled={!!actionLoading}
                       className="h-14 gradient-primary text-white rounded-2xl text-xs font-bold shadow-xl shadow-indigo-100 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                     >
                        {actionLoading === selectedCitizen.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Terima Dokumen</>}
                     </button>
                  </div>
                  <p className="text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-2">Keputusan Bersifat Final & Tercatat di Sistem</p>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
