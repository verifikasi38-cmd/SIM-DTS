import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart3, 
  FileText, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Home,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Bell,
  Moon,
  Sun,
  Search,
  ChevronRight,
  ShieldCheck,
  User,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, profile, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!user) return <>{children}</>;

  const navigation = [
    { name: 'Dashboard', icon: Home, roles: ['CITIZEN', 'RT', 'RW', 'KADUS', 'ADMIN'], category: 'Utama' },
    { name: profile?.role === 'CITIZEN' ? 'Rekam Data' : 'Data Warga', icon: Users, roles: ['CITIZEN', 'RT', 'RW', 'KADUS', 'ADMIN'], category: 'Administrasi', originalName: 'Data Warga' },
    { name: 'Layanan Surat', icon: FileText, roles: ['CITIZEN', 'RT', 'RW', 'ADMIN'], category: 'Layanan' },
    { name: 'Pengaduan', icon: MessageSquare, roles: ['CITIZEN', 'RT', 'RW', 'KADUS', 'ADMIN'], category: 'Layanan' },
    { name: 'Statistik', icon: BarChart3, roles: ['RT', 'RW', 'KADUS', 'ADMIN'], category: 'Analitik' },
    { name: 'Manajemen Akses', icon: ShieldCheck, roles: ['ADMIN'], category: 'Administrasi' },
    { name: 'Pengaturan Desa', icon: Building2, roles: ['ADMIN'], category: 'Administrasi' },
    { name: 'Profil', icon: Settings, roles: ['CITIZEN', 'RT', 'RW', 'KADUS', 'ADMIN'], category: 'Akun' },
  ];

  const categories = ['Utama', 'Administrasi', 'Layanan', 'Analitik', 'Akun'];
  const filteredNav = navigation.filter(item => profile && item.roles.includes(profile.role));

  const roleLabels: Record<string, string> = {
    'ADMIN': 'Administrator Desa',
    'RT': 'Ketua RT',
    'RW': 'Ketua RW',
    'KADUS': 'Kepala Dusun',
    'CITIZEN': 'Warga'
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Tablet */}
      <aside 
        className={`fixed lg:sticky top-0 h-screen z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 w-72 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Content */}
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-100 flex-shrink-0">
                <img src="https://cdn.phototourl.com/free/2026-04-26-e061c39c-4482-4062-9346-6450b90a83a7.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <div className="overflow-hidden">
                <h1 className="font-extrabold text-slate-900 text-xl tracking-tight leading-none">SIM-DTS</h1>
                <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold leading-none">Digital Village</p>
             </div>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 px-5 py-4 space-y-8 overflow-y-auto">
          {categories.map(cat => {
            const items = filteredNav.filter(n => n.category === cat);
            if (items.length === 0) return null;
            
            return (
              <div key={cat} className="space-y-1.5">
                <h3 className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">{cat}</h3>
                {items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.originalName || item.name);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between group px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      (activeTab === item.name || activeTab === item.originalName)
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 transition-colors ${
                        (activeTab === item.name || activeTab === item.originalName) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
                      }`} />
                      <span className={`text-[13.5px] font-bold ${(activeTab === item.name || activeTab === item.originalName) ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {item.name}
                      </span>
                    </div>
                    {(activeTab === item.name || activeTab === item.originalName) && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-400"></div>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User Card Bottom Sidebar */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
           <button 
             onClick={() => setActiveTab('Profil')}
             className="w-full text-left group p-3 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white transition-all duration-200"
           >
              <div className="flex items-center gap-3">
                 <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                    {profile?.photoURL ? (
                       <img src={profile.photoURL} alt="" className="w-full h-full object-cover rounded-[inherit]" referrerPolicy="no-referrer" />
                    ) : (
                       <User className="w-6 h-6 text-slate-400" />
                    )}
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{profile?.fullName}</p>
                    <div className="flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                         {roleLabels[profile?.role || 'CITIZEN']}
                       </p>
                    </div>
                 </div>
              </div>
           </button>
           <button 
             onClick={() => logout()}
             className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
           >
              <LogOut className="w-4 h-4" /> Keluar Sistem
           </button>
        </div>
      </aside>

      {/* Content Side Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
           {/* Mobile Menu & Brand */}
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 lg:hidden hover:bg-slate-200 transition-colors"
              >
                 <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden sm:block">
                 <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{activeTab}</h2>
                 <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <span>SIM-DTS</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Tarempa Selatan</span>
                 </div>
              </div>
           </div>

           {/* Toolbar Header */}
           <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center bg-slate-100 border border-transparent focus-within:border-indigo-100 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100/30 rounded-2xl h-11 px-4 transition-all w-64">
                 <Search className="w-4 h-4 text-slate-400" />
                 <input type="text" placeholder="Cari layanan atau data..." className="bg-transparent border-none outline-none text-sm font-medium ml-3 w-full" />
              </div>
              
              <button 
                 onClick={toggleDarkMode}
                 className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                 {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
                    
              <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
              </button>

              <button 
                onClick={logout}
                className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                title="Keluar"
              >
                 <LogOut className="w-5 h-5" />
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              
              <div className="hidden sm:flex items-center gap-3">
                 {profile?.isVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                       <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                    </div>
                 ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-amber-100">
                       <AlertCircle className="w-3.5 h-3.5" /> Pending
                    </div>
                 )}
              </div>
           </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Smart Tab) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-around z-50 rounded-t-3xl shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        {[
          { name: 'Dashboard', icon: Home },
          { name: profile?.role === 'CITIZEN' ? 'Rekam Data' : 'Data Warga', icon: Users, originalName: 'Data Warga' },
          { name: 'Layanan Surat', icon: FileText },
          { name: 'Profil', icon: User }
        ].map(item => (
          <button
            key={item.name}
            onClick={() => setActiveTab(item.originalName || item.name)}
            className={`flex flex-col items-center gap-1 transition-all ${
              (activeTab === item.name || activeTab === item.originalName) ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.name === 'Layanan Surat' ? 'Layanan' : item.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
