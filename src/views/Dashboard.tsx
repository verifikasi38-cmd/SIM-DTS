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
  ArrowRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { CitizenData } from '../types';

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

  // Hero section subtext based on role
  const getSubtext = () => {
    if (isCitizen) return 'Pantau status permohonan surat, layanan bantuan, dan update data keluarga Anda secara mandiri.';
    if (isLocalOfficial) return `Panel kendali operasional digital untuk ${profile?.role} ${profile?.role === 'RT' ? profile.rt : profile?.role === 'RW' ? profile.rw : profile?.dusun}.`;
    return 'Panel kendali administrasi terpusat untuk seluruh wilayah desa.';
  };

  // Stats selection based on role
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

    const isOfficial = ['ADMIN', 'RT', 'RW', 'KADUS'].includes(profile.role);
    const isLocalOfficial = ['RT', 'RW', 'KADUS'].includes(profile.role);

    let unsubCitizens = () => {};
    let unsubPending = () => {};
    let unsubLetters = () => {};
    let unsubComplaints = () => {};

    if (isOfficial) {
      unsubCitizens = onSnapshot(collection(db, 'citizens'), (snapshot) => {
        let docs = snapshot.docs.map(d => d.data() as CitizenData);
        // Strictly count only those with CITIZEN role as per user request
        docs = docs.filter(d => d.role === 'CITIZEN');

        // If local official, filter by their scope
        if (profile?.role === 'RT') {
          docs = docs.filter(d => d.rt === profile.rt);
        } else if (profile?.role === 'RW') {
          docs = docs.filter(d => d.rw === profile.rw);
        } else if (profile?.role === 'KADUS') {
          docs = docs.filter(d => d.dusun === profile.dusun);
        }
        
        setStats(prev => ({ ...prev, citizens: docs.length }));
      }, (error) => {
        console.error("Error in citizens listener:", error);
      });

      // Determine what status this official needs to verify
      let targetStatus = 'PENDING';
      if (profile?.role === 'RW') targetStatus = 'RT_APPROVED';
      else if (profile?.role === 'ADMIN' || profile?.role === 'KADUS') targetStatus = 'RW_APPROVED';

      unsubPending = onSnapshot(
        query(collection(db, 'citizens'), where('verificationStatus', '==', targetStatus)),
        (snapshot) => {
          let docs = snapshot.docs.map(d => d.data() as CitizenData);
          // Strictly count only those with CITIZEN role as per user request
          docs = docs.filter(d => d.role === 'CITIZEN');

          if (profile?.role === 'RT') {
            docs = docs.filter(d => d.rt === profile.rt);
          } else if (profile?.role === 'RW') {
            docs = docs.filter(d => d.rw === profile.rw);
          } else if (profile?.role === 'KADUS') {
            docs = docs.filter(d => d.dusun === profile.dusun);
          }

          setStats(prev => ({ ...prev, pendingVerifications: docs.length }));
        }, (error) => {
          console.error("Error in pending citizens listener:", error);
        }
      );

      unsubLetters = onSnapshot(
        query(collection(db, 'letters'), where('status', '==', 'PENDING')),
        (snapshot) => {
          setStats(prev => ({ ...prev, pendingLetters: snapshot.size }));
        }, (error) => {
          console.error("Error in pending letters listener:", error);
        }
      );

      unsubComplaints = onSnapshot(
        query(collection(db, 'complaints'), where('status', '==', 'PENDING')),
        (snapshot) => {
          setStats(prev => ({ ...prev, activeComplaints: snapshot.size }));
        }, (error) => {
          console.error("Error in complaints listener:", error);
        }
      );
    }

    // Listen to current user's citizen data
    const unsubUserData = onSnapshot(
      query(collection(db, 'citizens'), where('userId', '==', user.uid), limit(1)),
      (snapshot) => {
        if (!snapshot.empty) {
          const cData = snapshot.docs[0].data() as CitizenData;
          setUserCitizenData(cData);
          
          if (!isOfficial) {
            // Citizen specific queries using their citizenData
            unsubLetters = onSnapshot(
              query(collection(db, 'letters'), where('userId', '==', user.uid), where('status', '==', 'PENDING')),
              (lettersSnap) => {
                setStats(prev => ({ ...prev, pendingLetters: lettersSnap.size }));
              }, (error) => {
                console.error("Error in letters listener:", error);
              }
            );

            unsubComplaints = onSnapshot(
               query(collection(db, 'complaints'), where('authorId', '==', user.uid), where('status', '==', 'PENDING')),
               (complaintSnap) => {
                 setStats(prev => ({ ...prev, activeComplaints: complaintSnap.size }));
               }, (error) => {
                 console.error("Error in complaints listener:", error);
               }
            );
          }
        } else {
          setUserCitizenData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error in user data listener:", error);
      }
    );

    return () => {
      unsubCitizens();
      unsubPending();
      unsubLetters();
      unsubComplaints();
      unsubUserData();
    };
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
      {/* Premium Hero Banner */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 p-8 lg:p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 w-1/2 h-full">
            <div className="absolute inset-0 bg-gradient-to-l from-indigo-900/50 to-transparent"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[120%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
            <Activity className="absolute bottom-[-20%] right-[-5%] w-64 h-64 text-white/5" />
         </div>

         <div className="relative z-10 max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-6"
            >
               <span className="w-8 h-[2px] bg-indigo-500 rounded-full"></span>
               <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-indigo-400">Pusat Data Terpadu</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight tracking-tight"
            >
              {getTimeGreeting()}, <span className="text-indigo-400">{profile?.fullName.split(' ')[0]}!</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-indigo-100/70 text-lg lg:text-xl font-medium leading-relaxed max-w-xl"
            >
              {getSubtext()}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-4"
            >
               {!isOfficial && (
                 <button className="h-12 px-8 gradient-primary text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-900/40 hover:scale-105 transition-transform">
                   Ajukan Surat Digital <ArrowUpRight className="w-5 h-5" />
                 </button>
               )}
               <button className="h-12 px-6 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-white/20 transition-all">
                 Informasi Desa <Bell className="w-5 h-5" />
               </button>
            </motion.div>
         </div>
      </section>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            
            {/* Main Operational Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-6">
               {getStats().map((item, idx) => (
                 <motion.div 
                   key={idx}
                   whileHover={{ y: -5 }}
                   className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40"
                 >
                    <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 mb-4`}>
                       <item.icon className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <div className="flex items-end gap-2">
                       <h3 className="text-3xl font-extrabold text-slate-900">{item.value.toLocaleString()}</h3>
                    </div>
                 </motion.div>
               ))}
            </div>

            {/* Role Specific Actions/Status */}
            {!isOfficial ? (
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Status Verifikasi Data</h3>
                        <p className="text-sm text-slate-400 font-medium">Lacak perjalanan audit data kependudukan Anda.</p>
                     </div>
                     {!userCitizenData && (
                        <button className="h-10 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">
                           Lengkapi Sekarang
                        </button>
                     )}
                  </div>

                  {!userCitizenData ? (
                     <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 text-slate-300">
                            <Layers className="w-8 h-8" />
                         </div>
                         <p className="text-slate-900 font-bold">Basis Data Belum Ditemukan</p>
                         <p className="text-xs text-slate-500 mt-2 max-w-xs text-center leading-relaxed">
                            Formulir kependudukan digital belum terisi. Segera isi data diri Anda untuk membuka akses layanan surat pintar.
                         </p>
                     </div>
                  ) : (
                     <div className="space-y-8">
                        {/* Stepper Progres */}
                        <div className="relative flex items-center justify-between px-2">
                           <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
                           
                           {['Warga', 'RT', 'RW', 'Desa'].map((step, idx) => {
                              const stages = ['PENDING', 'RT_APPROVED', 'RW_APPROVED', 'ADMIN_APPROVED'];
                              const currentIdx = stages.indexOf(userCitizenData.verificationStatus);
                              const isCompleted = idx <= currentIdx;
                              const isActive = idx === (currentIdx === -1 ? 0 : currentIdx);

                              return (
                                 <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all ${
                                       isCompleted ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                                    }`}>
                                       {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                                       {step}
                                    </span>
                                 </div>
                              );
                           })}
                        </div>
                        
                        <div className={`p-4 rounded-2xl flex items-center gap-4 ${
                           userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'bg-emerald-50 border border-emerald-100' : 'bg-indigo-50 border border-indigo-100'
                        }`}>
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                           }`}>
                              <ShieldCheck className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                              <p className={`text-sm font-bold ${userCitizenData.verificationStatus === 'ADMIN_APPROVED' ? 'text-emerald-900' : 'text-indigo-900'}`}>
                                 {userCitizenData.verificationStatus === 'RT_APPROVED' && 'Menunggu Persetujuan RW'}
                                 {userCitizenData.verificationStatus === 'RW_APPROVED' && 'Dalam Proses Validasi Desa'}
                                 {userCitizenData.verificationStatus === 'ADMIN_APPROVED' && 'Dokumen Aktif & Terverifikasi'}
                                 {userCitizenData.verificationStatus === 'PENDING' && 'Antrean Verifikasi Tingkat RT'}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">Terakhir diperbarui {new Date(userCitizenData.updatedAt).toLocaleDateString('id-ID')}</p>
                           </div>
                           <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                              <ChevronRight className="w-5 h-5" />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            ) : (
               /* Official Specific: Quick Queue */
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                   <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Antrean Prioritas</h3>
                        <p className="text-sm text-slate-400 font-medium">Segera tindak lanjuti permintaan warga di wilayah Anda.</p>
                     </div>
                     <button className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline">
                        Buka Semua <ArrowRight className="w-3 h-3" />
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div 
                        onClick={() => setActiveTab('Data Warga')}
                        className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 group cursor-pointer hover:bg-white hover:border-indigo-200 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                           <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-slate-900 leading-none mb-1.5">Validasi Warga</h4>
                           <p className="text-xs text-slate-500 font-medium"><span className="text-indigo-600 font-extrabold">{stats.pendingVerifications}</span> pending</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                     </div>

                     <div 
                        onClick={() => setActiveTab('Layanan Surat')}
                        className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 group cursor-pointer hover:bg-white hover:border-blue-200 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                           <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-slate-900 leading-none mb-1.5">Izin & Surat</h4>
                           <p className="text-xs text-slate-500 font-medium"><span className="text-blue-600 font-extrabold">{stats.pendingLetters}</span> pending</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* Sidebar Info/Events */}
         <div className="space-y-8">
            {/* Village Mini Map / Location */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden relative">
               <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-indigo-50 rounded-full blur-3xl"></div>
               <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-6">Warta Desa</h3>
               
               <div className="space-y-6">
                  {[
                    { date: '25 Apr', title: 'Rapat RT Bulanan', type: 'Kegiatan' },
                    { date: '28 Apr', title: 'Penyaluran BLT-DD', type: 'Bantuan' },
                    { date: '02 Mei', title: 'Vaksinasi Door-to-Door', type: 'Kesehatan' }
                  ].map((event, i) => (
                    <div key={i} className="flex gap-4 relative group cursor-pointer">
                       <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                             <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{event.date.split(' ')[1]}</span>
                             <span className="text-sm font-extrabold text-slate-900 leading-none">{event.date.split(' ')[0]}</span>
                          </div>
                          {i !== 2 && <div className="w-px h-full bg-slate-100 my-2"></div>}
                       </div>
                       <div className="pt-1">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.type}</span>
                       </div>
                    </div>
                  ))}
               </div>
               
               <button className="w-full mt-10 h-12 bg-slate-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                  Lihat Kalender <Calendar className="w-4 h-4" />
               </button>
            </div>

            {/* AI Insights Tip */}
            <div className="gradient-primary p-8 rounded-[2.5rem] text-white/90 relative overflow-hidden group">
               <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white">
                     <TrendingUp className="w-5 h-5 font-bold" />
                  </div>
                  <h4 className="font-extrabold text-white tracking-widest uppercase text-[10px]">AI Insight</h4>
               </div>
               <p className="text-sm font-medium leading-relaxed italic mb-6">
                  "Tren permohonan surat meningkat 15% minggu ini. Pastikan stok tanda tangan digital Anda sudah terbarui."
               </p>
               <button className="text-white font-bold text-xs flex items-center gap-2 group/btn">
                  Lihat Analisis Detail <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
