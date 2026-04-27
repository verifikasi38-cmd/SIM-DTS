import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Users, UserPlus, FileEdit, AlertCircle, Trash2, CheckCircle2, Camera, Scan, Clock } from 'lucide-react';
import { CitizenDataService } from '../services/CitizenDataService';
import { NotificationService } from '../services/NotificationService';
import { CitizenData } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, deleteDoc, writeBatch, deleteField } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { OCCUPATIONS } from '../constants/occupations';
import { EDUCATION_LEVELS } from '../constants/education';
import { extractKtpData } from '../services/geminiService';
import { resizeImage } from '../lib/imageUtils';
import { Loader2 } from 'lucide-react';

export default function FamilyDataView({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<CitizenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<CitizenData | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const MyNkk = profile?.nkk || profile?.kk;

  useEffect(() => {
    if (!user || (!MyNkk && profile?.role !== 'ADMIN')) {
       setLoading(false);
       return;
    }

    const q = MyNkk 
      ? query(collection(db, 'citizens'), where('nkk', '==', MyNkk))
      : query(collection(db, 'citizens'), where('userId', '==', user.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CitizenData));
      setFamilyMembers(members);
      setLoading(false);
    });

    return () => unsub();
  }, [user, MyNkk]);

  if (isPreparing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-bold text-lg animate-pulse">Menyiapkan SIM-DTS...</p>
         </div>
      </div>
    );
  }

  if (!MyNkk && familyMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
         <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-indigo-600" />
         </div>
         <h2 className="text-2xl font-bold text-slate-800 mb-3">Data Keluarga Belum Ada</h2>
         <p className="text-slate-500 max-w-md mb-8">
            Anda belum melengkapi data diri Anda atau Nomor Kartu Keluarga (KK) belum tercatat. Silakan lengkapi "Data Warga" terlebih dahulu.
         </p>
         <button 
            onClick={() => {
               if (setActiveTab) {
                  setIsPreparing(true);
                  setTimeout(() => {
                     setActiveTab('Data Warga');
                  }, 1500);
               } else {
                  window.location.reload();
               }
            }} 
            className="px-8 py-3.5 gradient-primary text-white font-bold rounded-2xl shadow-xl shadow-indigo-100"
         >
            Lengkapi Data Sekarang
         </button>
      </div>
    );
  }

  const handleDelete = async (id: string, name: string) => {
     const memberToDelete = familyMembers.find(m => m.id === id);
     const isPrimary = memberToDelete?.userId === user?.uid;
     
     const message = isPrimary 
        ? `PERINGATAN: Anda menghapus data PROFIL UTAMA (${name}). Akun Anda akan kehilangan status verifikasi dan data profil akan dikosongkan. Yakin ingin menghapus?`
        : `Hapus anggota keluarga ${name}?`;

     if (window.confirm(message)) {
        try {
           await CitizenDataService.deleteCitizen(id);
           
           if (isPrimary && user) {
              // Also clear the fields in the user profile to allow "Starting from Scratch"
              await updateDoc(doc(db, 'users', user.uid), {
                 nik: null,
                 kk: null,
                 nkk: null,
                 isVerified: false,
                 updatedAt: serverTimestamp()
              });
           }
           
           alert("Data berhasil dihapus.");
           console.log("Delete success for ID:", id);
        } catch (err) {
           console.error("Delete failed:", err);
           alert("Gagal menghapus data. Pastikan Anda memiliki izin.");
        }
     }
  };

  const handleFullReset = async (isDeleteAccount: boolean = false) => {
    if (!user) return;
    
    const confirmMsg = isDeleteAccount 
      ? "HAPUS AKUN TOTAL: Semua data Anda akan dihapus permanen dan Anda akan dikeluarkan dari sistem. Anda harus mendaftar ulang dari awal. Lanjutkan?"
      : "RESET DATA: Semua data keluarga akan dihapus dan profil Anda akan dikosongkan. Lanjutkan?";

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);
        const batch = writeBatch(db);
        
        // 1. Find all citizens linked to this user's primary ID
        const qMain = query(collection(db, 'citizens'), where('userId', '==', user.uid));
        const snapMain = await getDocs(qMain);
        snapMain.docs.forEach(d => batch.delete(d.ref));

        // 2. Find all citizens linked to the user's NKK (family members)
        if (MyNkk && MyNkk !== '-') {
          const qFamily = query(collection(db, 'citizens'), where('nkk', '==', MyNkk));
          const snapFamily = await getDocs(qFamily);
          snapFamily.docs.forEach(d => {
            const alreadyInBatch = snapMain.docs.some(m => m.id === d.id);
            if (!alreadyInBatch) {
              batch.delete(d.ref);
            }
          });
        }

        // 3. Find and delete notifications
        const qNotif = query(collection(db, 'notifications'), where('userId', '==', user.uid));
        const snapNotif = await getDocs(qNotif);
        snapNotif.docs.forEach(d => batch.delete(d.ref));
        
        // 4. Handle Profile Record
        const userRef = doc(db, 'users', user.uid);
        if (isDeleteAccount) {
           batch.delete(userRef);
        } else {
           batch.update(userRef, {
              nik: null,
              kk: null,
              nkk: null,
              rt: null,
              rw: null,
              dusun: null,
              isVerified: false,
              updatedAt: serverTimestamp()
           });
        }

        await batch.commit();
        
        if (isDeleteAccount) {
           await signOut(auth);
           alert("Akun dan data Anda telah dihapus sepenuhnya. Halaman akan dimuat ulang.");
           window.location.href = '/';
        } else {
           alert("Selesai! Semua data kependudukan Anda telah dikosongkan. Silakan mulai merekam data dari awal.");
           window.location.reload();
        }
      } catch (err) {
        console.error("Reset failed:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        alert(`Gagal melakukan penghapusan: ${errorMsg}. Silakan coba logout lalu login kembali untuk menyegarkan ijin akses, atau pastikan koneksi internet stabil.`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 gradient-primary rounded-xl text-white shadow-lg shadow-indigo-100">
               <Users className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Data Keluarga</h1>
          </div>
          <p className="text-slate-500 font-medium">
            Kelola anggota keluarga dengan Nomor KK: <strong className="text-indigo-600">{MyNkk}</strong>
          </p>
        </div>
        <button 
          onClick={() => { setEditMember(null); setShowForm(true); }}
          className="px-6 py-3 gradient-primary text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-100"
        >
          <UserPlus className="w-4 h-4" /> Tambah Anggota
        </button>
        {familyMembers.length > 0 && (
          <button 
            onClick={handleFullReset}
            className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Reset Semua Data
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {familyMembers.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
               <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-500">
                  <UserPlus className="w-10 h-10" />
               </div>
               <h3 className="text-xl font-extrabold text-slate-900 mb-2">Belum Ada Anggota Keluarga</h3>
               <p className="text-slate-500 max-w-sm mb-8 font-medium">
                  Daftar di atas masih kosong. Silakan tambahkan NIK Istri, Anak, atau keluarga lainnya yang terdaftar dalam satu KK.
               </p>
               <button 
                  onClick={() => { setEditMember(null); setShowForm(true); }}
                  className="px-8 py-3.5 gradient-primary text-white font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-transform shadow-xl shadow-indigo-100"
               >
                  <UserPlus className="w-5 h-5" /> Daftarkan Anggota Sekarang
               </button>
               <button 
                 onClick={() => handleFullReset(false)}
                 className="mt-6 px-4 py-2 text-rose-500 hover:text-rose-700 text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-all"
               >
                 <Trash2 className="w-4 h-4" /> Reset Data & Profil
               </button>
               <button 
                 onClick={() => handleFullReset(true)}
                 className="mt-2 px-4 py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold flex items-center gap-1 opacity-40 hover:opacity-100 transition-all"
               >
                 <AlertCircle className="w-3 h-3" /> Hapus Akun Permanen & Logout
               </button>
            </div>
         ) : (
                familyMembers.map((member) => {
                  const isActuallySelf = member.nik === profile?.nik;
                  // Ownership: Created by user OR belongs to same family (Head of Family check)
                  const matchesNkk = member.nkk === profile?.kk || member.nkk === profile?.nkk;
                  const ownsRecord = member.userId === user?.uid || (matchesNkk && !!MyNkk) || profile?.role === 'ADMIN';
                  
                  return (
                     <motion.div 
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-colors"
                     >
                        {ownsRecord && (
                           <div className="absolute top-0 right-0 p-4 flex gap-2">
                              <button 
                                 onClick={() => { setEditMember(member); setShowForm(true); }} 
                                 title="Edit Data" 
                                 className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all"
                              >
                                 <FileEdit className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => handleDelete(member.id!, member.name)} 
                                 title="Hapus Data" 
                                 className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        )}
                        <div className="flex items-start gap-4 mb-4">
                           <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                              {member.name.charAt(0)}
                           </div>
                           <div className="flex-1 min-w-0 pr-16">
                              <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
                              <p className="text-sm font-medium text-slate-500">{member.nik}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                 <div className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-md tracking-widest border border-slate-200">
                                    {member.familyStatus || 'Keluarga'}
                                 </div>
                                 {member.verificationStatus === 'ADMIN_APPROVED' ? (
                                    <div className="inline-block px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md tracking-widest border border-emerald-100 flex items-center gap-1">
                                       <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                    </div>
                                 ) : (
                                    <div className="inline-block px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-md tracking-widest border border-amber-100 flex items-center gap-1">
                                       <Clock className="w-3 h-3" /> PENDING
                                    </div>
                                 )}
                                 {isActuallySelf && (
                                    <div className="inline-block px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-md tracking-widest border border-indigo-100">
                                       SAYA
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </motion.div>
                  );
               })
         )}
      </div>

      {showForm && (
         <FamilyMemberModal 
           member={editMember} 
           nkk={MyNkk!} 
           onClose={() => setShowForm(false)} 
         />
      )}
    </div>
  );
}

function FamilyMemberModal({ member, nkk, onClose }: { member: CitizenData | null, nkk: string, onClose: () => void }) {
   const { user, profile } = useAuth();
   
         // Safeguard: Check if this is the user's primary record
         const isProfileRecord = member && (member.nik === profile?.nik || (member.userId === user?.uid && !member.familyStatus?.toLowerCase().includes('istri') && !member.familyStatus?.toLowerCase().includes('anak')));
         const isVerified = member?.verificationStatus === 'ADMIN_APPROVED';

   const [formData, setFormData] = useState<Partial<CitizenData>>(member || {
      nkk: nkk,
      verificationStatus: 'PENDING',
      socialAssistance: [],
      address: profile?.address || '',
      rt: profile?.rt || '',
      rw: profile?.rw || '',
      dusun: profile?.dusun || '',
   });
   const [loading, setLoading] = useState(false);
   const [scanning, setScanning] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
     if (!user) return;
     
     // Fetch the main citizen data for this user to get regional info if missing in profile
     const loadData = async () => {
        try {
           const principalData = await CitizenDataService.getCitizenByUserId(user.uid);
           
           // Determine best regional data source
           const rt = principalData?.rt || profile?.rt;
           const rw = principalData?.rw || profile?.rw;
           const dusun = principalData?.dusun || profile?.dusun;
           const address = principalData?.address || profile?.address;
           const familyHead = principalData?.familyHead || principalData?.name;

           if (rt || rw || dusun) {
              setFormData(prev => ({
                 ...prev,
                 rt: prev.rt || rt || '',
                 rw: prev.rw || rw || '',
                 dusun: prev.dusun || dusun || '',
                 address: prev.address || address || '',
                 familyHead: prev.familyHead || familyHead || ''
              }));
           }
        } catch (err) {
           console.error("Error loading regional data for family member:", err);
        }
     };
     loadData();
   }, [user, profile]);

   const handleKtpScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanning(true);
      try {
         const resizedBlob = await resizeImage(file, 1200, 1200);
         const arrayBuffer = await resizedBlob.arrayBuffer();
         const extractedData = await extractKtpData(arrayBuffer, 'image/jpeg');
         
         setFormData(prev => ({
            ...prev,
            nik: extractedData.nik || prev.nik || "",
            name: extractedData.name || prev.name || "",
            birthPlace: extractedData.birthPlace || prev.birthPlace || "",
            birthDate: extractedData.birthDate || prev.birthDate || "",
            gender: (extractedData.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
            occupation: extractedData.occupation || prev.occupation || "",
            // RT/RW/Dusun should be preserved from extraction IF present, else keep current
            rt: extractedData.rt || prev.rt,
            rw: extractedData.rw || prev.rw,
            dusun: extractedData.dusun || prev.dusun,
         }));
      } catch (error) {
         console.error("Failed to scan KTP:", error);
         alert("Gagal memindai KTP. Pastikan KTP jelas dan coba lagi.");
      } finally {
         setScanning(false);
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
         // Check for duplicate NIK in the database to prevent easy mistakes
         if (!member && formData.nik) {
            const q = query(collection(db, 'citizens'), where('nik', '==', formData.nik));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
               alert(`NIK ${formData.nik} sudah terdaftar dalam sistem.`);
               setLoading(false);
               return;
            }
         }

         // Ensure user doesn't accidentally add themselves again
         if (!member && formData.nik === profile?.nik) {
            alert("Anda tidak perlu menambahkan diri sendiri lagi. Data Anda sudah otomatis tercatat sebagai Kepala Keluarga/Anggota Utama.");
            setLoading(false);
            return;
         }

         // Determine regional data again at submission to be safe
         const finalRt = formData.rt || profile?.rt || '001';
         const finalRw = formData.rw || profile?.rw || '001';
         const finalDusun = formData.dusun || profile?.dusun || '-';

         const payload = {
            ...formData,
            // Only attach userId if this is the account holder's primary record
            // If it's a new member, we don't attach userId to keep the profile distinct
            userId: (isProfileRecord || (member && member.userId === user?.uid)) ? user!.uid : null,
            nkk: nkk,
            verificationStatus: member?.verificationStatus || 'PENDING',
            familyHead: formData.familyHead || '-',
            address: formData.address || '-',
            rt: finalRt,
            rw: finalRw,
            dusun: finalDusun,
            socialAssistance: formData.socialAssistance || [],
            economicStatus: formData.economicStatus || '-',
            role: 'CITIZEN'
         } as any;

         if (member?.id) {
            await CitizenDataService.updateCitizenData(member.id, payload);
         } else {
            await CitizenDataService.createCitizenData(payload);
            
            // Notify RT
            await NotificationService.sendNotification({
               title: 'Anggota Keluarga Baru',
               message: `Data anggota keluarga baru (${formData.name}) telah ditambahkan oleh ${profile?.fullName}. Mohon verifikasi tingkat RT.`,
               type: 'VERIFICATION',
               targetRole: 'RT',
               targetRt: finalRt,
               targetRw: finalRw,
               link: '/verification'
            });
         }
         onClose();
      } catch (err) {
         console.error(err);
         alert("Gagal menyimpan data keluarga.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
         >
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{member ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga'}</h2>
            {isProfileRecord && (
               <p className="text-sm text-indigo-600 font-medium mb-6 bg-indigo-50 p-3 rounded-xl border border-indigo-100 italic">
                  Ini adalah data profil akun Anda. Nama dan NIK tidak dapat diubah jika sudah terverifikasi untuk keamanan akun.
               </p>
            )}
            
            {!isProfileRecord && (
               <div className="mb-6">
               <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleKtpScan}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
               />
               <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                  className="w-full p-6 border-2 border-dashed border-indigo-100 rounded-3xl bg-indigo-50/50 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-3 group"
               >
                  {scanning ? (
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-bold text-indigo-600">Sedang Memindai...</span>
                     </div>
                  ) : (
                     <>
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                           <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                           <p className="font-bold text-slate-900">Foto KTP Anggota Keluarga</p>
                           <p className="text-sm text-slate-500">Gunakan kamera untuk mengisi data otomatis</p>
                        </div>
                     </>
                  )}
               </button>
            </div>
         )}

         <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">NIK {isProfileRecord && isVerified && '(Terkunci)'}</label>
                     <input 
                        required 
                        disabled={isProfileRecord && isVerified}
                        value={formData.nik || ''} 
                        onChange={e => setFormData({...formData, nik: e.target.value})} 
                        className={`w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${isProfileRecord && isVerified ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap {isProfileRecord && isVerified && '(Terkunci)'}</label>
                     <input 
                        required 
                        disabled={isProfileRecord && isVerified}
                        value={formData.name || ''} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className={`w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${isProfileRecord && isVerified ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Tempat Lahir</label>
                     <input required value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal Lahir</label>
                     <input type="date" required value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">L/P</label>
                     <select required value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Pilih...</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Status Dalam Keluarga</label>
                     <select required value={formData.familyStatus || ''} onChange={e => setFormData({...formData, familyStatus: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Pilih...</option>
                        <option value="Kepala Keluarga">Kepala Keluarga</option>
                        <option value="Suami">Suami</option>
                        <option value="Istri">Istri</option>
                        <option value="Anak">Anak</option>
                        <option value="Menantu">Menantu</option>
                        <option value="Cucu">Cucu</option>
                        <option value="Orang Tua">Orang Tua</option>
                        <option value="Mertua">Mertua</option>
                        <option value="Famili Lain">Famili Lain</option>
                        <option value="Pembantu">Pembantu</option>
                        <option value="Lainnya">Lainnya</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Pekerjaan</label>
                     <select 
                        required 
                        value={OCCUPATIONS.includes(formData.occupation || '') ? formData.occupation : (formData.occupation ? 'Lainnya' : '')} 
                        onChange={e => {
                           const val = e.target.value;
                           if (val === 'Lainnya') {
                              setFormData({...formData, occupation: ''});
                           } else {
                              setFormData({...formData, occupation: val});
                           }
                        }} 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                     >
                        <option value="" disabled>Pilih Pekerjaan...</option>
                        {OCCUPATIONS.map(occ => (
                           <option key={occ} value={occ}>{occ}</option>
                        ))}
                        <option value="Lainnya">Lainnya (Isi Sendiri)</option>
                     </select>
                     {(formData.occupation === '' || !OCCUPATIONS.includes(formData.occupation || '')) && (formData.occupation !== undefined || (formData.occupation === '' && OCCUPATIONS.includes(formData.occupation || '') === false)) && (
                        <input 
                           required
                           type="text" 
                           value={formData.occupation || ''} 
                           onChange={e => setFormData({...formData, occupation: e.target.value})}
                           className="w-full mt-2 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="Tuliskan pekerjaan..."
                        />
                     )}
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase">Pendidikan</label>
                     <select 
                        required 
                        value={EDUCATION_LEVELS.includes(formData.education || '') ? formData.education : (formData.education ? 'Lainnya' : '')} 
                        onChange={e => {
                           const val = e.target.value;
                           if (val === 'Lainnya') {
                              setFormData({...formData, education: ''});
                           } else {
                              setFormData({...formData, education: val});
                           }
                        }} 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                     >
                        <option value="" disabled>Pilih Pendidikan...</option>
                        {EDUCATION_LEVELS.map(edu => (
                           <option key={edu} value={edu}>{edu}</option>
                        ))}
                        <option value="Lainnya">Lainnya (Isi Sendiri)</option>
                     </select>
                     {(formData.education === '' || !EDUCATION_LEVELS.includes(formData.education || '')) && (formData.education !== undefined || (formData.education === '' && EDUCATION_LEVELS.includes(formData.education || '') === false)) && (
                        <input 
                           required
                           type="text" 
                           value={formData.education || ''} 
                           onChange={e => setFormData({...formData, education: e.target.value})}
                           className="w-full mt-2 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="Tuliskan pendidikan..."
                        />
                     )}
                  </div>
               </div>

               <div className="flex gap-4 pt-6">
                  <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 px-4 gradient-primary text-white font-bold rounded-xl hover:opacity-90">Simpan</button>
               </div>
            </form>
         </motion.div>
      </div>
   );
}
