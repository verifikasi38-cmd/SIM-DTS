import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Clock, User, FileText, MessageSquare, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { AppNotification } from '../types';

export default function NotificationDropdown() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    let unsubscribe = () => {};

    // For officials, listen by role and area
    if (['RT', 'RW', 'KADUS', 'ADMIN'].includes(profile.role)) {
      unsubscribe = NotificationService.listenRoleNotifications(
        profile.role,
        { rt: profile.rt, rw: profile.rw, dusun: profile.dusun },
        (data) => {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      );
    } else {
      // For citizens, listen by userId
      unsubscribe = NotificationService.listenUserNotifications(user.uid, (data) => {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      });
    }

    return () => unsubscribe();
  }, [user, profile]);

  const handleMarkRead = async (id: string) => {
    await NotificationService.markAsRead(id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'VERIFICATION': return <ShieldAlert className="w-4 h-4" />;
      case 'LETTER': return <FileText className="w-4 h-4" />;
      case 'COMPLAINT': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Pusat Notifikasi</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Informasi & Update Terbaru</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Belum Ada Notifikasi</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 ${!n.read ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => {
                          if (!n.read && n.id) handleMarkRead(n.id);
                        }}
                      >
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          !n.read ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className={`text-xs font-bold ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</h4>
                            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" /> 
                              {new Date(n.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-normal">{n.message}</p>
                          {!n.read && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); n.id && handleMarkRead(n.id); }}
                              className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest hover:underline"
                            >
                              Tandai Dibaca
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 text-center">
                  <button className="text-[10px] font-extrabold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                    Lihat Semua Aktivitas
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
