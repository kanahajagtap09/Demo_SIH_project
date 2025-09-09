import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import PostModal from "./PostModal";

const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const { username = data.name || "Unknown", profileImage = "" } = data;
      return {
        username,
        photoURL:
          profileImage.startsWith("data:") || profileImage.startsWith("http")
            ? profileImage
            : `data:image/jpeg;base64,${profileImage}`,
      };
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
  return {
    username: "Unknown",
    photoURL: "/default-avatar.png",
  };
};

export default function Allpostprofile() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userCache = useRef({});
  const [userId, setUserId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else {
        setUserId(null);
        setPosts([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const q = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postDocs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const enrichedPosts = await Promise.all(
        postDocs.map(async (post) => {
          if (!userCache.current[userId]) {
            userCache.current[userId] = await getUserData(userId);
          }
          return {
            ...post,
            user: userCache.current[userId],
          };
        })
      );
      setPosts(enrichedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return <p className="text-center py-6 text-gray-500">Loading your posts...</p>;
  }
  if (!posts.length) {
    return <p className="text-center py-6 text-gray-500">You have not posted anything yet.</p>;
  }

  return (
    <>
      <div
        className="grid grid-cols-3 gap-1"
        style={{ maxWidth: 400, margin: "0 auto" }}
      >
        {posts.map((post) =>
          post.image ? (
            <div
              key={post.id}
              className="relative cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <img
                src={post.image}
                alt="Post"
                className="w-full h-32 object-cover"
                style={{ borderRadius: 4 }}
              />
            </div>
          ) : null
        )}
      </div>
      <PostModal
        open={!!selectedPost}
        handleClose={() => setSelectedPost(null)}
        post={selectedPost}
      />
    </>
  );
}