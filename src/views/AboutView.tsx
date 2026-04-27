import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Info, BookOpen, Users } from 'lucide-react';

export default function AboutView({ onBack }: { onBack: () => void }) {
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
        <Info className="text-indigo-600" /> Tentang Aplikasi
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <p className="text-slate-600 leading-relaxed">
          <strong>SIM-DTS</strong> (Sistem Informasi Manajemen Desa Tarempa Selatan) adalah platform layanan digital terpadu yang dirancang untuk memudahkan warga dalam mengakses layanan administrasi desa.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Tujuan utama kami adalah meningkatkan efisiensi, transparansi, dan transparansi pelayanan publik di wilayah Desa Tarempa Selatan melalui teknologi.
        </p>
        <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4"/> Fitur Utama:</h3>
            <ul className="text-slate-600 text-sm space-y-2 list-disc list-inside">
                <li>Pengajuan surat digital</li>
                <li>Sistem keluhan warga</li>
                <li>Informasi dan statistik desa</li>
                <li>Profil warga terintegrasi</li>
            </ul>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-6 text-sm text-slate-500">
            <p>Versi Aplikasi: <strong>V.1</strong></p>
            <p>Developer: <strong>AZMAN 204</strong></p>
        </div>
      </div>
    </motion.div>
  );
}
