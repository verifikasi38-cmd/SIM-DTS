import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import AuthView from './views/AuthView';
import Dashboard from './views/Dashboard';
import CitizenDataForm from './views/CitizenDataForm';
import LetterSystem from './views/LetterSystem';
import ComplaintSystem from './views/ComplaintSystem';
import Statistics from './views/Statistics';
import VerificationView from './views/VerificationView';
import ProfileView from './views/ProfileView';
import FamilyDataView from './views/FamilyDataView';

import VillageSettingsView from './views/VillageSettingsView';
import UserManagementView from './views/UserManagementView';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = React.useState('Dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Menyiapkan SIM-DTS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const isOfficial = ['RT', 'RW', 'KADUS', 'ADMIN'].includes(profile?.role || '');

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'Data Warga':
        return isOfficial ? <VerificationView /> : <CitizenDataForm setActiveTab={setActiveTab} />;
      case 'Keluarga':
        return <FamilyDataView setActiveTab={setActiveTab} />;
      case 'Layanan Surat':
        return <LetterSystem />;
      case 'Pengaduan':
        return <ComplaintSystem />;
      case 'Statistik':
        return <Statistics />;
      case 'Manajemen Akses':
        return <UserManagementView />;
      case 'Pengaturan Desa':
        return <VillageSettingsView />;
      case 'Profil':
        return <ProfileView />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
       {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
