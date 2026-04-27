import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { CitizenData, CitizenData as CitizenDataType } from '../types';

export const CitizenDataService = {
  async getCitizenByUserId(userId: string): Promise<CitizenDataType | null> {
    try {
      const q = query(collection(db, 'citizens'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CitizenDataType;
    } catch (error) {
      handleFirestoreError(error, 'get', 'citizens');
    }
  },

  async createCitizenData(data: Omit<CitizenDataType, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      return await addDoc(collection(db, 'citizens'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'citizens');
    }
  },

  async updateCitizenData(id: string, data: Partial<CitizenDataType>) {
    try {
      const citizenDoc = doc(db, 'citizens', id);
      // Strip immutable fields from partial data to avoid security rule violations
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...updateData } = data as any;
      
      await updateDoc(citizenDoc, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, 'update', 'citizens');
    }
  },

  async getCitizensByVerificationStatus(status: CitizenDataType['verificationStatus']) {
    try {
      const q = query(collection(db, 'citizens'), where('verificationStatus', '==', status));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CitizenDataType));
    } catch (error) {
      handleFirestoreError(error, 'list', 'citizens');
    }
  },

  async getAllCitizens() {
    try {
      const snapshot = await getDocs(collection(db, 'citizens'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CitizenDataType));
    } catch (error) {
      handleFirestoreError(error, 'list', 'citizens');
    }
  },

  async deleteCitizen(id: string) {
    try {
      await deleteDoc(doc(db, 'citizens', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `citizens/${id}`);
    }
  }
};
