import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Users, 
  FileText, 
  MessageSquare, 
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
  PlusCircle,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { CitizenData } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({
    citizens: 0,
    pendingVerifications: 0,
    pendingLetters: 0,
    activeComplaints: 0
  });
  const [userCitizenData, setUserCitizenData] = useState<CitizenData | null>(null);
  const [loading, setLoading] = useState(true);

  const isCitizen = profile?.role === 'CITIZEN';
  const isLocalOfficial = ['RT', 'RW', 'KADUS'].includes(profile?.role || '');
  const isAdmin = profile?.role === 'ADMIN';
  const isOfficial = isLocalOfficial || isAdmin;

  const getSubtext = () => {
    if (isCitizen) return 'Pantau status permohonan surat, layanan bantuan, dan update data keluarga Anda secara mandiri.';
    if (isLocalOfficial) return `Panel kendali operasional digital untuk ${profile?.role} ${profile?.role === 'RT' ? profile.rt : profile?.role === 'RW' ? profile.rw : profile?.dusun}.`;
    return 'Panel kendali administrasi terpusat untuk seluruh wilayah desa.';
  };

  const getStats = () => {
    if (isAdmin) return [
      { label: 'Total Warga', value: stats.citizens, icon: Users, color: 'indigo' },
      { label: 'Verifikasi', value: stats.pendingVerifications, icon: ShieldCheck, color: 'emerald' },
      { label: 'Permintaan Surat', value: stats.pendingLetters, icon: FileText, color: 'blue' },
    ];
    if (isLocalOfficial) return [
      { label: `Warga (${profile?.role === 'RT' ? 'RT ' + profile.rt : profile?.role === 'RW' ? 'RW ' + profile.rw : profile?.dusun})`, value: stats.citizens, icon: Users, color: 'indigo' },
      { label: 'Perlu Validasi', value: stats.pendingVerifications, icon: ShieldCheck, color: 'emerald' },
      { label: 'Surat Masuk', value: stats.pendingLetters, icon: FileText, color: 'blue' },
    ];
    return [
       { label: 'Status Surat', value: stats.pendingLetters, icon: FileText, color: 'blue' },
       { label: 'Pengaduan', value: stats.activeComplaints, icon: MessageSquare, color: 'orange' },
    ];
  };

  useEffect(() => {
    if (!user || !profile) return;
    const isOfficialMemberOf = ['ADMIN', 'RT', 'RW', 'KADUS'].includes(profile.role);
    let unsubCitizens = () => {};
    let unsubPending = () => {};
    let unsubLetters = () => {};
    let unsubComplaints = () => {};

    if (isOfficialMemberOf) {
      // For officials, we MUST use server-side queries with where clauses to satisfy Firestore rules
      // Strictly only count those who are registered as CITIZEN (Identity)
      let citizenQuery = query(collection(db, 'citizens'), where('role', '==', 'CITIZEN'));
      
      if (profile?.role === 'RT' && profile.rt) {
        citizenQuery = query(citizenQuery, where('rt', '==', profile.rt));
      } else if (profile?.role === 'RW' && profile.rw) {
        citizenQuery = query(citizenQuery, where('rw', '==', profile.rw));
      } else if (profile?.role === 'KADUS' && profile.dusun) {
        citizenQuery = query(citizenQuery, where('dusun', '==', profile.dusun));
      } else if (profile?.role !== 'ADMIN') {
        // Non-admin official with no scope set yet - cannot query broadly
        setLoading(false);
        return;
      }

      unsubCitizens = onSnapshot(citizenQuery, (snapshot) => {
        setStats(prev => ({ ...prev, citizens: snapshot.docs.length }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'citizens');
      });

      let targetStatus = 'PENDING';
      if (profile?.role === 'RW') targetStatus = 'RT_APPROVED';
      else if (profile?.role === 'KADUS') targetStatus = 'RW_APPROVED';
      else if (profile?.role === 'ADMIN') targetStatus = 'KADUS_APPROVED';

      // Strictly only count those who are registered as CITIZEN (Identity)
      let pendingQuery = query(collection(db, 'citizens'), where('verificationStatus', '==', targetStatus), where('role', '==', 'CITIZEN'));
      
      if (profile?.role === 'RT' && profile.rt) {
        pendingQuery = query(pendingQuery, where('rt', '==', profile.rt));
      } else if (profile?.role === 'RW' && profile.rw) {
        pendingQuery = query(pendingQuery, where('rw', '==', profile.rw));
      } else if (profile?.role === 'KADUS' && profile.dusun) {
        pendingQuery = query(pendingQuery, where('dusun', '==', profile.dusun));
      }

      unsubPending = onSnapshot(pendingQuery, (snapshot) => {
          setStats(prev => ({ ...prev, pendingVerifications: snapshot.docs.length }));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'citizens');
        }
      );
      unsubLetters = onSnapshot(query(collection(db, 'letters'), where('status', '==', 'PENDING')), (snapshot) => {
          setStats(prev => ({ ...prev, pendingLetters: snapshot.size }));
      }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'letters');
      });
      unsubComplaints = onSnapshot(query(collection(db, 'complaints'), where('status', '==', 'PENDING')), (snapshot) => {
          setStats(prev => ({ ...prev, activeComplaints: snapshot.size }));
      }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'complaints');
      });
    }

    const unsubUserData = onSnapshot(
      query(collection(db, 'citizens'), where('userId', '==', user.uid)),
      (snapshot) => {
        if (!snapshot.empty) {
          // Identify the best data to show (prefer non-pending/rejected, or most recent)
          const docs = snapshot.docs.map(d => d.data() as CitizenData);
          // Selection heuristic:
          // 1. Verified + Head of Family
          // 2. Verified
          // 3. Head of Family (not rejected)
          // 4. Any not rejected
          const bestDoc = docs.find(d => d.verificationStatus === 'ADMIN_APPROVED' && d.familyStatus === 'Kepala Keluarga') ||
                          docs.find(d => d.verificationStatus === 'ADMIN_APPROVED') ||
                          docs.find(d => d.familyStatus === 'Kepala Keluarga' && d.verificationStatus !== 'REJECTED') ||
                          docs.find(d => !['PENDING', 'REJECTED'].includes(d.verificationStatus)) ||
                          docs[0];
          
          setUserCitizenData(bestDoc);
          if (!isOfficialMemberOf) {
            unsubLetters = onSnapshot(query(collection(db, 'letters'), where('userId', '==', user.uid), where('status', '==', 'PENDING')), (lettersSnap) => {
                setStats(prev => ({ ...prev, pendingLetters: lettersSnap.size }));
            }, (error) => {
               handleFirestoreError(error, OperationType.LIST, 'letters');
            });
            unsubComplaints = onSnapshot(query(collection(db, 'complaints'), where('authorId', '==', user.uid), where('status', '==', 'PENDING')), (complaintSnap) => {
                 setStats(prev => ({ ...prev, activeComplaints: complaintSnap.size }));
            }, (error) => {
               handleFirestoreError(error, OperationType.LIST, 'complaints');
            });
          }
        }
        setLoading(false);
      }, (error) => {
         handleFirestoreError(error, OperationType.LIST, 'citizens');
         setLoading(false);
      }
    );
    return () => { unsubCitizens(); unsubPending(); unsubLetters(); unsubComplaints(); unsubUserData(); };
  }, [user, profile]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 p-8 lg:p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Activity className="w-64 h-64" />
         </div>
         
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-[2px] bg-indigo-500 rounded-full" />
               <span className="text-xs font-bold tracking-[0.2em] text-indigo-200 uppercase">{isOfficial ? 'PANEL KENDALI' : 'PUSAT DATA TERPADU'}</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
               {getTimeGreeting()}, <span className="text-indigo-400">{profile?.fullName?.split(' ')[0]?.toUpperCase() || user?.email?.split('@')[0].toUpperCase()}!</span>
            </h1>
            
            <p className="text-indigo-100/80 text-lg max-w-xl mb-10 leading-relaxed font-medium">
               {getSubtext()}
            </p>
            
            {!isOfficial && (
               <div className="flex flex-wrap items-center gap-4">
                  <button 
                     onClick={() => !userCitizenData || userCitizenData.verificationStatus !== 'ADMIN_APPROVED' ? alert('Harap lengkapi dan tunggu verifikasi Data Warga Anda terlebih dahulu sebelum menggunakan layanan ini.') : setActiveTab('Layanan Surat')}
                     className={`${!userCitizenData || userCitizenData.verificationStatus !== 'ADMIN_APPROVED' ? 'bg-slate-500/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'} text-white px-8 py-3.5 rounded-2xl font-bold tracking-wide transition-all flex items-center gap-2`}
                  >
                     Ajukan Surat Digital <ArrowUpRight className="w-5 h-5" />
                  </button>
                  <button 
                     className="bg-white/5 hover:bg-white/10 text-white px-8 py-3.5 rounded-2xl font-bold tracking-wide transition-all border border-white/10 backdrop-blur-md flex items-center gap-2"
                  >
                     Informasi Desa <Bell className="w-5 h-5 ml-1" />
                  </button>
               </div>
            )}
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6">
               {getStats().map((item, idx) => (
                  <motion.div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                     <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 mb-4`}>
                        <item.icon className="w-6 h-6" />
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                     <h3 className="text-3xl font-extrabold text-slate-900">{item.value.toLocaleString()}</h3>
                  </motion.div>
               ))}
               {isCitizen && (
                  <motion.div 
                    onClick={() => setActiveTab('Keluarga')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer hover:border-indigo-200 transition-all group"
                  >
                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Anggota Keluarga</p>
                     <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-extrabold text-slate-900">Kelola</h3>
                        <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                     </div>
                  </motion.div>
               )}
            </div>

            {!isOfficial ? (
               <div className="space-y-8">
                  {/* Hidden temporarily as requested */}
                  {/* {userCitizenData?.verificationStatus === 'ADMIN_APPROVED' && (
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                           <CreditCard className="w-5 h-5 text-blue-600" /> Kartu Warga Digital
                        </h3>
                        <CitizenCard citizen={userCitizenData} />
                     </div>
                  )} */}
                  
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Status Verifikasi Data</h3>
                     </div>
                     {!userCitizenData ? (
                        <div className="py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-center">
                            <p className="text-slate-900 font-bold mb-2">Basis Data Belum Ditemukan</p>
                            <p className="text-slate-500 text-sm">Anda belum mengisi form perekaman data warga.</p>
                        </div>
                     ) : (
                        <div className="space-y-12">
                          {/* Progress Stepper */}
                          <div className="relative px-8">
                             <div className="absolute top-5 left-8 right-8 h-[2px] bg-slate-100 -z-0" />
                             <div className="flex justify-between relative z-10">
                                 {[
                                  { label: 'WARGA', status: ['PENDING', 'RT_APPROVED', 'RW_APPROVED', 'KADUS_APPROVED', 'ADMIN_APPROVED'] },
                                  { label: 'RT', status: ['RT_APPROVED', 'RW_APPROVED', 'KADUS_APPROVED', 'ADMIN_APPROVED'] },
                                  { label: 'RW', status: ['RW_APPROVED', 'KADUS_APPROVED', 'ADMIN_APPROVED'] },
                                  { label: 'KADUS', status: ['KADUS_APPROVED', 'ADMIN_APPROVED'] },
                                  { label: 'DESA', status: ['ADMIN_APPROVED'] }
                                ].map((step, idx) => {
                                  const isDone = step.status.includes(userCitizenData.verificationStatus);
                                  const isCurrent = !isDone && (
                                    (idx === 1 && userCitizenData.verificationStatus === 'PENDING') ||
                                    (idx === 2 && userCitizenData.verificationStatus === 'RT_APPROVED') ||
                                    (idx === 3 && userCitizenData.verificationStatus === 'RW_APPROVED') ||
                                    (idx === 4 && userCitizenData.verificationStatus === 'KADUS_APPROVED')
                                  );

                                  return (
                                    <div key={idx} className="flex flex-col items-center gap-3">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all ${
                                          isDone ? 'bg-indigo-600 text-white' : 
                                          isCurrent ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-300'
                                       }`}>
                                          {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                       </div>
                                       <span className={`text-[10px] font-extrabold tracking-widest ${isDone ? 'text-indigo-600' : 'text-slate-400'}`}>
                                          {step.label}
                                       </span>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>

                          {/* Status Message Box */}
                          <div className={`p-6 rounded-[2rem] border flex items-center justify-between transition-all ${
                             userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'bg-emerald-50 border-emerald-100' :
                             userCitizenData.verificationStatus === 'REJECTED' ? 'bg-red-50 border-red-100' :
                             'bg-indigo-50/50 border-indigo-100/50'
                          }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                                   userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'bg-emerald-500 text-white' :
                                   userCitizenData.verificationStatus === 'REJECTED' ? 'bg-red-500 text-white' :
                                   'bg-indigo-600 text-white'
                                }`}>
                                   {userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? <ShieldCheck className="w-6 h-6" /> : 
                                    userCitizenData.verificationStatus === 'REJECTED' ? <AlertCircle className="w-6 h-6" /> :
                                    <Activity className="w-6 h-6" />}
                                </div>
                                <div>
                                   <h4 className={`text-lg font-extrabold tracking-tight ${
                                      userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'text-emerald-900' :
                                      userCitizenData.verificationStatus === 'REJECTED' ? 'text-red-900' :
                                      'text-indigo-950'
                                   }`}>
                                      {userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'Dokumen Aktif & Terverifikasi' :
                                       userCitizenData.verificationStatus === 'REJECTED' ? 'Data Perlu Perbaikan' :
                                       'Sedang Dalam Proses Audit'}
                                   </h4>
                                   <p className={`text-xs font-medium opacity-70`}>
                                      {userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? `Terakhir diperbarui ${new Date(userCitizenData.updatedAt).toLocaleDateString('id-ID')}` :
                                       userCitizenData.verificationStatus === 'REJECTED' ? 'Klik untuk melihat catatan perbaikan dari petugas.' :
                                       'Tim verifikator sedang meninjau kelengkapan data Anda.'}
                                   </p>
                                </div>
                             </div>
                             <ChevronRight className="w-5 h-5 opacity-30" />
                          </div>
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-8">Antrean Prioritas</h3>
                  {/* ... quick queue ... */}
               </div>
            )}
         </div>

         <div className="space-y-8">
            {/* ... Sidebar ... */}
         </div>
      </div>
    </div>
  );
}
