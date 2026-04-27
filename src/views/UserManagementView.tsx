import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { ShieldCheck, Search, Save, User as UserIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole, VillageSettings } from '../types';

export default function UserManagementView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [villageSettings, setVillageSettings] = useState<VillageSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load Village Settings to get valid RT/RW/Dusun list
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'village_data');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setVillageSettings(snap.data() as VillageSettings);
        } else {
          setVillageSettings({
            kabupaten: 'Kepulauan Anambas',
            kecamatan: 'Siantan',
            desa: 'Tarempa Selatan',
            kepalaDesa: '',
            sekretarisDesa: '',
            rts: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013'],
            rws: ['001', '002', '003', '004'],
            dusuns: ['Dusun I Batu Tambun', 'Dusun II Gudang Tengah Rintis'],
            kaduses: []
          });
        }
      } catch (err) {
        console.error("Gagal mendapatkan pengaturan desa:", err);
      }
    };
    fetchSettings();
  }, []);

  // Listen to users
  useEffect(() => {
    if (profile?.role !== 'ADMIN') return;
    
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    setSavingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), updates);
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate peran pengguna.');
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="flex justify-center items-center h-full">
         <p className="text-slate-500">Akses ditolak.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-indigo-600" /> Manajemen Akses
          </h1>
          <p className="text-slate-500 font-medium mt-2">Tetapkan peran Ketua RT, Ketua RW, dan Kepala Dusun pada akun pengguna.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Cari nama / email..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 overflow-hidden">
        {loading ? (
           <p className="text-center text-slate-500 py-10">Memuat data pengguna...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 rounded-tl-xl">Pengguna</th>
                  <th className="px-5 py-4">Peran (Role)</th>
                  <th className="px-5 py-4">Lingkup Akses</th>
                  <th className="px-5 py-4 rounded-tr-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.fullName || 'Belum diatur'}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleUpdateUser(user.uid, { role: e.target.value as UserRole, rt: '', rw: '', dusun: '' })}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                      >
                        <option value="CITIZEN">Warga</option>
                        <option value="RT">Ketua RT</option>
                        <option value="RW">Ketua RW</option>
                        <option value="KADUS">Kepala Dusun</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 flex flex-wrap gap-2">
                      {['CITIZEN', 'RT'].includes(user.role) && (
                        <select 
                          value={user.rt || ''} 
                          onChange={(e) => handleUpdateUser(user.uid, { rt: e.target.value })}
                          className="bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-lg p-2 font-bold"
                        >
                          <option value="">Pilih RT</option>
                          {villageSettings?.rts?.map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
                        </select>
                      )}
                      {['CITIZEN', 'RT', 'RW'].includes(user.role) && (
                        <select 
                          value={user.rw || ''} 
                          onChange={(e) => handleUpdateUser(user.uid, { rw: e.target.value })}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded-lg p-2 font-bold"
                        >
                          <option value="">Pilih RW</option>
                          {villageSettings?.rws?.map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
                        </select>
                      )}
                      {['CITIZEN', 'RT', 'RW', 'KADUS'].includes(user.role) && (
                        <select 
                          value={user.dusun || ''} 
                          onChange={(e) => handleUpdateUser(user.uid, { dusun: e.target.value })}
                          className="bg-purple-50 text-purple-700 border border-purple-200 text-xs rounded-lg p-2 font-bold"
                        >
                          <option value="">Pilih Dusun</option>
                          {villageSettings?.dusuns?.map(dusun => <option key={dusun} value={dusun}>{dusun}</option>)}
                        </select>
                      )}
                      {user.role === 'ADMIN' && <span className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded-md mt-1">Akses Penuh</span>}
                    </td>
                    <td className="px-5 py-4">
                      {savingId === user.uid && <div className="text-xs text-indigo-600 font-medium">Menyimpan...</div>}
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
