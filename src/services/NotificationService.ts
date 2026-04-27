import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  doc, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { AppNotification, UserRole } from '../types';

export const NotificationService = {
  async sendNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    try {
      const cleanNotification = Object.fromEntries(
        Object.entries(notification).filter(([_, v]) => v !== undefined)
      );

      return await addDoc(collection(db, 'notifications'), {
        ...cleanNotification,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'notifications');
    }
  },

  listenUserNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    });
  },

  listenRoleNotifications(role: UserRole, area: { rt?: string, rw?: string, dusun?: string }, callback: (notifications: AppNotification[]) => void) {
    let q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', role),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (area.rt) q = query(q, where('targetRt', '==', area.rt));
    if (area.rw) q = query(q, where('targetRw', '==', area.rw));
    if (area.dusun) q = query(q, where('targetDusun', '==', area.dusun));

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    });
  },

  async markAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, 'update', `notifications/${notificationId}`);
    }
  }
};
