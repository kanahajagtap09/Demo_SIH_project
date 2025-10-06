import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  subDays,
  isAfter,
  startOfMonth,
} from "date-fns";
import { db } from "../firebase/firebase";
import { collection, query, orderBy, onSnapshot, limit, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// ----------------- Instagram-Style Notification Component -----------------
export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user } = useAuth();
  const audioRef = useRef(null);



  // 🔹 Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // 🔹 Show alert notification
  const showNotificationAlert = useCallback((message) => {
    setAlertMessage(message);
    setShowAlert(true);
    playNotificationSound();
    setTimeout(() => setShowAlert(false), 4000);
  }, [playNotificationSound]);

  // 🔹 Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // 🔹 Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // 🔹 Real-time Firebase notifications for current user only
  useEffect(() => {
    if (!user?.uid) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const realNotifications = [];
      
      snapshot.docs.forEach(doc => {
        const post = doc.data();
        
        // Only process posts belonging to current user
        if (post.likes) {
          post.likes.forEach(like => {
            if (like.userId !== user.uid) {
              realNotifications.push({
                id: `like_${doc.id}_${like.userId}`,
                user: { username: like.username || 'Someone', photoURL: like.photoURL || '/default-avatar.png' },
                type: 'like',
                createdAt: like.timestamp?.toDate() || new Date(),
                postImage: post.imageUrl,
                read: false
              });
            }
          });
        }
        
        // Check for comments on user's posts
        if (post.comments) {
          post.comments.forEach(comment => {
            if (comment.userId !== user.uid) {
              realNotifications.push({
                id: `comment_${doc.id}_${comment.id}`,
                user: { username: comment.username || 'Someone', photoURL: comment.photoURL || '/default-avatar.png' },
                type: 'comment',
                createdAt: comment.timestamp?.toDate() || new Date(),
                commentPreview: comment.text?.substring(0, 50) + '...',
                postImage: post.imageUrl,
                read: false
              });
            }
          });
        }
      });

      setNotifications(realNotifications);
      const unread = realNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      
      if (realNotifications.length > 0) {
        showNotificationAlert('🔔 You have new notifications!');
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);



  // 🔹 Group notifications
  const grouped = {
    Today: [],
    Yesterday: [],
    "This week": [],
    "This month": [],
  };

  notifications.forEach((n) => {
    if (isToday(n.createdAt)) {
      grouped.Today.push(n);
    } else if (isYesterday(n.createdAt)) {
      grouped.Yesterday.push(n);
    } else if (isAfter(n.createdAt, subDays(new Date(), 7))) {
      grouped["This week"].push(n);
    } else if (isAfter(n.createdAt, startOfMonth(new Date()))) {
      grouped["This month"].push(n);
    }
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* 🔹 Audio element for notification sounds */}
      <audio 
        ref={audioRef} 
        preload="auto"
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmojBSuBzvLZiTYIF2m98OCKPAoUX7Xr6KxVFAxGn+Rtvmw=" 
      />
      
      {/* 🔹 Alert Banner */}
      {showAlert && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-3 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-pulse">🔔</span>
            <span className="text-sm font-medium">{alertMessage}</span>
          </div>
        </div>
      )}
      
      {/* 🔹 Header */}
      <div className="sticky top-0 bg-white border-b py-3 z-40">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full ${soundEnabled ? 'text-blue-500' : 'text-gray-400'}`}
              title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-500 text-sm font-medium hover:text-blue-600"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 Content */}
      <div className="px-3 py-4 space-y-5">
        {Object.entries(grouped).map(([label, items]) =>
          items.length > 0 ? (
            <div key={label}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {label}
              </h3>

              <div className="space-y-4">
                {items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className={`flex items-center justify-between gap-3 hover:bg-gray-50 transition duration-150 p-2 rounded-lg cursor-pointer relative ${
                      !n.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    {/* Avatar + Text */}
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={n.user?.photoURL}
                          className="w-11 h-11 rounded-full object-cover"
                          alt="profile"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDQiIGhlaWdodD0iNDQiIHZpZXdCb3g9IjAgMCA0NCA0NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ0IiBoZWlnaHQ9IjQ0IiByeD0iMjIiIGZpbGw9IiM5Q0EzQUYiLz4KPHN2Zz4K';
                          }}
                        />
                        {!n.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm leading-snug">
                          <span className="font-medium">
                            {n.user?.username}
                          </span>{" "}
                          {n.type === "like" && "liked your post"}
                          {n.type === "comment" && (
                            <>
                              commented:{" "}
                              <span className="text-gray-600 italic">
                                “{n.commentPreview}”
                              </span>
                            </>
                          )}
                          {n.type === "follow" && "started following you"}
                          {n.type === "mention" && (
                            <>
                              mentioned you:{" "}
                              <span className="text-gray-600 italic">
                                “{n.commentPreview}”
                              </span>
                            </>
                          )}
                          {n.type === "civic_update" && (
                            <span className="text-blue-600 font-medium">
                              📋 {n.commentPreview}
                            </span>
                          )}
                          {n.type === "civic_resolved" && (
                            <span className="text-green-600 font-medium">
                              ✅ {n.commentPreview}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Right side: image / button */}
                    <div className="flex items-center gap-2">
                      {n.priority === 'high' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}

                      {n.type === "follow" && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            showNotificationAlert(`Following ${n.user?.username}!`);
                          }}
                          className="bg-blue-500 text-white text-xs px-4 py-1 rounded font-medium hover:bg-blue-600 transition active:scale-95"
                        >
                          Follow
                        </button>
                      )}
                      
                      {n.type === "civic_update" && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            showNotificationAlert('📋 Opening issue details...');
                          }}
                          className="bg-blue-500 text-white text-xs px-3 py-1 rounded font-medium hover:bg-blue-600 transition active:scale-95"
                        >
                          View
                        </button>
                      )}
                      
                      {n.type === "civic_resolved" && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            showNotificationAlert('⭐ Opening rating form...');
                          }}
                          className="bg-green-500 text-white text-xs px-3 py-1 rounded font-medium hover:bg-green-600 transition active:scale-95"
                        >
                          Rate
                        </button>
                      )}
                      
                      {(n.type === "like" || n.type === "comment") && n.postImage && (
                        <img
                          src={n.postImage}
                          className="w-11 h-11 rounded object-cover"
                          alt="post"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}