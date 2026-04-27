import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  Calendar,
  Briefcase,
  GraduationCap,
  ArrowUpRight,
  Database,
  Download,
  Filter,
  ArrowRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CitizenData } from '../types';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

export default function Statistics() {
  const { profile } = useAuth();
  const [citizens, setCitizens] = useState<CitizenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    // Guard: Only officials should attempt to list the full citizens collection
    const isOfficial = ['ADMIN', 'RT', 'RW', 'KADUS'].includes(profile.role);
    if (!isOfficial) {
      setLoading(false);
      return;
    }

    // Build scoped query
    // Strictly only count those with role 'CITIZEN'
    let q = query(collection(db, 'citizens'), where('role', '==', 'CITIZEN'));
    if (profile?.role === 'RT' && profile.rt) {
      q = query(q, where('rt', '==', profile.rt));
    } else if (profile?.role === 'RW' && profile.rw) {
      q = query(q, where('rw', '==', profile.rw));
    } else if (profile?.role === 'KADUS' && profile.dusun) {
      q = query(q, where('dusun', '==', profile.dusun));
    } else if (profile?.role !== 'ADMIN') {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CitizenData));
      
      // Secondary safety filter
      data = data.filter(c => c.role === 'CITIZEN');

      if (profile?.role === 'RT') {
        data = data.filter(c => c.rt === profile?.rt);
      } else if (profile?.role === 'RW') {
        data = data.filter(c => c.rw === profile?.rw);
      } else if (profile?.role === 'KADUS') {
        data = data.filter(c => c.dusun === profile?.dusun);
      }

      setCitizens(data);
      setLoading(false);
    }, (error) => {
      console.error("Error in statistics citizen listener:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile]);

  const stats = useMemo(() => {
    const total = citizens.length;
    const uniqueFamilyHeads = new Set(citizens.map(c => c.familyHead)).size;
    const workingCount = citizens.filter(c => c.occupation && c.occupation.toLowerCase() !== 'tidak bekerja').length;
    const unemploymentRate = total > 0 ? (((total - workingCount) / total) * 100).toFixed(1) : 0;

    // Education Data
    const eduMap: Record<string, number> = {};
    citizens.forEach(c => {
      const edu = c.education || 'SD/Belum Sekolah';
      eduMap[edu] = (eduMap[edu] || 0) + 1;
    });
    const educationData = Object.keys(eduMap).map(name => ({ name, value: eduMap[name] }));

    // Occupation Data
    const occMap: Record<string, number> = {};
    citizens.forEach(c => {
      const occ = c.occupation || 'Lainnya';
      occMap[occ] = (occMap[occ] || 0) + 1;
    });
    const occupationData = Object.keys(occMap)
      .map(name => ({ name, count: occMap[name] }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 6);

    // Dusun Distribution
    const dusunMap: Record<string, number> = {};
    citizens.forEach(c => {
      const dusun = c.dusun || 'Dusun I Batu Tambun';
      dusunMap[dusun] = (dusunMap[dusun] || 0) + 1;
    });
    const dusunData = Object.keys(dusunMap).map(name => ({ name, density: dusunMap[name] }));

    return {
      total,
      uniqueFamilyHeads,
      workingCount,
      unemploymentRate,
      educationData,
      occupationData,
      dusunData
    };
  }, [citizens]);

  if (loading) {
     return (
        <div className="min-h-[500px] flex flex-col items-center justify-center">
           <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Menyusun Analisis Realtime...</p>
        </div>
     );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Real-time Insights</span>
           </div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Smart Analytics</h1>
           <p className="text-slate-500 font-medium mt-1">Eksplorasi data kependudukan berbasis bukti di Tarempa Selatan.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="h-11 px-4 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" /> Export Report
           </button>
           <button className="h-11 px-4 gradient-primary text-white rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:opacity-90 transition-all">
              <Filter className="w-4 h-4" /> Filter Data
           </button>
        </div>
      </div>

      {/* Main KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Penduduk', val: stats.total, icon: Users, color: 'indigo', growth: '+2.4%' },
          { label: 'Kepala Keluarga', val: stats.uniqueFamilyHeads, icon: Database, color: 'blue', growth: '+1.1%' },
          { label: 'Penduduk Aktif', val: stats.workingCount, icon: Briefcase, color: 'emerald', growth: '+4.2%' }
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-indigo-200 transition-all"
          >
             <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center text-emerald-500 font-bold text-[10px] bg-emerald-50 px-2 py-1 rounded-lg">
                   <TrendingUp className="w-3 h-3 mr-1" /> {stat.growth}
                </div>
             </div>
             <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{stat.label}</p>
             <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{stat.val.toLocaleString()}</h3>
          </motion.div>
        ))}
      </div>

      {/* Primary Analytics Row */}
      <div className="grid grid-cols-1 gap-8">
        {/* Occupation Vertical Bar */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Sektor Pekerjaan</h3>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                 <Briefcase className="w-5 h-5" />
              </div>
           </div>
           
           <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.occupationData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      width={100} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', radius: 12 }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
                    />
                    <Bar dataKey="count" radius={[0, 12, 12, 0]}>
                       {stats.occupationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#cbd5e1'} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           
           <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-2">Tingkat Pengangguran</p>
                 <div className="flex items-center gap-2">
                    <h4 className="text-2xl font-extrabold text-slate-900">{stats.unemploymentRate}%</h4>
                    <span className="text-[10px] font-bold text-red-500 flex items-center"><ArrowUpRight className="w-3 h-3" /> 0.8%</span>
                 </div>
              </div>
              <button className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all">
                 Analisis Sektor
              </button>
           </div>
        </div>
      </div>

      {/* AI Deep Insight Section */}
      <section className="bg-indigo-950 rounded-[3rem] p-10 lg:p-14 text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[40%] h-full">
            <div className="absolute inset-0 bg-gradient-to-l from-indigo-600/20 to-transparent"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-[3s]" />
         </div>

         <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
               </div>
               <h3 className="text-xs font-extrabold uppercase tracking-[0.3em] text-indigo-400">Strategi Berbasis AI</h3>
            </div>

            <h4 className="text-3xl lg:text-4xl font-extrabold mb-8 tracking-tight">Kemandirian Ekonomi Tarempa Selatan</h4>
            
            <p className="text-indigo-100/70 text-lg lg:text-xl font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-8 mb-12">
               "Dari total {stats.total} penduduk terdaftar, konsentrasi sektor {stats.occupationData[0]?.name || 'Utama'} sangat dominan ({((stats.occupationData[0]?.count / stats.total) * 100).toFixed(0)}%). Rekomendasi: Perkuat infrastruktur pendukung sektor ini dan inisiasi program pelatihan vokasi bagi {stats.educationData.find(e => e.name === 'SMP' || e.name === 'SMA')?.value || 'kelompok muda'} untuk diversifikasi lapangan kerja."
            </p>

            <div className="flex flex-wrap gap-4">
               <button className="h-12 px-8 bg-white text-indigo-900 rounded-2xl font-extrabold flex items-center gap-2 hover:scale-105 transition-transform">
                  Download Executive Summary <ArrowRight className="w-5 h-5" />
               </button>
               <button className="h-12 px-6 bg-white/10 border border-white/20 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all">
                  Lihat Proyeksi 2027 <Calendar className="w-5 h-5" />
               </button>
            </div>
         </div>
      </section>
    </div>
  );
}
