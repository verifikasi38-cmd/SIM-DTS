import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { LetterRequest } from '../types';

export const LetterService = {
  async getLettersByCitizen(citizenId: string): Promise<LetterRequest[]> {
    try {
      const q = query(
        collection(db, 'letters'), 
        where('citizenId', '==', citizenId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LetterRequest));
    } catch (error) {
      handleFirestoreError(error, 'list', 'letters');
    }
  },

  async requestLetter(data: Omit<LetterRequest, 'id' | 'createdAt' | 'updatedAt' | 'trackingNumber'>) {
    try {
      const trackingNumber = `LET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return await addDoc(collection(db, 'letters'), {
        ...data,
        trackingNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'letters');
    }
  },

  async updateLetterStatus(id: string, status: LetterRequest['status'], note?: string) {
    try {
      const letterDoc = doc(db, 'letters', id);
      const isArchived = status === 'COMPLETED';
      await updateDoc(letterDoc, {
        status,
        rtNote: note,
        isArchived,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, 'update', 'letters');
    }
  },

  async deleteLetter(id: string) {
    try {
      await deleteDoc(doc(db, 'letters', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `letters/${id}`);
    }
  }
};
