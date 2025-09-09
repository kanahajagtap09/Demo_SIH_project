// import React, { useEffect, useState, useRef } from "react";
// import { db } from "../firebase/firebase";
// import {
//   collection,
//   query,
//   orderBy,
//   onSnapshot,
//   doc,
//   getDoc,
//   getDocs,
// } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { formatDistanceToNow } from "date-fns";
// import { FaHeart, FaComment, FaPaperPlane, FaBookmark } from "react-icons/fa";
// import SuggestionsBar from "./Sugestionbar";
// import { useNavigate } from "react-router-dom";

// // ----------------- User data helper -----------------
// const getUserData = async (userId) => {
//   try {
//     const uRef = doc(db, "users", userId);
//     const snap = await getDoc(uRef);
//     if (snap.exists()) {
//       const data = snap.data();
//       return {
//         id: userId,
//         username: data.username || data.name || "Unknown",
//         photoURL:
//           data.profileImage?.startsWith("http") || data.profileImage?.startsWith("data:")
//             ? data.profileImage
//             : data.profileImage
//             ? `data:image/jpeg;base64,${data.profileImage}`
//             : "/default-avatar.png",
//       };
//     }
//   } catch (err) {
//     console.error("user fetch error:", err);
//   }
//   return { username: "Unknown", photoURL: "/default-avatar.png" };
// };

// // ----------------- Main PostList --------------------
// export default function PostList() {
//   const [posts, setPosts] = useState([]);
//   const [suggestedPosts, setSuggestedPosts] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const userCache = useRef({});
//   const [followingIds, setFollowingIds] = useState([]);
//   const [currentUserId, setCurrentUserId] = useState(null);

//   // demo-only states
//   const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem("likes") || "{}"));
//   const [follows, setFollows] = useState({});
//   const navigate = useNavigate();

//   // persist likes
//   useEffect(() => {
//     localStorage.setItem("likes", JSON.stringify(likes));
//   }, [likes]);

//   const getCommentCount = (pid) => {
//     const stored = localStorage.getItem(`comments_${pid}`);
//     return stored ? JSON.parse(stored).length : 0;
//   };

//   // fetch following list
//   useEffect(() => {
//     const auth = getAuth();
//     const user = auth.currentUser;
//     if (!user) {
//       setFollowingIds([]);
//       setCurrentUserId(null);
//       setLoading(false);
//       return;
//     }
//     setCurrentUserId(user.uid);
//     const fetchFollowing = async () => {
//       const followingCol = collection(db, "users", user.uid, "following");
//       const snap = await getDocs(followingCol);
//       setFollowingIds(snap.docs.map((d) => d.id));
//     };
//     fetchFollowing();
//   }, []);

//   // fetch posts
//   useEffect(() => {
//     if (!currentUserId) {
//       setPosts([]);
//       setLoading(false);
//       return;
//     }
//     setLoading(true);

//     const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
//     const unsub = onSnapshot(q, async (snap) => {
//       const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

//       if (followingIds.length > 0) {
//         const filtered = docs.filter((p) => followingIds.includes(p.userId));
//         const enriched = await Promise.all(
//           filtered.map(async (p) => {
//             if (!userCache.current[p.userId]) {
//               userCache.current[p.userId] = await getUserData(p.userId);
//             }
//             return { ...p, user: userCache.current[p.userId] };
//           })
//         );
//         setPosts(enriched);
//         setSuggestedPosts([]);
//       } else {
//         // If not following anyone → show suggestions random 3
//         const enriched = await Promise.all(
//           docs
//             .sort(() => 0.5 - Math.random())
//             .slice(0, 3)
//             .map(async (p) => {
//               if (!userCache.current[p.userId]) {
//                 userCache.current[p.userId] = await getUserData(p.userId);
//               }
//               return { ...p, user: userCache.current[p.userId] };
//             })
//         );
//         setPosts([]);
//         setSuggestedPosts(enriched);
//       }
//       setLoading(false);
//     });

//     return () => unsub();
//   }, [currentUserId, followingIds]);

//   // toggles
//   const toggleLike = (pid) => setLikes((prev) => ({ ...prev, [pid]: !prev[pid] }));
//   const toggleFollow = (uid) => setFollows((prev) => ({ ...prev, [uid]: !prev[uid] }));

//   if (loading) return <p className="text-center py-6">Loading feed...</p>;

//   return (
//     <div className="max-w-md mx-auto mt-6 space-y-8">
//       <SuggestionsBar />

//       {/* Followed posts */}
//       {posts.length > 0 &&
//         posts.map((post) => {
//           const liked = likes[post.id] || false;
//           const followed = follows[post.user?.id] || false;
//           const avatar = post.user?.photoURL || "/default-avatar.png";
//           const username = post.user?.username || "Unknown";

//           return (
//             <div key={post.id} className="bg-white rounded-lg border shadow mb-6">
//               {/* Header */}
//               <div className="flex items-center justify-between p-4">
//                 <div className="flex items-center gap-3">
//                   <img src={avatar} className="w-10 h-10 rounded-full border" alt="" />
//                   <div>
//                     <p className="text-sm font-medium">{username}</p>
//                     <p className="text-xs text-gray-500">
//                       {formatDistanceToNow(post.createdAt?.toDate?.() || new Date(), { addSuffix: true })}
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => toggleFollow(post.user?.id)}
//                   className={`px-3 py-1 text-sm rounded-full ${
//                     followed ? "bg-gray-100 text-gray-700 border hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"
//                   }`}
//                 >
//                   {followed ? "Unfollow" : "Follow"}
//                 </button>
//               </div>

//               {post.image && <img src={post.image} className="w-full object-cover max-h-[400px]" alt="" />}

//               {/* Actions */}
//               <div className="flex items-center justify-between px-4 py-2">
//                 <div className="flex gap-4 text-xl text-gray-700">
//                   <div className="flex items-center gap-1">
//                     <FaHeart
//                       onClick={() => toggleLike(post.id)}
//                       className={`cursor-pointer ${liked ? "text-red-500" : "hover:text-red-400"}`}
//                     />
//                     <span className="text-sm">{liked ? 1 : 0}</span>
//                   </div>
//                   <div
//                     onClick={() => navigate(`/comments/${post.id}`)}
//                     className="flex items-center gap-1 hover:text-blue-500 cursor-pointer"
//                   >
//                     <FaComment />
//                     <span className="text-sm">{getCommentCount(post.id)}</span>
//                   </div>
//                   <FaPaperPlane className="hover:text-green-500 cursor-pointer" />
//                 </div>
//                 <FaBookmark className="cursor-pointer hover:text-yellow-500" />
//               </div>

//               {/* Caption */}
//               <div className="px-4 pb-4 text-sm">
//                 <strong>{username}</strong> {post.text}
//               </div>
//             </div>
//           );
//         })}

//       {/* Suggested posts if no following */}
//       {followingIds.length === 0 &&
//         suggestedPosts.map((post) => {
//           const liked = likes[post.id] || false;
//           const followed = follows[post.user?.id] || false;
//           return (
//             <div key={post.id} className="bg-white rounded-lg border shadow mb-6">
//               <div className="flex items-center justify-between p-4">
//                 <div className="flex items-center gap-3">
//                   <img src={post.user?.photoURL} className="w-10 h-10 rounded-full border" alt="" />
//                   <div>
//                     <p className="text-sm font-medium">{post.user?.username}</p>
//                     <p className="text-xs text-gray-400">Suggested for you</p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => toggleFollow(post.user?.id)}
//                   className={`px-3 py-1 text-sm rounded-full ${
//                     followed ? "bg-gray-100 text-gray-700 border hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"
//                   }`}
//                 >
//                   {followed ? "Unfollow" : "Follow"}
//                 </button>
//               </div>

//               {post.image && <img src={post.image} className="w-full max-h-[400px] object-cover" alt="" />}

//               <div className="flex items-center justify-between px-4 py-2">
//                 <div className="flex gap-4 text-xl text-gray-700">
//                   <div className="flex items-center gap-1">
//                     <FaHeart
//                       onClick={() => toggleLike(post.id)}
//                       className={`cursor-pointer ${liked ? "text-red-500" : "hover:text-red-400"}`}
//                     />
//                     <span className="text-sm">{liked ? 1 : 0}</span>
//                   </div>
//                   <div
//                     onClick={() => navigate(`/comments/${post.id}`)}
//                     className="flex items-center gap-1 hover:text-blue-500 cursor-pointer"
//                   >
//                     <FaComment />
//                     <span className="text-sm">{getCommentCount(post.id)}</span>
//                   </div>
//                   <FaPaperPlane className="hover:text-green-500 cursor-pointer" />
//                 </div>
//                 <FaBookmark className="cursor-pointer hover:text-yellow-500" />
//               </div>
//             </div>
//           );
//         })}
//     </div>
//   );
// }


import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { FaHeart, FaComment, FaPaperPlane, FaBookmark } from "react-icons/fa";
import SuggestionsBar from "./Sugestionbar";
import { useNavigate } from "react-router-dom";

// ----------------- User data helper -----------------
const getUserData = async (userId) => {
  try {
    const uRef = doc(db, "users", userId);
    const snap = await getDoc(uRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: userId,
        username: data.username || data.name || "Unknown",
        photoURL:
          data.profileImage?.startsWith("http") || data.profileImage?.startsWith("data:")
            ? data.profileImage
            : data.profileImage
            ? `data:image/jpeg;base64,${data.profileImage}`
            : "/default-avatar.png",
      };
    }
  } catch (err) {
    console.error("user fetch error:", err);
  }
  return { username: "Unknown", photoURL: "/default-avatar.png" };
};

// ----------------- Main PostList --------------------
export default function PostList() {
  const [posts, setPosts] = useState([]);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const userCache = useRef({});
  const [followingIds, setFollowingIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // demo-only states
  const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem("likes") || "{}"));
  const [follows, setFollows] = useState({});
  const navigate = useNavigate();

  // persist likes
  useEffect(() => {
    localStorage.setItem("likes", JSON.stringify(likes));
  }, [likes]);

  const getCommentCount = (pid) => {
    const stored = localStorage.getItem(`comments_${pid}`);
    return stored ? JSON.parse(stored).length : 0;
  };

  // fetch following list
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setFollowingIds([]);
      setCurrentUserId(null);
      setLoading(false);
      return;
    }
    setCurrentUserId(user.uid);
    const fetchFollowing = async () => {
      const followingCol = collection(db, "users", user.uid, "following");
      const snap = await getDocs(followingCol);
      setFollowingIds(snap.docs.map((d) => d.id));
    };
    fetchFollowing();
  }, []);

  // fetch posts
  useEffect(() => {
    if (!currentUserId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (followingIds.length > 0) {
        const filtered = docs.filter((p) => followingIds.includes(p.userId));
        const enriched = await Promise.all(
          filtered.map(async (p) => {
            if (!userCache.current[p.userId]) {
              userCache.current[p.userId] = await getUserData(p.userId);
            }
            return { ...p, user: userCache.current[p.userId] };
          })
        );
        setPosts(enriched);
        setSuggestedPosts([]);
      } else {
        // If not following anyone → show suggestions random 3
        const enriched = await Promise.all(
          docs
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(async (p) => {
              if (!userCache.current[p.userId]) {
                userCache.current[p.userId] = await getUserData(p.userId);
              }
              return { ...p, user: userCache.current[p.userId] };
            })
        );
        setPosts([]);
        setSuggestedPosts(enriched);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [currentUserId, followingIds]);

  // toggles
  const toggleLike = (pid) => setLikes((prev) => ({ ...prev, [pid]: !prev[pid] }));
  const toggleFollow = (uid) => setFollows((prev) => ({ ...prev, [uid]: !prev[uid] }));

  if (loading) return <p className="text-center py-6">Loading feed...</p>;

  return (
    <div className="max-w-md mx-auto mt-6 space-y-8">
      <SuggestionsBar />

      {/* Followed posts */}
      {posts.length > 0 &&
        posts.map((post) => {
          const liked = likes[post.id] || false;
          const followed = follows[post.user?.id] || false;
          const avatar = post.user?.photoURL || "/default-avatar.png";
          const username = post.user?.username || "Unknown";

          return (
            <div key={post.id} className="bg-white rounded-lg border shadow mb-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <img src={avatar} className="w-10 h-10 rounded-full border" alt="" />
                  <div>
                    <p className="text-sm font-medium">{username}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(post.createdAt?.toDate?.() || new Date(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(post.user?.id)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    followed ? "bg-gray-100 text-gray-700 border hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {followed ? "Unfollow" : "Follow"}
                </button>
              </div>

              {/* Post Image */}
              {post.image && <img src={post.image} className="w-full object-cover max-h-[400px]" alt="" />}

              {/* Geo + Timestamp info */}
              <div className="px-4 py-3 border-t text-sm text-gray-700 bg-gray-50">
                <p className="text-gray-500 mb-1">
                  🕒 {post.createdAt?.toDate
                    ? post.createdAt.toDate().toLocaleString("en-US", {
                        dateStyle: "full",
                        timeStyle: "long",
                      })
                    : "Unknown date"}
                </p>
                {post.geo && (
                  <>
                    <p>📍 {post.geo.address}</p>
                    <p className="text-xs text-gray-500">
                      Lat: {post.geo.latitude.toFixed(4)} | Lng: {post.geo.longitude.toFixed(4)}
                    </p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex gap-4 text-xl text-gray-700">
                  <div className="flex items-center gap-1">
                    <FaHeart
                      onClick={() => toggleLike(post.id)}
                      className={`cursor-pointer ${liked ? "text-red-500" : "hover:text-red-400"}`}
                    />
                    <span className="text-sm">{liked ? 1 : 0}</span>
                  </div>
                  <div
                    onClick={() => navigate(`/comments/${post.id}`)}
                    className="flex items-center gap-1 hover:text-blue-500 cursor-pointer"
                  >
                    <FaComment />
                    <span className="text-sm">{getCommentCount(post.id)}</span>
                  </div>
                  <FaPaperPlane className="hover:text-green-500 cursor-pointer" />
                </div>
                <FaBookmark className="cursor-pointer hover:text-yellow-500" />
              </div>

              {/* Caption */}
              <div className="px-4 pb-4 text-sm">
                <strong>{username}</strong> {post.text}
              </div>
            </div>
          );
        })}

      {/* Suggested posts if no following */}
      {followingIds.length === 0 &&
        suggestedPosts.map((post) => {
          const liked = likes[post.id] || false;
          const followed = follows[post.user?.id] || false;

          return (
            <div key={post.id} className="bg-white rounded-lg border shadow mb-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <img src={post.user?.photoURL} className="w-10 h-10 rounded-full border" alt="" />
                  <div>
                    <p className="text-sm font-medium">{post.user?.username}</p>
                    <p className="text-xs text-gray-400">Suggested for you</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(post.user?.id)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    followed ? "bg-gray-100 text-gray-700 border hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {followed ? "Unfollow" : "Follow"}
                </button>
              </div>

              {/* Image */}
              {post.image && <img src={post.image} className="w-full max-h-[400px] object-cover" alt="" />}

              {/* Geo + Timestamp for suggested */}
              <div className="px-4 py-3 border-t text-sm text-gray-700 bg-gray-50">
                <p className="text-gray-500 mb-1">
                  🕒 {post.createdAt?.toDate
                    ? post.createdAt.toDate().toLocaleString("en-US", {
                        dateStyle: "full",
                        timeStyle: "long",
                      })
                    : "Unknown date"}
                </p>
                {post.geo && (
                  <>
                    <p>📍 {post.geo.address}</p>
                    <p className="text-xs text-gray-500">
                      Lat: {post.geo.latitude.toFixed(4)} | Lng: {post.geo.longitude.toFixed(4)}
                    </p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex gap-4 text-xl text-gray-700">
                  <div className="flex items-center gap-1">
                    <FaHeart
                      onClick={() => toggleLike(post.id)}
                      className={`cursor-pointer ${liked ? "text-red-500" : "hover:text-red-400"}`}
                    />
                    <span className="text-sm">{liked ? 1 : 0}</span>
                  </div>
                  <div
                    onClick={() => navigate(`/comments/${post.id}`)}
                    className="flex items-center gap-1 hover:text-blue-500 cursor-pointer"
                  >
                    <FaComment />
                    <span className="text-sm">{getCommentCount(post.id)}</span>
                  </div>
                  <FaPaperPlane className="hover:text-green-500 cursor-pointer" />
                </div>
                <FaBookmark className="cursor-pointer hover:text-yellow-500" />
              </div>
            </div>
          );
        })}
    </div>
  );
}