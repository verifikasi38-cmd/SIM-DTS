import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  MapPin, 
  CheckCircle2,
  Building2,
  Globe,
  Info,
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function AuthView() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginWithEmail, registerWithEmail, login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!isRegister) {
        await loginWithEmail(email, password);
      } else {
        if (!fullName) throw new Error('Nama lengkap wajib diisi');
        await registerWithEmail(email, password, fullName);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan autentikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-hidden">
      {/* Visual Side Container */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-3xl"></div>
           <div className="absolute bottom-[-5%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-lg text-white">
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-8 w-16 h-16 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-white"
           >
              <img src="https://cdn.phototourl.com/free/2026-04-26-e061c39c-4482-4062-9346-6450b90a83a7.png" alt="Logo" className="w-full h-full object-cover" />
           </motion.div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-5xl font-extrabold leading-tight mb-4"
           >
             SIM-DTS
           </motion.h1>
           
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="inline-block px-4 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white/90 text-sm font-medium mb-6"
           >
             Smart Village Integrated Digital Governance Platform
           </motion.div>
           
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="text-xl text-blue-100/80 leading-relaxed mb-12 font-medium"
           >
             Sistem Informasi Manajemen Data Desa Tarempa Selatan. Mewujudkan tata kelola desa berbasis data realtime, cepat, dan transparan.
           </motion.p>
           
           <div className="space-y-6">
              {[
                { icon: CheckCircle2, text: "Integrasi Pelayanan RT hingga Desa" },
                { icon: Globe, text: "Dashboard Statistik Kependudukan Realtime" },
                { icon: Building2, text: "Pusat Data dan Pelayanan Digital Terpadu" }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                  className="flex items-center gap-4 text-white/90"
                >
                   <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-emerald-400" />
                   </div>
                   <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
           </div>
        </div>
      </div>

      {/* Form Side Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-100 flex-shrink-0">
                <img src="https://cdn.phototourl.com/free/2026-04-26-e061c39c-4482-4062-9346-6450b90a83a7.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">SIM-DTS</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Digital Governance</p>
             </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 font-display">
              {!isRegister ? 'Selamat Datang' : 'Pendaftaran Warga'}
            </h2>
            <p className="text-slate-500 font-medium">
              {!isRegister 
                ? 'Masuk ke dalam ekosistem digital Desa Tarempa Selatan' 
                : 'Buat identitas digital Anda untuk pelayanan yang lebih cepat'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 mb-4"
                >
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap Sesuai KTP</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Shield className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                  placeholder="nama@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                {!isRegister && (
                  <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Lupa Sandi?</button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-50 rounded-2xl flex items-center gap-2 text-red-600 text-xs font-medium border border-red-100 mt-2"
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-indigo-100 mt-6 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {!isRegister ? (
                    <>Masuk ke SIM-DTS <LogIn className="w-5 h-5" /></>
                  ) : (
                    <>Daftar Sekarang <UserPlus className="w-5 h-5" /></>
                  )}
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#f8fafc] px-3 text-slate-400 font-bold">Atau gunakan Google</span></div>
          </div>

          <button
            type="button"
            onClick={() => login()}
            className="w-full h-12 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
            Masuk dengan Google
          </button>

          <p className="text-center mt-10 text-slate-500 font-medium text-sm">
            {!isRegister ? 'Belum punya akun warga?' : 'Sudah terdaftar di sistem?'}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="ml-2 text-indigo-600 font-extrabold hover:underline"
            >
              {!isRegister ? 'Daftar Disini' : 'Masuk Disini'}
            </button>
          </p>

          <footer className="mt-12 text-center">
             <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                Pemerintah Desa Tarempa Selatan © 2026
             </p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
