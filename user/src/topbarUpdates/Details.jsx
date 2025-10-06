import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

const statusConfig = {
  pending: { color: "text-orange-600", bg: "bg-orange-100", icon: ExclamationCircleIcon },
  assign: { color: "text-yellow-600", bg: "bg-yellow-100", icon: UserIcon },
  "at progress": { color: "text-blue-600", bg: "bg-blue-100", icon: WrenchScrewdriverIcon },
  resolved: { color: "text-green-600", bg: "bg-green-100", icon: CheckCircleIcon },
};

export default function Details() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const issueRef = doc(db, "issues", id);
      const unsubscribe = onSnapshot(issueRef, (doc) => {
        if (doc.exists()) {
          setIssue({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Issue not found</p>
      </div>
    );
  }

  const config = statusConfig[issue.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 border-b bg-white/90 backdrop-blur-md shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-700">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Issue Details</h1>
        <div></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${config.bg}`}>
              <StatusIcon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{issue.summary}</h2>
              <p className={`text-sm font-medium ${config.color}`}>
                {issue.status.toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium">{issue.category}</p>
            </div>
            <div>
              <p className="text-gray-500">Priority</p>
              <p className={`font-medium ${
                issue.priority === 'High' ? 'text-red-600' :
                issue.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {issue.priority}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-500" />
            Timeline
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Reported</p>
                <p className="text-sm text-gray-500">{issue.reportedTime || 'Recently'}</p>
              </div>
            </div>
            
            {issue.assignedTime && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Assigned</p>
                  <p className="text-sm text-gray-500">{issue.assignedTime}</p>
                  {issue.assignedPersonnel && (
                    <p className="text-sm text-blue-600">
                      To: {issue.assignedPersonnel.name}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {issue.etaTime && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Expected Completion</p>
                  <p className="text-sm text-gray-500">{issue.etaTime}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {issue.geoData && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-gray-500" />
              Location
            </h3>
            <p className="text-gray-700">{issue.geoData.address}</p>
            <p className="text-sm text-gray-500 mt-1">
              {issue.geoData.city}, {issue.geoData.country}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Lat: {issue.geoData.latitude?.toFixed(6)}, 
              Lng: {issue.geoData.longitude?.toFixed(6)}
            </p>
          </div>
        )}

        {/* Update History */}
        {issue.updateHistory && issue.updateHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Update History</h3>
            <div className="space-y-3">
              {issue.updateHistory.map((update, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium capitalize">{update.status}</p>
                    <p className="text-sm text-gray-500">by {update.updatedBy}</p>
                  </div>
                  <p className="text-sm text-gray-500">{update.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personnel Info */}
        {issue.assignedPersonnel && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gray-500" />
              Assigned Personnel
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{issue.assignedPersonnel.name}</p>
                <p className="text-sm text-gray-500">{issue.assignedPersonnel.department}</p>
                {issue.assignedPersonnel.contact && (
                  <p className="text-sm text-blue-600">{issue.assignedPersonnel.contact}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}