import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  ExclamationCircleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import {
  MegaphoneIcon,
} from "@heroicons/react/24/outline";

const statusConfig = {
  pending: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: <ExclamationCircleIcon className="w-6 h-6 text-orange-500" />,
  },
  assign: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: <WrenchScrewdriverIcon className="w-6 h-6 text-yellow-500" />,
  },
  "at progress": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: <WrenchScrewdriverIcon className="w-6 h-6 text-blue-500" />,
  },
  resolved: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
  },
};

export default function Updates() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid);
      
      // Get user's posts first, then find related issues
      const postsRef = collection(db, "posts");
      const postsQuery = query(postsRef, where("uid", "==", user.uid));
      
      const unsubscribePosts = onSnapshot(postsQuery, (postsSnapshot) => {
        const userPostIds = postsSnapshot.docs.map(doc => doc.id);
        
        if (userPostIds.length > 0) {
          // Get issues related to user's posts
          const issuesRef = collection(db, "issues");
          const issuesQuery = query(issuesRef, orderBy("reportedAt", "desc"));
          
          const unsubscribeIssues = onSnapshot(issuesQuery, (issuesSnapshot) => {
            const userIssues = issuesSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(issue => 
                issue.postId && userPostIds.includes(issue.postId) ||
                issue.relatedPosts?.some(postId => userPostIds.includes(postId))
              );
            
            setIssues(userIssues);
            setLoading(false);
          });
          
          return () => unsubscribeIssues();
        } else {
          setIssues([]);
          setLoading(false);
        }
      });
      
      return () => unsubscribePosts();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 border-b 
          bg-white/90 backdrop-blur-md shadow-sm h-16">
        <button onClick={() => navigate(-1)} className="text-gray-700 text-xl">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">My Issues</h1>
        <button className="text-[#782048] text-xl">
          <MegaphoneIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 py-6 space-y-4">
        {issues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No issues reported yet</p>
          </div>
        ) : (
          issues.map((issue, index) => {
            const config = statusConfig[issue.status] || statusConfig.pending;
            const isLatest = index === 0;

            return (
              <Link
                key={issue.id}
                to={`/details/${issue.id}`}
                className={`flex items-center p-4 bg-white rounded-2xl shadow hover:shadow-md transition border ${config.border}`}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 mr-4 
                    rounded-xl ${config.bg} border ${config.border} shadow-sm relative`}
                >
                  {config.icon}
                  {isLatest && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 shadow animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm sm:text-base">
                    {issue.summary || 'Issue reported'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {issue.category} • {issue.reportedTime || 'Recently'}
                  </div>
                  {issue.assignedPersonnel && (
                    <div className="text-xs text-blue-600 mt-1">
                      Assigned to: {issue.assignedPersonnel.name}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${config.bg} ${config.text} border ${config.border}`}
                  >
                    {issue.status.toUpperCase()}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Priority: {issue.priority}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}