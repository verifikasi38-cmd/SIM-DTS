import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, HelpCircle, MessageCircle, Send } from 'lucide-react';

export default function HelpView({ onBack }: { onBack: () => void }) {
  const whatsappNumber = "6281261089400";
  const message = "Halo Admin, saya butuh bantuan terkait aplikasi layanan desa.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

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
        <HelpCircle className="text-indigo-600" /> Pusat Bantuan
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Butuh Bantuan?</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Jika Anda mengalami kendala saat menggunakan aplikasi atau memiliki pertanyaan lebih lanjut, silakan hubungi tim admin kami melalui WhatsApp.
            </p>
          </div>
          
          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-bold text-slate-900 mb-4">Penjelasan Peran Akun</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p><strong>Admin Desa:</strong> Akses penuh untuk manajemen seluruh data desa, verifikasi akhir, dan konfigurasi sistem.</p>
              <p><strong>Kadus (Kepala Dusun):</strong> Mengelola data dan memverifikasi pengajuan layanan dalam lingkup dusun.</p>
              <p><strong>RW (Rukun Warga):</strong> Melakukan pengawasan dan verifikasi data dalam lingkup RW.</p>
              <p><strong>RT (Rukun Tetangga):</strong> Mengelola data warga dan pengajuan layanan awal dalam lingkup RT.</p>
              <p><strong>Warga:</strong> Mengakses layanan mandiri, mengajukan surat, dan memantau status pengajuan.</p>
            </div>
          </div>
      </div>
      
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold hover:bg-[#1DA851] transition-colors shadow-lg shadow-[#25D366]/20"
      >
        <MessageCircle className="w-6 h-6" /> Hubungi Admin via WhatsApp
      </a>
    </motion.div>
  );
}
