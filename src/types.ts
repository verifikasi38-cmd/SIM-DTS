export type UserRole = 'CITIZEN' | 'RT' | 'RW' | 'KADUS' | 'ADMIN';

export type VerificationStatus = 
  | 'PENDING' 
  | 'RT_APPROVED' 
  | 'RW_APPROVED' 
  | 'KADUS_APPROVED' 
  | 'ADMIN_APPROVED' 
  | 'REJECTED';

export type LetterStatus = 
  | 'PENDING' 
  | 'RT_APPROVED' 
  | 'RW_APPROVED' 
  | 'COMPLETED' 
  | 'REJECTED';

export type RequestLevel = 'RT' | 'RW' | 'KADUS' | 'DESA';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  photoURL?: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  nik?: string;
  phoneNumber?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  birthPlace?: string;
  birthDate?: string;
  kk?: string;
  address?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CitizenData {
  id?: string;
  nik: string;
  name: string;
  address: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  occupation: string;
  education: string;
  nkk?: string;
  familyHead: string;
  socialAssistance: string[];
  economicStatus?: string;
  verificationStatus: VerificationStatus;
  rejectionNotes?: string;
  rt: string;
  rw: string;
  dusun: string;
  userId: string;
  role?: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LetterRequest {
  id?: string;
  type: 'DOMISILI' | 'SKU' | 'SKTM' | 'KELAHIRAN' | 'KEMATIAN' | 'NIKAH' | 'BELUM_NIKAH' | 'JANDA_DUDA' | 'WARIS' | 'PENGHASILAN' | 'KEHILANGAN' | 'PINDAH' | 'BEDA_NAMA' | 'TANAH' | 'RIWAYAT_TANAH' | 'KERAMAIAN' | 'SKCK' | 'KTP_KK' | 'WARGA' | 'SPORADIK';
  citizenId: string;
  status: LetterStatus;
  purpose: string;
  pdfUrl?: string;
  trackingNumber: string;
  rtNote?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  // Dynamic fields for specific types
  batasUtara?: string;
  batasSelatan?: string;
  batasTimur?: string;
  batasBarat?: string;
  luasTanah?: string;
  statusTanah?: string;
  saksi1?: string;
  saksi2?: string;
}

export interface Complaint {
  id?: string;
  citizenId: string;
  category: 'SECURITY' | 'ENVIRONMENT' | 'SOCIAL' | 'INFRASTRUCTURE' | 'WASTE' | 'LIGHTING';
  targetLevel: RequestLevel;
  content: string;
  imageUrl?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  response?: string;
  createdAt: string;
}

export interface VillageSettings {
  kabupaten: string;
  kecamatan: string;
  desa: string;
  kepalaDesa: string;
  sekretarisDesa: string;
  kaurKeuangan?: string;
  logoUrl?: string; // TBD later
  rts: string[];
  rws: string[];
  dusuns: string[];
  kaduses: string[]; // Names of Kadus
}

export interface NewsItem {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  level: RequestLevel;
  targetRt?: string;
  targetRw?: string;
  imageUrl?: string;
  createdAt: string;
}
