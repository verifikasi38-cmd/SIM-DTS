import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  MapPin, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ShieldAlert,
  ChevronRight,
  Info,
  Loader2,
  Camera,
  Layers,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

interface Complaint {
  id: string; // Made id required since we always get it from Firestore
  authorId: string;
  userName: string;
  category: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  target: 'RT' | 'RW' | 'KADUS' | 'DESA';
  createdAt: string;
}

export default function ComplaintSystem() {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  // ... rest of state ...
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    category: 'INFRASTRUCTURE',
    description: '',
    priority: 'NORMAL' as const,
    target: 'RT' as const
  });

  const categories = [
    { id: 'INFRASTRUCTURE', label: 'Infrastruktur', icon: MapPin, color: 'indigo' },
    { id: 'SECURITY', label: 'Keamanan', icon: ShieldAlert, color: 'red' },
    { id: 'ENVIRONMENT', label: 'Lingkungan', icon: ImageIcon, color: 'emerald' },
    { id: 'SOCIAL', label: 'Sosial', icon: MessageSquare, color: 'blue' },
    { id: 'OTHER', label: 'Lainnya', icon: Info, color: 'slate' }
  ];

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'complaints'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
      setLoading(false);
    }, (error) => {
      console.error("Error in complaints listener:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSubmitting(true);
    
    try {
      await addDoc(collection(db, 'complaints'), {
        authorId: user.uid,
        userName: profile.fullName,
        ...newComplaint,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      setNewComplaint({
        title: '',
        category: 'INFRASTRUCTURE',
        description: '',
        priority: 'NORMAL',
        target: 'RT'
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus laporan ini secara permanen?')) return;
    try {
      await deleteDoc(doc(db, 'complaints', id));
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus laporan.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-10 h-[2px] bg-red-500"></span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.3em]">Smart Complaint</span>
           </div>
           <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">Suara Warga</h1>
           <p className="text-slate-500 font-medium mt-2 max-w-xl">Platform aspirasi dan pengaduan langsung ke lingkungan Anda. Transparan, terukur, dan tertindaklanjuti.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Input Form */}
        <div className="lg:col-span-5">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 static lg:sticky lg:top-28"
           >
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-8">Sampaikan Laporan</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Kategori Masalah</label>
                    <div className="grid grid-cols-2 gap-3">
                       {categories.map(cat => (
                          <button 
                            key={cat.id}
                            type="button"
                            onClick={() => setNewComplaint({...newComplaint, category: cat.id})}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                               newComplaint.category === cat.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 hover:bg-slate-50'
                            }`}
                          >
                             <cat.icon className={`w-5 h-5 ${newComplaint.category === cat.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                             <span className={`text-[10px] font-bold ${newComplaint.category === cat.id ? 'text-indigo-900' : 'text-slate-500'}`}>{cat.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Judul Ringkas</label>
                    <input 
                       type="text" 
                       required
                       value={newComplaint.title}
                       onChange={e => setNewComplaint({...newComplaint, title: e.target.value})}
                       className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold text-sm transition-all" 
                       placeholder="Contoh: Lampu Jalan Mati di RT 02"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Prioritas</label>
                       <select 
                         value={newComplaint.priority}
                         onChange={e => setNewComplaint({...newComplaint, priority: e.target.value as any})}
                         className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs appearance-none"
                       >
                          <option value="NORMAL">Normal</option>
                          <option value="URGENT">Penting</option>
                          <option value="CRITICAL">Mendesak</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Tujuan</label>
                       <select 
                         value={newComplaint.target}
                         onChange={e => setNewComplaint({...newComplaint, target: e.target.value as any})}
                         className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs appearance-none"
                       >
                          <option value="RT">Ketua RT</option>
                          <option value="RW">Ketua RW</option>
                          <option value="KADUS">Dusun</option>
                          <option value="DESA">Pusat Desa</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Kronologi / Penjelasan</label>
                    <textarea 
                       rows={4}
                       required
                       value={newComplaint.description}
                       onChange={e => setNewComplaint({...newComplaint, description: e.target.value})}
                       className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 font-bold text-sm resize-none transition-all" 
                       placeholder="Jelaskan secara detail masalah dan lokasinya agar dapat segera diperiksa..."
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={submitting}
                   className="w-full h-14 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:opacity-90 disabled:opacity-50"
                 >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Kirim Pengaduan</>}
                 </button>
              </form>
           </motion.div>
        </div>

        {/* Right: History List */}
        <div className="lg:col-span-7 space-y-6">
           <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Status Laporan Anda</h3>
              <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                 <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Total: {complaints.length}
              </div>
           </div>

           {loading ? (
             <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
           ) : complaints.length === 0 ? (
             <div className="py-24 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100 border-dashed">
                   <MessageSquare className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 leading-none mb-2">Belum Ada Laporan</h4>
                <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Suara Anda penting untuk kemajuan desa. Jangan ragu untuk melaporkan kendala di sekitar Anda.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {complaints.map((c, i) => (
                   <motion.div 
                     key={c.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-indigo-100 transition-all"
                   >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                         <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
                               c.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : 
                               c.priority === 'URGENT' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                               'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                               {c.priority}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300 font-mono">ID: {c.id?.substring(0, 8).toUpperCase()}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            {profile?.role === 'ADMIN' && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDelete(c.id);
                                 }}
                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 title="Hapus Laporan"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            )}
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${getStatusColor(c.status)}`}>
                               {c.status.replace('_', ' ')}
                            </div>
                         </div>
                      </div>

                      <h4 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{c.title}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                         {c.description}
                      </p>

                      <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Layers className="w-3.5 h-3.5" />
                               </div>
                               <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{c.category}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                               <span className="w-1 h-1 rounded-full bg-current"></span>
                               <span className="text-[10px] font-extrabold uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString('id-ID')}</span>
                            </div>
                         </div>
                         <button className="text-indigo-600 font-extrabold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Lacak Progres <ArrowRight className="w-3.5 h-3.5" />
                         </button>
                      </div>
                   </motion.div>
                ))}
             </div>
           )}
        </div>
      </div>
      
      {/* Policy Footer */}
      <div className="bg-indigo-50/50 p-8 rounded-[3rem] border border-indigo-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
               <Info className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-sm font-extrabold text-indigo-900 tracking-tight leading-none mb-1.5">Layanan Bebas Pungli</h4>
               <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest leading-none">Smart Integrity Governance</p>
            </div>
         </div>
         <p className="text-[11px] text-indigo-400 font-medium max-w-sm text-center md:text-right leading-relaxed">
            Setiap pengaduan akan direkam secara permanen dalam audit log sistem desa untuk menjamin akuntabilitas penyelesaian masalah warga.
         </p>
      </div>
    </div>
  );
}
