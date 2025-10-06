import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
  increment,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import verifyTick from "../assets/Blue_tick.png"; // 🔹 Added

function getRandomItems(arr, n) {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export default function SuggestionsBar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});

  useEffect(() => {
    const auth = getAuth();
    setCurrentUser(auth.currentUser);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    async function fetchSuggestions() {
      setLoading(true);
      try {
        // 1. Get current user's following list
        const followingCol = collection(
          db,
          "users",
          currentUser.uid,
          "following"
        );
        const followingSnap = await getDocs(followingCol);
        const followingList = followingSnap.docs.map((docu) => docu.id);
        setFollowing(followingList);

        // 2. Get all users
        const usersSnap = await getDocs(collection(db, "users"));
        const allUsers = [];
        usersSnap.forEach((docu) => {
          const data = docu.data();
          if (
            docu.id !== currentUser.uid &&
            !followingList.includes(docu.id)
          ) {
            allUsers.push({
              uid: docu.id,
              username: data.username || data.name || "Unknown",
              handle:
                data.handle || data.username || data.name || "unknown",
              profileImage: data.profileImage || "/default-avatar.png",
              followersCount:
                typeof data.followersCount === "number"
                  ? data.followersCount
                  : 0,
              userRole: data.userRole || "user",
            });
          }
        });

        // 3. Show all users as suggestions
        setSuggestions(allUsers);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, [currentUser]);

  const handleFollowToggle = async (userId) => {
    if (!currentUser) return;

    setLoadingStates((prev) => ({ ...prev, [userId]: true }));

    const userRef = doc(db, "users", currentUser.uid);
    const theirUserRef = doc(db, "users", userId);
    const myFollowingDoc = doc(
      db,
      "users",
      currentUser.uid,
      "following",
      userId
    );
    const theirFollowersDoc = doc(
      db,
      "users",
      userId,
      "followers",
      currentUser.uid
    );

    try {
      if (following.includes(userId)) {
        // Unfollow
        await updateDoc(userRef, {
          following: arrayRemove(userId),
          followingCount: increment(-1),
        });
        try {
          await updateDoc(theirUserRef, { followersCount: increment(-1) });
        } catch {
          await setDoc(theirUserRef, { followersCount: 0 }, { merge: true });
        }
        setFollowing((prev) => prev.filter((id) => id !== userId));
        await deleteDoc(myFollowingDoc);
        await deleteDoc(theirFollowersDoc);
        setSuggestions((prev) =>
          prev.map((user) =>
            user.uid === userId
              ? { ...user, followersCount: user.followersCount - 1 }
              : user
          )
        );
      } else {
        // Follow
        await updateDoc(userRef, {
          following: arrayUnion(userId),
          followingCount: increment(1),
        });
        try {
          await updateDoc(theirUserRef, { followersCount: increment(1) });
        } catch {
          await setDoc(theirUserRef, { followersCount: 1 }, { merge: true });
        }
        setFollowing((prev) => [...prev, userId]);
        await setDoc(myFollowingDoc, { followedAt: serverTimestamp() });
        await setDoc(theirFollowersDoc, { followedAt: serverTimestamp() });
        setSuggestions((prev) =>
          prev.map((user) =>
            user.uid === userId
              ? { ...user, followersCount: user.followersCount + 1 }
              : user
          )
        );
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!currentUser) {
    return (
      <div className="p-4 text-gray-500">Please log in to see suggestions.</div>
    );
  }
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="font-semibold text-gray-800 text-base">
            Suggested for You
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center min-w-[140px] bg-[#eaf0ff] rounded-lg p-3 border border-gray-200 shadow-sm animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-300" />
              <div className="mt-2 h-4 bg-gray-300 rounded w-20" />
              <div className="mt-1 h-3 bg-gray-200 rounded w-16" />
              <div className="mt-1 h-3 bg-gray-200 rounded w-12" />
              <div className="mt-2 h-6 bg-gray-300 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!suggestions.length)
    return <div className="p-4 text-gray-500">No suggestions right now.</div>;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="font-semibold text-gray-800 text-base">
          Suggested for You
        </span>
        
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
        {/* Show all suggestions */}
        {suggestions.map((user) => {
          const isFollowing = following.includes(user.uid);
          return (
            <div
              key={user.uid}
              className="flex flex-col items-center min-w-[140px] bg-[#eaf0ff] rounded-lg p-3 border border-gray-200 shadow-sm"
            >
              <img
                src={
                  user.profileImage.startsWith("http") ||
                  user.profileImage.startsWith("data:") ||
                  user.profileImage.startsWith("/")
                    ? user.profileImage
                    : `data:image/jpeg;base64,${user.profileImage}`
                }
                alt={user.username}
                className="w-16 h-16 rounded-full object-cover border border-gray-300"
              />
              <div className="mt-2 text-sm font-semibold text-gray-900 truncate flex items-center gap-1">
                {user.username}
                {user.userRole === "Department" && (
                  <img
                    src={verifyTick}
                    alt="verified"
                    className="w-4 h-4"
                    title="Verified Department"
                  />
                )}
              </div>
              <div className="text-xs text-gray-500 mb-1 truncate">
                @{user.handle}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {user.followersCount} follower
                {user.followersCount === 1 ? "" : "s"}
              </div>
              <button
                onClick={() => handleFollowToggle(user.uid)}
                disabled={loadingStates[user.uid]}
                className={`px-4 py-1 text-xs rounded font-semibold border transition
                  ${
                    isFollowing
                      ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      : "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                  }
                  ${
                    loadingStates[user.uid]
                      ? "opacity-75 cursor-not-allowed"
                      : ""
                  }
                `}
                style={{ minWidth: 90 }}
              >
                {loadingStates[user.uid] ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-t-2 border-b-2 border-current rounded-full animate-spin mr-1"></div>
                    loading...
                  </div>
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </button>
            </div>
          );
        })}
        

      </div>
    </div>
  );
}