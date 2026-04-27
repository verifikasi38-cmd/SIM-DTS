import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Save, Building2, UserPlus, Trash2, MapPin } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { VillageSettings } from '../types';

export default function VillageSettingsView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<VillageSettings>({
    kabupaten: 'Kepulauan Anambas',
    kecamatan: 'Siantan',
    desa: 'Tarempa Selatan',
    kepalaDesa: '',
    sekretarisDesa: '',
    address: '',
    logoUrl: '',
    rts: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013'],
    rws: ['001', '002', '003', '004'],
    dusuns: ['Dusun I Batu Tambun', 'Dusun II Gudang Tengah Rintis'],
    kaduses: []
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'village_data');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as VillageSettings);
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan desa", err);
      } finally {
         setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'village_data'), settings);
      alert('Pengaturan desa berhasil disimpan');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan pengaturan desa');
    } finally {
      setSaving(false);
    }
  };

  const [newInputs, setNewInputs] = useState<Record<string, string>>({});

  const handleAddListItem = (field: keyof VillageSettings) => {
    const newVal = newInputs[field];
    if (newVal && newVal.trim()) {
      setSettings(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), newVal.trim()]
      }));
      setNewInputs(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRemoveListItem = (field: keyof VillageSettings, index: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="flex justify-center items-center h-full">
         <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  if (loading) {
     return (
       <div className="flex justify-center items-center h-full">
         <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
       </div>
     );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
           <Building2 className="w-8 h-8 text-indigo-600" /> Pengaturan Desa
        </h1>
        <p className="text-slate-500 font-medium mt-2">Atur informasi dasar desa untuk keperluan sinkronisasi surat dan administrasi sistem.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <h3 className="text-lg font-extrabold text-slate-900 border-b pb-2">Informasi Instansi</h3>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Kabupaten</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.kabupaten} onChange={e => setSettings({...settings, kabupaten: e.target.value})} />
               </div>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Kecamatan</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.kecamatan} onChange={e => setSettings({...settings, kecamatan: e.target.value})} />
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Desa</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.desa} onChange={e => setSettings({...settings, desa: e.target.value})} />
               </div>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Alamat Kantor Desa</label>
                  <textarea className="w-full mt-2 h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} />
               </div>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Logo Desa</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.logoUrl || ''} onChange={e => setSettings({...settings, logoUrl: e.target.value})} placeholder="URL Logo atau upload file..." />
                  <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => {
                                 setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
                             };
                             reader.readAsDataURL(file);
                         }
                     }}
                     className="w-full mt-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />

               </div>
            </div>

            <div className="space-y-6">
               <h3 className="text-lg font-extrabold text-slate-900 border-b pb-2">Pejabat Desa</h3>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Kepala Desa</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.kepalaDesa} onChange={e => setSettings({...settings, kepalaDesa: e.target.value})} placeholder="Contoh: Budi Santoso, S.E." />
               </div>
               
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Sekretaris Desa</label>
                  <input type="text" className="w-full mt-2 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={settings.sekretarisDesa} onChange={e => setSettings({...settings, sekretarisDesa: e.target.value})} />
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Daftar Kadus (Opsional)</label>
                 <div className="mt-2 space-y-2">
                    {settings.kaduses && settings.kaduses.map((kadus, idx) => (
                      <div key={idx} className="flex gap-2">
                         <div className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center text-slate-700 font-medium">{kadus}</div>
                         <button onClick={() => handleRemoveListItem('kaduses', idx)} className="w-12 h-12 flex justify-center items-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                    ))}
                    <div className="flex gap-2 w-full mt-2">
                       <input 
                         type="text" 
                         placeholder="Tambah Kadus..." 
                         value={newInputs['kaduses'] || ''} 
                         onChange={e => setNewInputs(prev => ({...prev, kaduses: e.target.value}))}
                         onKeyDown={e => e.key === 'Enter' && handleAddListItem('kaduses')}
                         className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                       />
                       <button onClick={() => handleAddListItem('kaduses')} className="w-12 h-12 border bg-indigo-50 border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
                         <UserPlus className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               </div>
            </div>
         </div>

         <div className="mt-8 pt-8 border-t space-y-6">
            <h3 className="text-lg font-extrabold text-slate-900 border-b pb-2 flex items-center gap-2"><MapPin className="w-5 h-5" /> Wilayah Administratif</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Daftar Dusun</label>
                  <div className="mt-2 space-y-2">
                     {settings.dusuns && settings.dusuns.map((dusun, idx) => (
                       <div key={idx} className="flex gap-2">
                          <div className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center text-slate-700 font-medium text-sm">{dusun}</div>
                          <button onClick={() => handleRemoveListItem('dusuns', idx)} className="w-10 h-10 flex justify-center items-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     ))}
                     <div className="flex gap-2 mt-2">
                        <input 
                           type="text" 
                           placeholder="Tambah Dusun" 
                           value={newInputs['dusuns'] || ''} 
                           onChange={e => setNewInputs(prev => ({...prev, dusuns: e.target.value}))}
                           onKeyDown={e => e.key === 'Enter' && handleAddListItem('dusuns')}
                           className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 text-sm outline-none w-full"
                        />
                        <button onClick={() => handleAddListItem('dusuns')} className="w-10 h-10 flex justify-center items-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                           + 
                        </button>
                     </div>
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Daftar RW</label>
                  <div className="mt-2 space-y-2">
                     {settings.rws && settings.rws.map((rw, idx) => (
                       <div key={idx} className="flex gap-2">
                          <div className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center text-slate-700 font-medium text-sm">{rw}</div>
                          <button onClick={() => handleRemoveListItem('rws', idx)} className="w-10 h-10 flex justify-center items-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     ))}
                     <div className="flex gap-2 mt-2">
                        <input 
                           type="text" 
                           placeholder="Tambah RW" 
                           value={newInputs['rws'] || ''} 
                           onChange={e => setNewInputs(prev => ({...prev, rws: e.target.value}))}
                           onKeyDown={e => e.key === 'Enter' && handleAddListItem('rws')}
                           className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 text-sm outline-none w-full"
                        />
                        <button onClick={() => handleAddListItem('rws')} className="w-10 h-10 flex justify-center items-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                           + 
                        </button>
                     </div>
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Daftar RT</label>
                  <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {settings.rts && settings.rts.map((rt, idx) => (
                       <div key={idx} className="flex gap-2">
                          <div className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center text-slate-700 font-medium text-sm">{rt}</div>
                          <button onClick={() => handleRemoveListItem('rts', idx)} className="w-10 h-10 flex justify-center items-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     ))}
                     <div className="flex gap-2 mt-2">
                        <input 
                           type="text" 
                           placeholder="Tambah RT" 
                           value={newInputs['rts'] || ''} 
                           onChange={e => setNewInputs(prev => ({...prev, rts: e.target.value}))}
                           onKeyDown={e => e.key === 'Enter' && handleAddListItem('rts')}
                           className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-700 text-sm outline-none w-full"
                        />
                        <button onClick={() => handleAddListItem('rts')} className="w-10 h-10 flex justify-center items-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                           + 
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
            <button 
               onClick={handleSave}
               disabled={saving}
               className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold flex items-center gap-2 min-w-[150px] justify-center"
            >
               {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-5 h-5" /> Simpan Pengaturan</>}
            </button>
         </div>
      </div>
    </div>
  );
}
