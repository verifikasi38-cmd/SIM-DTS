import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Smartphone, Download } from 'lucide-react';

export default function InstallView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 max-w-md mx-auto min-h-screen bg-slate-50"
    >
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-5 h-5" /> Kembali
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
        <Smartphone className="text-indigo-600" /> Cara Instal Aplikasi
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h4 className="text-lg font-bold text-indigo-900 mb-3">Pasang Aplikasi di HP</h4>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Ingin akses lebih cepat dan praktis? Anda dapat menginstal aplikasi ini langsung ke layar utama ponsel Anda:
        </p>
        
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full font-bold text-xs mt-0.5">1</div>
                <p className="text-sm text-slate-600">Buka aplikasi ini melalui browser ponsel Anda (Chrome/Safari).</p>
            </div>
            <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full font-bold text-xs mt-0.5">2</div>
                <p className="text-sm text-slate-600">Klik menu browser (bintik tiga di pojok kanan atas untuk Android, atau ikon Share untuk iOS).</p>
            </div>
            <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full font-bold text-xs mt-0.5">3</div>
                <p className="text-sm text-slate-600">Pilih <strong className="text-slate-900">"Tambahkan ke layar utama"</strong> atau <strong className="text-slate-900">"Install Aplikasi"</strong>.</p>
            </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-indigo-600 border border-indigo-200 bg-indigo-50 p-4 rounded-xl font-bold text-sm">
        <Download className="w-4 h-4" /> Ikuti langkah di atas untuk instal sekarang
      </div>
    </motion.div>
  );
}
