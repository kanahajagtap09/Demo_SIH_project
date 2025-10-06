import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDocs,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import {
  FaHeart,
  FaComment,
  FaPaperPlane,
  FaBookmark,
  FaSpinner,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaUserTie,
  FaSpinner as FaProgress,
  FaCheckCircle,
} from "react-icons/fa";
import SuggestionsBar from "./Sugestionbar";
import { useNavigate } from "react-router-dom";
import geotagphoto from "../assets/geotagMapphoto.webp";
import ScrollNavbar from "./ScrollNavbar";
import verifyTick from "../assets/Blue_tick.png";

// ----------------- Safe Photo Resolver -----------------
const resolvePhotoURL = (val) => {
  if (typeof val !== "string" || !val.trim()) {
    return "/default-avatar.png";
  }
  if (val.startsWith("data:")) return val;
  if (val.startsWith("http")) return val;
  if (val.startsWith("/") || val.includes("default-avatar")) return val;
  if (val.length > 100 && !val.includes("/") && !val.includes("http"))
    return `data:image/jpeg;base64,${val}`;
  return "/default-avatar.png";
};

// ----------------- User data helper -----------------
const getUserData = async (userId) => {
  if (!userId)
    return {
      id: "unknown",
      username: "Unknown",
      photoURL: "/default-avatar.png",
      userRole: "user",
    };
  try {
    const uRef = doc(db, "users", userId);
    const snap = await getDoc(uRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: userId,
        username: data.username || data.name || "Unknown",
        photoURL: resolvePhotoURL(data.profileImage || data.avatar || "/default-avatar.png"),
        userRole: data.userRole || "user",
      };
    }

    const civicRef = doc(db, "civicUsers", userId);
    const civicSnap = await getDoc(civicRef);
    if (civicSnap.exists()) {
      const data = civicSnap.data();
      return {
        id: userId,
        username: data.name || "Unknown",
        photoURL: resolvePhotoURL(data.profileImage || "/default-avatar.png"),
        userRole: "Department",
      };
    }
  } catch (err) {
    console.error("user fetch error:", err);
  }
  return {
    id: "unknown",
    username: "Unknown",
    photoURL: "/default-avatar.png",
    userRole: "user",
  };
};

// ----------------- Enhanced Status Badge -----------------
const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase();
  const cfg =
    {
      pending: {
        text: "Pending",
        gradient: "from-red-400 via-red-500 to-red-600",
        textColor: "text-white",
      },
      assign: {
        icon: <FaUserTie className="w-3 h-3" />,
        text: "Assigned",
        gradient: "from-amber-400 via-yellow-500 to-orange-500",
        textColor: "text-black",
      },
      "in-progress": {
        icon: <FaProgress className="w-3 h-3 animate-spin" />,
        text: "In Progress",
        gradient: "from-blue-500 via-blue-600 to-indigo-600",
        textColor: "text-white",
      },
      resolved: {
        icon: <FaCheckCircle className="w-3 h-3" />,
        text: "Resolved",
        gradient: "from-emerald-500 via-green-600 to-green-700",
        textColor: "text-white",
      },
      escalated: {
        icon: <FaExclamationTriangle className="w-3 h-3" />,
        text: "Escalated",
        gradient: "from-purple-500 via-purple-600 to-purple-700",
        textColor: "text-white",
      },
    }[s] || {
      icon: <FaExclamationTriangle className="w-3 h-3" />,
      text: status || "Unknown",
      gradient: "from-gray-400 to-gray-500",
      textColor: "text-white",
    };

  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-[2px] rounded-full bg-gradient-to-r ${cfg.gradient} ${cfg.textColor} text-[10px] uppercase font-semibold`}
    >
      {cfg.icon}
      <span>{cfg.text}</span>
    </div>
  );
};

// ----------------- Main Component -----------------
export default function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 697);

  const userCache = useRef({});
  const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem("likes") || "{}"));
  const [loadingStates, setLoadingStates] = useState({});
  const [ratingStates, setRatingStates] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 697);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    localStorage.setItem("likes", JSON.stringify(likes));
  }, [likes]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user ? user.uid : null);
      setAuthChecked(true);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!currentUserId) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const enriched = await Promise.all(
        docs.map(async (p) => {
          const uid = p.userId || p.uid;
          if (!userCache.current[uid]) userCache.current[uid] = await getUserData(uid);
          return { ...p, user: userCache.current[uid] };
        })
      );
      setPosts(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUserId]);

  useEffect(() => {
    const fetchCounts = async () => {
      const map = {};
      for (const post of posts) {
        const snap = await getDocs(collection(db, "posts", post.id, "comments"));
        map[post.id] = snap.size;
      }
      setCommentCounts(map);
    };
    if (posts.length > 0) fetchCounts();
  }, [posts]);

  const toggleLike = async (pid) => {
    if (!currentUserId) return;
    const ref = doc(db, "posts", pid);
    const liked = likes[pid];
    try {
      liked
        ? await updateDoc(ref, { likes: arrayRemove(currentUserId) })
        : await updateDoc(ref, { likes: arrayUnion(currentUserId) });
      setLikes((prev) => ({ ...prev, [pid]: !prev[pid] }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleFollowToggle = async (uid) => {
    if (!uid || !currentUserId) return;
    setLoadingStates((p) => ({ ...p, [uid]: true }));
    const uRef = doc(db, "users", currentUserId);
    const tRef = doc(db, "users", uid);
    const myF = doc(db, "users", currentUserId, "following", uid);
    const theirF = doc(db, "users", uid, "followers", currentUserId);
    const isF = followingIds.includes(uid);
    const batch = writeBatch(db);
    try {
      if (isF) {
        batch.update(uRef, { following: arrayRemove(uid), followingCount: increment(-1) });
        batch.delete(myF);
        batch.delete(theirF);
        await batch.commit();
        await updateDoc(tRef, { followersCount: increment(-1) });
        setFollowingIds((p) => p.filter((i) => i !== uid));
      } else {
        batch.update(uRef, { following: arrayUnion(uid), followingCount: increment(1) });
        batch.set(myF, { followedAt: serverTimestamp() });
        batch.set(theirF, { followedAt: serverTimestamp() });
        await batch.commit();
        await updateDoc(tRef, { followersCount: increment(1) });
        setFollowingIds((p) => [...p, uid]);
      }
    } catch (err) {
      console.error("follow error:", err);
    } finally {
      setLoadingStates((p) => ({ ...p, [uid]: false }));
    }
  };

  if (!authChecked) return <p className="text-center py-6">Checking authentication...</p>;
  if (!currentUserId)
    return <div className="text-center py-6 text-gray-600">🚀 Please log in to see posts.</div>;
  if (loading) return <p className="text-center py-6">Loading feed...</p>;

  return (
    <>
      {isMobile && <ScrollNavbar />}
      <div className="max-w-lg mx-auto mt-6 space-y-6">
        <SuggestionsBar />
        {posts.map((post) => {
          const liked = post.likes?.includes(currentUserId);
          const followed = followingIds.includes(post.user?.id);
          const load = loadingStates[post.user?.id];
          const avatar = post.user?.photoURL || "/default-avatar.png";
          const username = post.user?.username || "Unknown";
          const own = post.user?.id === currentUserId;

          return (
            <div
              key={post.id}
              className="overflow-hidden bg-[#eaf0ff] shadow-md border border-gray-200 rounded-3xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between px-4 pt-3">
                {/* Left User Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={avatar}
                    className="w-10 h-10 rounded-full border-2 border-purple-400 object-cover"
                    alt={username}
                  />
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      {username}
                      {post.user?.userRole === "Department" && (
                        <img src={verifyTick} alt="verified" className="w-4 h-4" />
                      )}
                    </p>
                    <p className="text-xs text-[#782048]">@{username}</p>
                    <p className="text-[10px] text-gray-500">
                      {formatDistanceToNow(post.createdAt?.toDate?.() || new Date(), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                {!own && (
                  <button
                    onClick={() => handleFollowToggle(post.user?.id)}
                    disabled={load}
                    className={`px-4 py-1 text-sm rounded-full font-bold transition ${
                      followed ? "bg-gray-200 text-gray-700" : "bg-blue-500 text-white"
                    }`}
                  >
                    {load ? <FaSpinner className="animate-spin inline w-4 h-4" /> : followed ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Image + GeoTag below the image */}
              {post.imageUrl && (
                <div className="relative px-3 mt-2 mb-5">
                  <div className="relative rounded-4xl overflow-hidden bg-transparent">
                    <img
                      src={post.imageUrl}
                      className="w-full max-h-[380px] object-cover rounded-t-4xl"
                      alt=""
                    />

                    {/* Floating Status Badge */}
                    {post.status && (
                      <div className="absolute top-3 right-3 z-10">
                        <StatusBadge status={post.status} />
                      </div>
                    )}

                    {/* GeoTag — attached below the image */}
                    {post.geoData && (
                      <div className="w-full text-white flex overflow-hidden bg-black/85 rounded-b-4xl shadow-lg">
                        <div className="w-24 sm:w-28 h-24 flex-shrink-0">
                          <img
                            src={geotagphoto}
                            alt="Map Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-white flex flex-col justify-center px-3 py-2 flex-1 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 mb-1">
                            <FaMapMarkerAlt className="text-red-500 w-3 h-3 sm:w-4 sm:h-4" />
                            <p className="font-semibold">{post.geoData.country || "Unknown Country"}</p>
                          </div>
                          {post.geoData.state && (
                            <p className="text-[11px] sm:text-xs">{post.geoData.state}</p>
                          )}
                          {post.geoData.city && (
                            <p className="text-[11px] sm:text-xs font-medium">{post.geoData.city}</p>
                          )}
                          {post.geoData.address && (
                            <p className="text-[10px] italic sm:text-[11px] mt-1 truncate">
                              {post.geoData.address}
                            </p>
                          )}
                          <p className="text-[10px] sm:text-[11px] mt-1">
                            🌐 Lat: {post.geoData.latitude?.toFixed(4)}, Lng:{" "}
                            {post.geoData.longitude?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Caption, Rating, and Tags */}
                    <div className="px-4 py-3 backdrop-blur-sm">
                      {post.description && (
                        <p className="text-lg font-semibold text-gray-800 mb-2">
                          {post.description}
                        </p>
                      )}
                      {post.text && (
                        <p className="text-sm text-gray-600 mb-2">{post.text}</p>
                      )}

                      {/* Ratings section unchanged */}
                      {(post.isResolved || post.isEscalated) && (
                        <div className="space-y-2 mb-2">
                          {/* Work quality */}
                          {post.isResolved && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-700">
                                  Rate Work Quality:
                                </span>
                                <span className="text-xs text-blue-600">
                                  {post.publicRatings?.work?.count || 0} ratings
                                  {post.publicRatings?.work?.average && (
                                    <span className="ml-1">
                                      | Avg:{" "}
                                      {post.publicRatings.work.average.toFixed(1)}/5
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() =>
                                        setRatingStates((prev) => ({
                                          ...prev,
                                          [`${post.id}_work`]: star,
                                        }))
                                      }
                                      className={`text-lg transition-colors hover:scale-110 ${
                                        star <=
                                        (ratingStates[`${post.id}_work`] ||
                                          post.publicRatings?.work?.userRating?.[
                                            currentUserId
                                          ] ||
                                          0)
                                          ? "text-yellow-400"
                                          : "text-gray-300 hover:text-yellow-200"
                                      }`}
                                    >
                                      ⭐
                                    </button>
                                  ))}
                                </div>
                                {ratingStates[`${post.id}_work`] && (
                                  <button
                                    onClick={() =>
                                      handlePublicRating(
                                        post.id,
                                        "work",
                                        ratingStates[`${post.id}_work`]
                                      )
                                    }
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700"
                                  >
                                    Submit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Escalation validity */}
                          {post.isEscalated && (
                            <div className="bg-orange-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-orange-700">
                                  Rate Escalation Validity:
                                </span>
                                <span className="text-xs text-orange-600">
                                  {post.publicRatings?.escalation?.count || 0} ratings
                                  {post.publicRatings?.escalation?.average && (
                                    <span className="ml-1">
                                      | Avg:{" "}
                                      {post.publicRatings.escalation.average.toFixed(1)}/5
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() =>
                                        setRatingStates((prev) => ({
                                          ...prev,
                                          [`${post.id}_escalation`]: star,
                                        }))
                                      }
                                      className={`text-lg transition-colors hover:scale-110 ${
                                        star <=
                                        (ratingStates[`${post.id}_escalation`] ||
                                          post.publicRatings?.escalation?.userRating?.[
                                            currentUserId
                                          ] ||
                                          0)
                                          ? "text-yellow-400"
                                          : "text-gray-300 hover:text-yellow-200"
                                      }`}
                                    >
                                      ⭐
                                    </button>
                                  ))}
                                </div>
                                {ratingStates[`${post.id}_escalation`] && (
                                  <button
                                    onClick={() =>
                                      handlePublicRating(
                                        post.id,
                                        "escalation",
                                        ratingStates[`${post.id}_escalation`]
                                      )
                                    }
                                    className="px-3 py-1 bg-orange-600 text-white text-xs rounded-full hover:bg-orange-700"
                                  >
                                    Submit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {post.tags && post.tags.length > 0 && (
                        <p className="text-sm text-blue-600 flex flex-wrap gap-2">
                          {post.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="hover:text-blue-800 cursor-pointer"
                              onClick={() =>
                                navigate(`/explore/tags/${tag.replace("#", "")}`)
                              }
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between bg-gray-600 px-4 py-2">
                      <div className="flex gap-6 text-gray-300 text-lg">
                        <div
                          onClick={() => navigate(`/comments/${post.id}`)}
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-300"
                        >
                          <FaComment />
                          <span className="text-sm">{commentCounts[post.id] || 0}</span>
                        </div>
                        <div
                          onClick={() => toggleLike(post.id)}
                          className="flex items-center gap-1 cursor-pointer hover:text-red-300"
                        >
                          <FaHeart className={liked ? "text-red-500" : ""} />
                          <span className="text-sm">{post.likes?.length || 0}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-lg text-gray-300">
                        <FaPaperPlane className="cursor-pointer hover:text-green-500" />
                        <FaBookmark className="cursor-pointer hover:text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}