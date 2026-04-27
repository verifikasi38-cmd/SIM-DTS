import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Scan, 
  User, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Loader2, 
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  Eye,
  Info,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { CitizenDataService } from '../services/CitizenDataService';
import { CitizenData } from '../types';
import { extractKtpData } from '../services/geminiService';
import { NotificationService } from '../services/NotificationService';
import { resizeImage } from '../lib/imageUtils';
import { OCCUPATIONS } from '../constants/occupations';
import { EDUCATION_LEVELS } from '../constants/education';
import { db } from '../lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';

export default function CitizenDataForm({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [existingData, setExistingData] = useState<CitizenData | null>(null);
  const [formData, setFormData] = useState<Partial<CitizenData>>({
    verificationStatus: 'PENDING',
    socialAssistance: [],
  });
  const [scanning, setScanning] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateStep = (step: number) => {
    const errors: string[] = [];
    if (step === 2) {
      if (!formData.nik || formData.nik.length < 16) errors.push("NIK harus 16 digit");
      if (!formData.name) errors.push("Nama lengkap harus diisi");
      if (!formData.birthPlace) errors.push("Tempat lahir harus diisi");
      if (!formData.birthDate) errors.push("Tanggal lahir harus diisi");
      if (!formData.gender) errors.push("Jenis kelamin harus dipilih");
    }
    if (step === 3) {
      if (!formData.nkk || formData.nkk.length < 16) errors.push("Nomor KK harus 16 digit");
      if (!formData.familyStatus) errors.push("Status dalam keluarga harus dipilih");
      if (!formData.familyHead) errors.push("Nama kepala keluarga harus diisi");
      if (!formData.occupation) errors.push("Pekerjaan harus diisi");
      if (!formData.education) errors.push("Pendidikan terakhir harus diisi");
      if (!formData.address) errors.push("Alamat harus diisi");
      if (!formData.dusun) errors.push("Dusun harus dipilih");
      if (!formData.rt) errors.push("RT harus dipilih");
      if (!formData.rw) errors.push("RW harus dipilih");
    }
    setFormErrors(errors);
    return errors.length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setFormErrors([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user]);

  const loadExistingData = async () => {
    const data = await CitizenDataService.getCitizenByUserId(user!.uid);
    if (data) {
      setExistingData(data);
      setFormData(data);
    }
  };

  const handleKtpScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      // Resize image for mobile efficiency
      const resizedBlob = await resizeImage(file, 1200, 1200);
      const arrayBuffer = await resizedBlob.arrayBuffer();
      const extractedData = await extractKtpData(arrayBuffer, 'image/jpeg');
      
      setFormData(prev => ({
        ...prev,
        nik: extractedData.nik || "",
        name: extractedData.name || "",
        birthPlace: extractedData.birthPlace || "",
        birthDate: extractedData.birthDate || "",
        gender: (extractedData.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
        address: extractedData.address || "",
        rt: extractedData.rt || profile?.rt || "001",
        rw: extractedData.rw || profile?.rw || "002",
        dusun: extractedData.dusun || profile?.dusun || "Dusun I Batu Tambun",
        occupation: extractedData.occupation || "",
      }));
      setCurrentStep(2);
    } catch (error) {
      console.error("Failed to scan KTP:", error);
      alert("Gagal memindai KTP. Pastikan KTP jelas dan coba lagi.");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        userId: user!.uid,
        role: 'CITIZEN', // Always register as 'CITIZEN' in identities collection
      } as Omit<CitizenData, 'id' | 'createdAt' | 'updatedAt'>;

      if (existingData?.id) {
        await CitizenDataService.updateCitizenData(existingData.id, payload as any);
      } else {
        await CitizenDataService.createCitizenData(payload);
        
        // Notify RT
        await NotificationService.sendNotification({
          title: 'Pendataan Warga Baru',
          message: `Warga baru ${formData.name} telah mengirimkan data kependudukan. Mohon verifikasi.`,
          type: 'VERIFICATION',
          targetRole: 'RT',
          targetRt: formData.rt || profile?.rt || '001',
          targetRw: formData.rw || profile?.rw || '001',
          link: '/verification'
        });
      }

      // Update user profile with KK and regional data
      if (formData.nkk) {
        await updateDoc(doc(db, 'users', user!.uid), { 
          kk: formData.nkk, 
          nkk: formData.nkk,
          rt: formData.rt,
          rw: formData.rw,
          dusun: formData.dusun
        });
      }

      setCurrentStep(5); // Success step
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim data. Silakan coba lagi nanti atau hubungi petugas.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Scan KTP', icon: Camera },
    { id: 2, label: 'Identitas', icon: User },
    { id: 3, label: 'Sosial', icon: Users },
    { id: 4, label: 'Kirim', icon: CheckCircle2 }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Premium Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-2.5 gradient-primary rounded-xl text-white shadow-lg shadow-indigo-100">
              <Users className="w-5 h-5" />
           </div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Smart Population</h1>
        </div>
        <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
          Modul pendataan masyarakat cerdas Desa Tarempa Selatan. Data Anda dijamin aman, terenkripsi, dan hanya digunakan untuk keperluan pelayanan publik resmi.
        </p>
      </div>

      {/* Modern Stepper */}
      <div className="flex items-center justify-between mb-12 relative px-4">
        <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 -z-10" />
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <div key={step.id} className="flex flex-col items-center gap-3 group">
              <div 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 border-4 border-white shadow-lg ${
                  isActive ? 'gradient-primary text-white scale-110' : 
                  isDone ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'
                }`}
              >
                <step.icon className={`w-5 h-5 ${isActive || isDone ? 'text-white' : 'text-slate-300'}`} />
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* STEP 1: SCAN KTP */}
          {currentStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 sm:p-12 text-center"
            >
              <div className="relative w-full max-w-[280px] h-[160px] mx-auto mb-8 group overflow-hidden bg-slate-100 rounded-3xl border border-indigo-100 shadow-inner">
                 {/* Scanner Background Decoration */}
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 to-transparent"></div>
                 
                 {scanning ? (
                    <div className="absolute inset-0 bg-indigo-50/80 backdrop-blur-sm flex flex-col items-center justify-center">
                       <motion.div 
                         initial={{ top: 0 }}
                         animate={{ top: '100%' }}
                         transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                         className="absolute left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.8)] z-10"
                       />
                       <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                       <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full">Memindai KTP...</p>
                    </div>
                 ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                       <Scan className="w-12 h-12 mb-3 opacity-50" />
                       <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">AI KTP SCANNER</p>
                    </div>
                 )}

                 {/* Refined Corner decorations */}
                 <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-indigo-400 rounded-tl-3xl"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-indigo-400 rounded-tr-3xl"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-indigo-400 rounded-bl-3xl"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-indigo-400 rounded-br-3xl"></div>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Percepat Data Anda</h3>
              <p className="text-slate-500 font-medium mb-12 max-w-sm mx-auto leading-relaxed text-sm">
                Gunakan fitur AI Scan untuk mengisi data NIK, Nama, dan Alamat Anda secara otomatis dari foto KTP.
              </p>
              
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept="image/*"
                capture="environment"
                onChange={handleKtpScan}
              />
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={scanning}
                   className="h-14 px-8 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50"
                 >
                    <Camera className="w-5 h-5" /> Scan/Upload KTP
                 </button>
                 <button 
                   onClick={() => setCurrentStep(2)}
                   className="h-14 px-8 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                 >
                    Isi Manual Saja
                 </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: IDENTITAS */}
          {currentStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 lg:p-12 space-y-8"
            >
               <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0">
                     <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800 leading-snug">
                     Data berhasil ditangkap oleh AI. Silakan periksa kembali ketepatan data di bawah ini.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">NIK (Nomor Induk Kependudukan)</label>
                     <div className="relative group">
                        <input 
                          type="text" 
                          maxLength={16}
                          value={formData.nik || ''} 
                          onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g, '')})}
                          className={`w-full h-12 px-5 bg-white border ${formData.nik?.length !== 16 ? 'border-rose-200 focus:ring-rose-50' : 'border-slate-200 focus:ring-indigo-50'} rounded-2xl outline-none focus:border-indigo-500 font-bold tracking-widest transition-all`} 
                          placeholder="3200xxxxxxxx"
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap Sesuai KTP</label>
                     <input 
                       type="text" 
                       value={formData.name || ''} 
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       className={`w-full h-12 px-5 bg-white border ${!formData.name ? 'border-rose-200 focus:ring-rose-50' : 'border-slate-200 focus:ring-indigo-50'} rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all`} 
                       placeholder="Nama Lengkap"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Tempat & Tanggal Lahir</label>
                     <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={formData.birthPlace || ''} 
                          placeholder="Tempat"
                          onChange={e => setFormData({...formData, birthPlace: e.target.value})}
                          className={`h-12 px-5 bg-white border ${!formData.birthPlace ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all`} 
                        />
                        <input 
                          type="date" 
                          value={formData.birthDate || ''} 
                          onChange={e => setFormData({...formData, birthDate: e.target.value})}
                          className={`h-12 px-5 bg-white border ${!formData.birthDate ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all`} 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                     <div className="flex gap-4">
                        {['Laki-laki', 'Perempuan'].map(gen => (
                          <button 
                            key={gen}
                            type="button"
                            onClick={() => setFormData({...formData, gender: gen as any})}
                            className={`flex-1 h-12 rounded-2xl border-2 font-bold text-sm transition-all ${
                              formData.gender === gen ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {gen}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               {formErrors.length > 0 && currentStep === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl"
                  >
                     <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <div className="space-y-1">
                           <p className="text-sm font-bold text-rose-800">Mohon lengkapi data:</p>
                           <ul className="text-xs text-rose-600 font-medium list-disc ml-4">
                              {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                           </ul>
                        </div>
                     </div>
                  </motion.div>
               )}

               <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setCurrentStep(1)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors">
                     <ChevronLeft className="w-5 h-5" /> Kembali
                  </button>
                  <button 
                    onClick={nextStep} 
                    className="h-12 px-8 gradient-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                  >
                     Selanjutnya <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </motion.div>
          )}

          {/* STEP 3: SOSIAL & EKONOMI */}
          {currentStep === 3 && (
            <motion.div 
               key="step3"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="p-8 lg:p-12 space-y-8"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Keluarga</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Nomor Kartu Keluarga (KK)</label>
                           <input 
                             type="text" 
                             maxLength={16}
                             value={formData.nkk || ''} 
                             onChange={e => setFormData({...formData, nkk: e.target.value.replace(/\D/g, '')})}
                             className={`w-full h-12 px-5 bg-white border ${formData.nkk?.length !== 16 ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold tracking-widest transition-all`} 
                             placeholder="16 digit Nomor KK"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Status Dalam Keluarga (SHDK)</label>
                           <select
                              value={formData.familyStatus || ''}
                              onChange={e => setFormData({...formData, familyStatus: e.target.value})}
                              className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all text-slate-700 appearance-none"
                           >
                              <option value="" disabled>Pilih Status...</option>
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
                     </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Nama Kepala Keluarga (Sesuai KK)</label>
                     <input 
                       type="text" 
                       value={formData.familyHead || ''} 
                       onChange={e => setFormData({...formData, familyHead: e.target.value})}
                       className={`w-full h-12 px-5 bg-white border ${!formData.familyHead ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all`} 
                       placeholder="Nama Lengkap Kepala Keluarga..."
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Pekerjaan Utama</label>
                     <div className="space-y-3">
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                              <Briefcase className="w-5 h-5 text-slate-300" />
                           </div>
                           <select 
                              value={OCCUPATIONS.includes(formData.occupation || '') ? formData.occupation : (formData.occupation ? 'Lainnya' : '')} 
                              onChange={e => {
                                 const val = e.target.value;
                                 if (val === 'Lainnya') {
                                    setFormData({...formData, occupation: ''});
                                 } else {
                                    setFormData({...formData, occupation: val});
                                 }
                              }}
                              className="w-full h-12 pl-12 pr-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none text-slate-700" 
                           >
                              <option value="" disabled>Pilih Pekerjaan...</option>
                              {OCCUPATIONS.map(occ => (
                                 <option key={occ} value={occ}>{occ}</option>
                              ))}
                              <option value="Lainnya">Lainnya (Isi Sendiri)</option>
                           </select>
                        </div>
                        {(formData.occupation === '' || !OCCUPATIONS.includes(formData.occupation || '')) && (formData.occupation !== undefined || (formData.occupation === '' && OCCUPATIONS.includes(formData.occupation || '') === false)) && (
                           <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="relative group"
                           >
                              <input 
                                 type="text" 
                                 value={formData.occupation || ''} 
                                 onChange={e => setFormData({...formData, occupation: e.target.value})}
                                 className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all" 
                                 placeholder="Tuliskan pekerjaan Anda..."
                              />
                           </motion.div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Pendidikan Terakhir</label>
                     <div className="space-y-3">
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                              <GraduationCap className="w-5 h-5 text-slate-300" />
                           </div>
                           <select 
                              value={EDUCATION_LEVELS.includes(formData.education || '') ? formData.education : (formData.education ? 'Lainnya' : '')} 
                              onChange={e => {
                                 const val = e.target.value;
                                 if (val === 'Lainnya') {
                                    setFormData({...formData, education: ''});
                                 } else {
                                    setFormData({...formData, education: val});
                                 }
                              }}
                              className="w-full h-12 pl-12 pr-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none text-slate-700" 
                           >
                              <option value="" disabled>Pilih Pendidikan...</option>
                              {EDUCATION_LEVELS.map(edu => (
                                 <option key={edu} value={edu}>{edu}</option>
                              ))}
                              <option value="Lainnya">Lainnya (Isi Sendiri)</option>
                           </select>
                        </div>
                        {(formData.education === '' || !EDUCATION_LEVELS.includes(formData.education || '')) && (formData.education !== undefined || (formData.education === '' && EDUCATION_LEVELS.includes(formData.education || '') === false)) && (
                           <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="relative group"
                           >
                              <input 
                                 type="text" 
                                 value={formData.education || ''} 
                                 onChange={e => setFormData({...formData, education: e.target.value})}
                                 className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all" 
                                 placeholder="Tuliskan pendidikan Anda..."
                              />
                           </motion.div>
                        )}
                     </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Alamat Jalan</label>
                     <textarea 
                       rows={2}
                       value={formData.address || ''} 
                       onChange={e => setFormData({...formData, address: e.target.value})}
                       className={`w-full p-5 bg-white border ${!formData.address ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all overflow-hidden`}
                       placeholder="Nama jalan atau nomor rumah..."
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Dusun</label>
                     <select 
                       value={formData.dusun || ''} 
                       onChange={e => setFormData({...formData, dusun: e.target.value})}
                       className={`w-full h-12 px-5 bg-white border ${!formData.dusun ? 'border-rose-200' : 'border-slate-200'} rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none`}
                     >
                       <option value="">Pilih Dusun</option>
                       <option value="Dusun I Batu Tambun">Dusun I Batu Tambun</option>
                       <option value="Dusun II Gudang Tengah Rintis">Dusun II Gudang Tengah Rintis</option>
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">RW</label>
                        <select 
                          value={formData.rw || ''} 
                          onChange={e => setFormData({...formData, rw: e.target.value})}
                          className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none"
                        >
                          <option value="">RW</option>
                          {["001", "002", "003", "004"].map((v) => (
                             <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">RT</label>
                        <select 
                          value={formData.rt || ''} 
                          onChange={e => setFormData({...formData, rt: e.target.value})}
                          className="w-full h-12 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 font-bold transition-all appearance-none"
                        >
                          <option value="">RT</option>
                          {["001", "002", "003", "004", "005", "006", "007", "008", "009", "010", "011", "012", "013"].map((v) => (
                             <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                     </div>
                  </div>
               </div>

               {formErrors.length > 0 && currentStep === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-4"
                  >
                     <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <div className="space-y-1">
                           <p className="text-sm font-bold text-rose-800">Mohon lengkapi data:</p>
                           <ul className="text-xs text-rose-600 font-medium list-disc ml-4">
                              {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                           </ul>
                        </div>
                     </div>
                  </motion.div>
               )}

               <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setCurrentStep(2)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors">
                     <ChevronLeft className="w-5 h-5" /> Kembali
                  </button>
                  <button 
                    onClick={nextStep} 
                    className="h-12 px-8 gradient-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                  >
                     Review Terakhir <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </motion.div>
          )}

          {/* STEP 4: KONFIRMASI */}
          {currentStep === 4 && (
            <motion.div 
               key="step4"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="p-8 lg:p-12 text-center"
            >
               <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600">
                  <ShieldCheck className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Kirim Data Pendataan</h3>
               <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto leading-relaxed">
                  Data Anda akan diproses secara berjenjang mulai dari tingkat RT untuk verifikasi lapangan.
               </p>

               <div className="max-w-md mx-auto grid grid-cols-2 gap-4 mb-10 text-left">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">NIK</p>
                     <p className="text-sm font-bold text-slate-900 truncate">{formData.nik}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                     <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">SIAP VERIFIKASI</p>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      if (validateStep(2) && validateStep(3)) {
                        handleSubmit();
                      } else {
                        alert("Beberapa data masih kosong atau tidak valid (Format NIK/KK harus 16 digit). Mohon periksa kembali.");
                        setCurrentStep(2);
                      }
                    }}
                    disabled={loading}
                    className="h-14 px-12 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:opacity-90 disabled:opacity-50 min-w-[200px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : "Kirim Sekarang"}
                  </button>
                  <button 
                    onClick={() => setCurrentStep(2)}
                    className="h-14 px-8 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl"
                  >
                    Periksa Ulang
                  </button>
               </div>
            </motion.div>
          )}

          {/* SUCCESS STEP */}
          {currentStep === 5 && (
            <motion.div 
               key="success"
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-12 text-center"
            >
               <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-emerald-500 shadow-xl shadow-emerald-50">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  >
                     <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
               </div>
               <h3 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Pengajuan Berhasil!</h3>
               <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto leading-relaxed">
                  Data Anda telah masuk ke sistem SIM-DTS. Silakan informasikan kepada Ketua RT setempat untuk verifikasi data kependudukan Anda.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => setActiveTab ? setActiveTab('Dashboard') : window.location.reload()}
                    className="h-14 px-10 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                     Dashboard
                  </button>
                  <button 
                    onClick={() => setActiveTab ? setActiveTab('Keluarga') : window.location.reload()}
                    className="h-14 px-10 gradient-primary text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                  >
                     <Users className="w-5 h-5" /> Lengkapi Data Keluarga
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Disclaimer Footer */}
      <div className="mt-12 p-6 bg-slate-100/50 rounded-[2rem] border border-slate-200/50 flex items-start gap-4">
         <Info className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
         <div>
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-1.5">Kebijakan Privasi SIM-DTS</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
               Seluruh data yang Anda masukkan dilindungi oleh enkripsi 256-bit dan mengikuti standar keamanan data nasional. Akses data hanya diberikan secara terbatas kepada pejabat berwenang (RT/RW/KADUS/ADMIN) untuk keperluan pelayanan administrasi publik.
            </p>
         </div>
      </div>
    </div>
  );
}
