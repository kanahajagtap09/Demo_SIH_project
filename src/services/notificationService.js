// src/services/notificationService.js

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

class NotificationService {
  constructor() {
    this.listeners = new Map();
  }

  // Create a new notification
  async createNotification(notificationData) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp(),
        read: false,
        id: null // Will be set by Firestore
      });
      
      console.log('Notification created with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Listen to notifications for a specific user
  subscribeToUserNotifications(userId, callback) {
    if (!userId) {
      console.error('UserId is required for notification subscription');
      return () => {};
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      callback(notifications);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    this.listeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      snapshot.forEach((doc) => {
        batch.push(
          updateDoc(doc.ref, {
            read: true,
            readAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Create notification for issue updates
  async createIssueNotification(type, issueData, recipientId, actorData) {
    const notificationTypes = {
      'issue_created': {
        title: 'New Issue Reported',
        message: `A new issue has been reported: ${issueData.title}`,
        icon: '🚨'
      },
      'issue_resolved': {
        title: 'Issue Resolved',
        message: `Issue "${issueData.title}" has been resolved`,
        icon: '✅'
      },
      'issue_escalated': {
        title: 'Issue Escalated',
        message: `Issue "${issueData.title}" has been escalated`,
        icon: '⚠️'
      },
      'issue_assigned': {
        title: 'Issue Assigned',
        message: `You have been assigned to issue: ${issueData.title}`,
        icon: '👤'
      },
      'issue_comment': {
        title: 'New Comment',
        message: `${actorData?.name || 'Someone'} commented on "${issueData.title}"`,
        icon: '💬'
      }
    };

    const notificationType = notificationTypes[type];
    if (!notificationType) {
      console.error('Unknown notification type:', type);
      return;
    }

    return await this.createNotification({
      type,
      title: notificationType.title,
      message: notificationType.message,
      icon: notificationType.icon,
      recipientId,
      actorId: actorData?.id,
      actorName: actorData?.name,
      actorPhoto: actorData?.photoURL,
      issueId: issueData.id,
      issueTitle: issueData.title,
      category: issueData.category || 'general'
    });
  }

  // Create notification for user interactions
  async createUserNotification(type, actorData, recipientId, additionalData = {}) {
    const notificationTypes = {
      'user_follow': {
        title: 'New Follower',
        message: `${actorData.name} started following you`,
        icon: '👥'
      },
      'post_like': {
        title: 'Post Liked',
        message: `${actorData.name} liked your post`,
        icon: '❤️'
      },
      'post_comment': {
        title: 'New Comment',
        message: `${actorData.name} commented on your post`,
        icon: '💬'
      },
      'mention': {
        title: 'You were mentioned',
        message: `${actorData.name} mentioned you in a comment`,
        icon: '📢'
      }
    };

    const notificationType = notificationTypes[type];
    if (!notificationType) {
      console.error('Unknown notification type:', type);
      return;
    }

    return await this.createNotification({
      type,
      title: notificationType.title,
      message: notificationType.message,
      icon: notificationType.icon,
      recipientId,
      actorId: actorData.id,
      actorName: actorData.name,
      actorPhoto: actorData.photoURL,
      ...additionalData
    });
  }

  // Clean up listeners
  unsubscribeAll() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  // Get unread count for a user
  async getUnreadCount(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;