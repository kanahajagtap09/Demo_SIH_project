import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

// Helper to get user data
const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const {
        username = data.name || "Unknown",
        profileImage = "",
        displayName = "",
      } = data;

      return {
        username,
        displayName,
        photoURL:
          profileImage && (profileImage.startsWith("data:") || profileImage.startsWith("http"))
            ? profileImage
            : profileImage
            ? `data:image/jpeg;base64,${profileImage}`
            : "",
      };
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
  return {
    username: "Unknown",
    displayName: "",
    photoURL: "",
  };
};

export default function Followers() {
  const [users, setUsers] = useState([]);
  const [followerIds, setFollowerIds] = useState([]);
  const [firestoreFollowersCount, setFirestoreFollowersCount] = useState(0);
  const [firestoreFollowingCount, setFirestoreFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("yourusername");

  useEffect(() => {
    const fetchUsersAndFollowers = async () => {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUsers([]);
        setFollowerIds([]);
        setFirestoreFollowersCount(0);
        setFirestoreFollowingCount(0);
        setLoading(false);
        return;
      }

      // 1. Fetch followers list
      const followersRef = collection(db, "users", currentUser.uid, "followers");
      const followersSnapshot = await getDocs(followersRef);
      const followerIds = followersSnapshot.docs.map((doc) => doc.id);

      // 2. Fetch user data for each follower
      const usersData = await Promise.all(
        followerIds.map(async (uid) => {
          const user = await getUserData(uid);
          return { id: uid, ...user };
        })
      );

      // 3. Fetch followersCount, followingCount, and username from Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let firestoreFollowersCount = 0;
      let firestoreFollowingCount = 0;
      let username = "yourusername";
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        firestoreFollowersCount = data.followersCount || 0;
        firestoreFollowingCount = data.followingCount || 0;
        username = data.username || data.name || "yourusername";
      }

      setUsers(usersData);
      setFollowerIds(followerIds);
      setFirestoreFollowersCount(firestoreFollowersCount);
      setFirestoreFollowingCount(firestoreFollowingCount);
      setUsername(username);
      setLoading(false);
    };

    fetchUsersAndFollowers();
  }, []);

  // Remove follower
  const handleRemoveFollower = async (uid) => {
    setUpdating((prev) => ({ ...prev, [uid]: true }));
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const myFollowersDoc = doc(db, "users", currentUser.uid, "followers", uid);
      const theirFollowingDoc = doc(db, "users", uid, "following", currentUser.uid);
      const userDocRef = doc(db, "users", currentUser.uid);
      const theirUserRef = doc(db, "users", uid);

      // Remove follower: delete from both sides and decrement counts
      await deleteDoc(myFollowersDoc);
      await deleteDoc(theirFollowingDoc);
      await updateDoc(userDocRef, { followersCount: increment(-1) });
      await updateDoc(theirUserRef, { followingCount: increment(-1) });

      setFollowerIds((prev) => prev.filter((id) => id !== uid));
      setFirestoreFollowersCount((prev) => prev - 1);
      setUsers((prev) => prev.filter((user) => user.id !== uid));
    } catch (err) {
      alert("Failed to remove follower. Try again.");
      console.error(err);
    }
    setUpdating((prev) => ({ ...prev, [uid]: false }));
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow border border-gray-200 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="font-bold text-lg">{username}</div>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="font-semibold">{firestoreFollowersCount.toLocaleString()} Followers</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{firestoreFollowingCount.toLocaleString()} Following</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">For you</span>
          </div>
        </div>
        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* Followers List */}
      <div className="pb-4">
        {loading ? (
          <ul>
            {[...Array(6)].map((_, i) => (
              <li key={i} className="flex items-center px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
                <div className="ml-4 px-5 py-2 rounded-full bg-gray-200 w-20 h-8" />
              </li>
            ))}
          </ul>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No followers found.</div>
        ) : (
          <ul>
            {filteredUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center px-4 py-3 hover:bg-gray-50 transition rounded-lg"
              >
                <img
                  src={user.photoURL || "https://placehold.co/40x40"}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover border border-gray-300"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{user.username}</div>
                  <div className="text-sm text-gray-500 truncate">{user.displayName}</div>
                </div>
                <button
                  className={`ml-4 px-5 py-2 rounded-full border font-semibold transition-all duration-200
                    ${updating[user.id]
                      ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-red-500 text-white border-red-500 hover:bg-red-600 active:scale-95"
                    }`}
                  disabled={updating[user.id]}
                  onClick={() => handleRemoveFollower(user.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}