import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Users, Shield, CheckCircle2 } from 'lucide-react';

export default function SplashView({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-between p-8 text-slate-800"
    >
        <div className="flex-1 flex flex-col items-center justify-center">
            {/* Logo placeholder */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 w-32 h-32 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center bg-white"
            >
                <img src="https://cdn.phototourl.com/free/2026-04-26-e061c39c-4482-4062-9346-6450b90a83a7.png" alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h1 className="text-5xl font-extrabold text-blue-900 mb-1">
                SIM-DTS
              </h1>
              <p className="text-blue-600 font-semibold uppercase tracking-widest text-sm mb-6">
                SISTEM INFORMASI MANAJEMEN
              </p>
              <h2 className="text-2xl font-bold text-slate-800 mb-8">
                DATA TAREMPA SELATAN
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mb-8 bg-blue-900 text-white p-4 rounded-2xl">
                {[
                { icon: Users, text: "DATA AKURAT" },
                { icon: Shield, text: "PELAYANAN CEPAT" },
                { icon: CheckCircle2, text: "DESA DIGITAL" }
                ].map((item, idx) => (
                <motion.div 
                    key={idx}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    className="flex flex-col items-center gap-2 text-center"
                >
                    <item.icon className="w-6 h-6 text-blue-300" />
                    <span className="font-bold text-[10px]">{item.text}</span>
                </motion.div>
                ))}
            </div>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-slate-500 italic font-medium"
            >
              MELAYANI DENGAN HATI, MEMBANGUN DESA NEGERI
            </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-2 mb-8"
        >
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-600">Memuat aplikasi...</span>
        </motion.div>
    </motion.div>
  );
}
