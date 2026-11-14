import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "order_status" | "promo" | "new_arrival" | "system" | string;
  createdAt: string;
  isRead?: boolean;
  readBy?: string[];
}

export function isNotificationUnread(notif: AppNotification, uid?: string | null): boolean {
  if (!uid) return false;
  if (notif.userId === "broadcast") {
    return !notif.readBy || !notif.readBy.includes(uid);
  }
  return !notif.isRead;
}

export function useNotifications(uid?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [uid, "broadcast"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const allNotifs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppNotification, "id">),
        }));
        setNotifications(allNotifs);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, "notifications");
      }
    );

    return () => unsub();
  }, [uid]);

  const unreadCount = notifications.filter((n) => isNotificationUnread(n, uid)).length;

  const markAsRead = useCallback(
    async (notif: AppNotification) => {
      if (!uid) return;
      if (!isNotificationUnread(notif, uid)) return;
      const notifPath = `notifications/${notif.id}`;
      try {
        if (notif.userId === "broadcast") {
          const currentReadBy = notif.readBy || [];
          if (!currentReadBy.includes(uid)) {
            await updateDoc(doc(db, "notifications", notif.id), {
              readBy: [...currentReadBy, uid],
            });
          }
        } else {
          await updateDoc(doc(db, "notifications", notif.id), {
            isRead: true,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, notifPath);
      }
    },
    [uid]
  );

  const markAllAsRead = useCallback(async () => {
    if (!uid) return;
    const unreadNotifs = notifications.filter((n) => isNotificationUnread(n, uid));
    for (const notif of unreadNotifs) {
      await markAsRead(notif);
    }
  }, [uid, notifications, markAsRead]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
