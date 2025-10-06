import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase/firebase";
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaLocationArrow, FaMapMarkerAlt } from "react-icons/fa";
import L from "leaflet";

// Marker images
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom user icon
const userIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMDA3QkZGIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDA3QkZGIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom destination icon
const destinationIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkY0NDU4Ij48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNSA1LjEzIDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ny0zLjEzLTctNy03em0wIDkuNWMtMS4zOCAwLTIuNS0xLjEyLTIuNS0yLjVzMS4xMi0yLjUgMi41LTIuNSAyLjUgMS4xMiAyLjUgMi41LTEuMTIgMi41LTIuNSAyLjV6Ii8+PC9zdmc+",
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
});

// Category-specific icons with symbols
const categoryIcons = {
  pwd: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InB3ZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGNjkwMCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0ZGOEUwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBmaWxsPSJ1cmwoI3B3ZCkiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTE1IDEyaDEwdjNIMTVWMTJabTAgNGgxMHYzSDE1di0zWm0wIDRoMTB2M0gxNXYtM1ptMCA0aDEwdjNIMTV2LTNaIiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  water: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9IndhdGVyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDA5NkZGIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDBCQ0ZGIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9InVybCgjd2F0ZXIpIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMyIvPjxwYXRoIGQ9Ik0yMCAxMGMtMyAwLTYgNC02IDhzMyA4IDYgOCA2LTQgNi04LTMtOC02LThaIiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  electricity: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImVsZWMiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRkQ3MDAiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRkY5MDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0idXJsKCNlbGVjKSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48cGF0aCBkPSJNMjIgMTBsLTQgMTBoNGwtMiAxMGg0bC02LTEwaDRsLTQtMTBaIiBmaWxsPSIjMzMzIi8+PC9zdmc+",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  traffic: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InRyYWZmaWMiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjAwMDAiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjQ0MDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0idXJsKCN0cmFmZmljKSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48cmVjdCB4PSIxNiIgeT0iMTAiIHdpZHRoPSI4IiBoZWlnaHQ9IjIwIiByeD0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTQiIHI9IjIiIGZpbGw9IiNGRjAwMDAiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjRkZENzAwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIyNiIgcj0iMiIgZmlsbD0iIzAwRkY4OCIvPjwvc3ZnPg==",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  health: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImhlYWx0aCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwRkY4OCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwRkZBQSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBmaWxsPSJ1cmwoI2hlYWx0aCkiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTE4IDEyaDR2Nmg2djRoLTZ2NmgtNHYtNmgtNnYtNGg2di02WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  swm: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InN3bSIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwODA0MCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwQTA1NSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBmaWxsPSJ1cmwoI3N3bSkiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTMiIHk9IjE0IiB3aWR0aD0iMTQiIGhlaWdodD0iMTIiIHJ4PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMTUiIHk9IjEyIiB3aWR0aD0iMTAiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  environment: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImVudiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzIyQzU1RSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzMzRDA3NSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBmaWxsPSJ1cmwoI2VudikiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTIwIDEwYzAtMiAyLTIgMiAwdjRjMCAyLTIgMi0yIDBWMTBabS00IDRjMC0yIDItMiAyIDB2NGMwIDItMiAyLTIgMHYtNFptOCAwYzAtMiAyLTIgMiAwdjRjMCAyLTIgMi0yIDB2LTRabS00IDhjLTQgMC04IDQtOCA4aDEyYzAtNC00LTgtOC04WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  disaster: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImRpc2FzdGVyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjOEIwMEZGIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjQTQ0NEZGIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9InVybCgjZGlzYXN0ZXIpIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMyIvPjxwYXRoIGQ9Ik0yMCAxMGwtMyA2aDZsLTMtNlptMCA4bC0zIDZoNmwtMy02Wm0wIDhsLTMgNmg2bC0zLTZaIiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  }),
  default: new L.Icon({
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImRlZmF1bHQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM2MzY2RjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM4QjVDRjYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0idXJsKCNkZWZhdWx0KSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSI4IiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
};

// Get icon based on department
const getPostIcon = (department) => {
  const dept = department?.toLowerCase();
  return categoryIcons[dept] || categoryIcons.default;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const Map = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const mapRef = useRef();
  const navigate = useNavigate();

  // Function to render post markers
  const renderPostMarker = (post) => {
    if (!post.geoData || !post.geoData.latitude || !post.geoData.longitude) {
      return null;
    }

    const icon = getPostIcon(post.department || post.category);

    return (
      <Marker 
        key={post.id} 
        position={[post.geoData.latitude, post.geoData.longitude]} 
        icon={icon}
      >
        <Popup maxWidth={320} className="modern-popup">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-0 p-0 m-0">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={post.user?.photoURL || "/default-avatar.png"}
                    alt={post.user?.username || "Unknown"}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{post.user?.username || "Unknown"}</h3>
                  <p className="text-white/80 text-sm">📍 {post.geoData.city || 'Unknown Location'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {post.imageUrl && (
                <div className="mb-4 -mx-4">
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}
              
              {post.description && (
                <p className="text-gray-800 mb-3 leading-relaxed">{post.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  {post.geoData.address || `${post.geoData.city || ''}, ${post.geoData.country || ''}`}
                </div>
                <div className="flex items-center justify-between">
                  {post.department && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                      {post.department.toUpperCase()}
                    </span>
                  )}
                  {post.status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      post.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      post.status === 'at progress' ? 'bg-blue-100 text-blue-700' :
                      post.status === 'assign' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {post.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  };

  // Fetch posts and issues with geo data
  useEffect(() => {
    const fetchPostsAndIssues = async () => {
      const allItems = [];
      
      // Fetch posts
      const postsQuery = query(collection(db, "posts"));
      const postsUnsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        const postsWithGeo = [];
        
        for (const docSnap of snapshot.docs) {
          const postData = { id: docSnap.id, ...docSnap.data(), type: 'post' };
          
          if (postData.geoData && postData.geoData.latitude && postData.geoData.longitude) {
            try {
              const userId = postData.uid || postData.userId;
              if (!userId) {
                postsWithGeo.push({
                  ...postData,
                  user: { username: "Unknown", photoURL: "/default-avatar.png" }
                });
                continue;
              }
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : {};
              
              postsWithGeo.push({
                ...postData,
                user: {
                  username: userData.username || userData.name || "Unknown",
                  photoURL: userData.profileImage || "/default-avatar.png"
                }
              });
            } catch (error) {
              console.error("Error fetching user data:", error);
              postsWithGeo.push({
                ...postData,
                user: { username: "Unknown", photoURL: "/default-avatar.png" }
              });
            }
          }
        }
        
        // Fetch issues
        const issuesQuery = query(collection(db, "issues"));
        const issuesUnsubscribe = onSnapshot(issuesQuery, async (issuesSnapshot) => {
          const issuesWithGeo = [];
          
          for (const docSnap of issuesSnapshot.docs) {
            const issueData = { id: docSnap.id, ...docSnap.data(), type: 'issue' };
            
            if (issueData.geoData && issueData.geoData.latitude && issueData.geoData.longitude) {
              try {
                const userId = issueData.uid || issueData.userId;
                if (!userId) {
                  issuesWithGeo.push({
                    ...issueData,
                    user: { username: "Unknown", photoURL: "/default-avatar.png" }
                  });
                  continue;
                }
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                
                issuesWithGeo.push({
                  ...issueData,
                  user: {
                    username: userData.username || userData.name || "Unknown",
                    photoURL: userData.profileImage || "/default-avatar.png"
                  }
                });
              } catch (error) {
                console.error("Error fetching user data:", error);
                issuesWithGeo.push({
                  ...issueData,
                  user: { username: "Unknown", photoURL: "/default-avatar.png" }
                });
              }
            }
          }
          
          // Combine posts and issues
          setPosts([...postsWithGeo, ...issuesWithGeo]);
        });
        
        return issuesUnsubscribe;
      });
      
      return postsUnsubscribe;
    };
    
    const unsubscribe = fetchPostsAndIssues();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Detect & center map on user
  useEffect(() => {

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          setIsLoading(false);
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setIsLoading(false);
          const fallback = [40.7128, -74.006]; // NYC
          setUserLocation(fallback);
          if (mapRef.current) {
            mapRef.current.setView(fallback, 13);
          }
        }
      );
    }
  }, []);

  // Fetch route using OSRM
  const fetchRoute = async (start, end) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        setRouteCoords(coords);
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1) + " km",
          duration: Math.round(route.duration / 60) + " min",
        });
      }
    } catch (err) {
      console.error("Routing error:", err);
    }
  };

  const handleMapClick = (latlng) => {
    setDestination([latlng.lat, latlng.lng]);
    if (userLocation) fetchRoute(userLocation, [latlng.lat, latlng.lng]);
  };

  const recenterMap = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 15);
    }
  };

  return (
    <div className="relative h-screen w-screen bg-gray-100">
      <div className="h-full w-full md:h-screen">
        <div className="relative h-[calc(100vh-128px)] md:h-full w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <MapContainer
              center={userLocation || [40.7128, -74.006]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              ref={mapRef}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                maxZoom={19}
              />

              <MapClickHandler onMapClick={handleMapClick} />

              {userLocation && (
                <>
                  <CircleMarker
                    center={userLocation}
                    radius={20}
                    fillColor="#007BFF"
                    fillOpacity={0.2}
                    stroke={false}
                    className="animate-pulse"
                  />
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                      <div className="text-center">
                        <FaLocationArrow className="text-blue-600 mx-auto mb-1" />
                        <p className="font-semibold">You are here</p>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {destination && (
                <Marker position={destination} icon={destinationIcon}>
                  <Popup>
                    <div className="text-center">
                      <FaMapMarkerAlt className="text-red-600 mx-auto mb-1" />
                      <p className="font-semibold">Destination</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Post Markers */}
              {posts.map(renderPostMarker)}

              {routeCoords.length > 0 && (
                <>
                  <Polyline
                    positions={routeCoords}
                    color="black"
                    weight={8}
                    opacity={0.15}
                  />
                  <Polyline
                    positions={routeCoords}
                    color="#4285F4"
                    weight={6}
                    opacity={0.8}
                  />
                </>
              )}
            </MapContainer>
          )}

          {/* Floating Controls (moved down to clear nav) */}
          <div className="absolute top-20 left-4 right-4 z-[1000] flex justify-between items-start">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
              >
                <FaArrowLeft className="text-gray-700" />
                <span className="font-medium text-sm text-gray-700 hidden sm:inline">
                  Back
                </span>
              </button>
              
              {/* Category Legend */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 max-w-xs">
                <h3 className="text-xs font-bold text-gray-700 mb-2">Categories</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-gray-600">PWD</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-gray-600">Water</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center">
                      <div className="w-1 h-2 bg-gray-800 transform rotate-12"></div>
                    </div>
                    <span className="text-gray-600">Electric</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                      <div className="w-1 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-gray-600">Traffic</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                      <div className="text-white text-[6px]">+</div>
                    </div>
                    <span className="text-gray-600">Health</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center">
                      <div className="w-2 h-1 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-gray-600">SWM</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={recenterMap}
              className="bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
              title="Center on my location"
            >
              <FaLocationArrow className="text-blue-600" />
            </button>
          </div>

          {/* Route Info Card */}
          {routeInfo && (
            <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 backdrop-blur-sm bg-opacity-95">
                <div className="flex items-center justify-around gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Distance
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {routeInfo.distance}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Duration
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {routeInfo.duration}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!destination && (
            <div className="absolute top-36 left-1/2 -translate-x-1/2 z-[999]">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                <p className="text-sm text-gray-600">
                  Tap on the map to set destination
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;