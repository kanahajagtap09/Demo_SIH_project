import React, { useEffect, useState } from "react";
import SuggestionsBar from "./Sugestionbar";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import HorizontalTabs from "../Profile_Pages/Horizotal_tabs";
import { FaMedal, FaStar, FaMapMarkerAlt } from "react-icons/fa";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

// -----------------------------
// Levels configuration
// -----------------------------
const LEVELS = [
  { level: 1, requiredPoints: 0 },
  { level: 2, requiredPoints: 6000 },
  { level: 3, requiredPoints: 12000 },
  { level: 4, requiredPoints: 20000 },
];

// Medals
const medalsData = [
  { name: "Gold", key: "gold", color: "bg-yellow-400", text: "text-yellow-700" },
  { name: "Silver", key: "silver", color: "bg-gray-300", text: "text-gray-600" },
  { name: "Bronze", key: "bronze", color: "bg-orange-300", text: "text-orange-700" },
];

// Modal style
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  borderRadius: 12,
  boxShadow: 24,
  p: 3,
  width: { xs: "90vw", sm: 400 },
  outline: "none",
};

// -----------------------------
// Fetch Firestore user data
// -----------------------------
const getUserData = async (currentUser) => {
  try {
    const userId = currentUser.uid;
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const isGoogleUser = currentUser.providerData.some(
      (provider) => provider.providerId === "google.com"
    );

    const googleName = currentUser.displayName || "";
    const googlePhoto = currentUser.photoURL || "";

    let data = userSnap.exists() ? userSnap.data() : {};

    return {
      username: data.username || data.name || googleName || "",
      name: data.name || googleName || "",
      verified: data.verified || false,
      stats: {
        posts: data.postsCount || 0,
        followers: data.followersCount || 0,
        following: data.followingCount || 0,
      },
      bio: Array.isArray(data.bio)
        ? data.bio
        : data.bio
        ? data.bio.split("\n")
        : [],
      photoURL: (() => {
        if (isGoogleUser && googlePhoto) return googlePhoto;
        if (data.profileImage) {
          if (data.profileImage.startsWith("http")) return data.profileImage;
          if (data.profileImage.startsWith("data:")) return data.profileImage;
          return `data:image/jpeg;base64,${data.profileImage}`;
        }
        return "/default-avatar.png";
      })(),
    };
  } catch (err) {
    console.error("Error fetching user data:", err);
    return {
      username: "",
      name: "",
      verified: false,
      stats: { posts: 0, followers: 0, following: 0 },
      bio: [],
      photoURL: "/default-avatar.png",
    };
  }
};

// -----------------------------
// LevelCard Component
// -----------------------------
const LevelCard = () => {
  const [points, setPoints] = useState(5200);
  const [medals, setMedals] = useState({ gold: 24, silver: 18, bronze: 11 });
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [open, setOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedPoints = localStorage.getItem("userPoints");
    const savedMedals = localStorage.getItem("userMedals");
    if (savedPoints) setPoints(Number(savedPoints));
    if (savedMedals) setMedals(JSON.parse(savedMedals));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("userPoints", points);
    localStorage.setItem("userMedals", JSON.stringify(medals));
  }, [points, medals]);

  // Determine level
  const currentLevel = LEVELS.reduce(
    (prev, lvl) => (points >= lvl.requiredPoints ? lvl : prev),
    LEVELS[0]
  );
  const nextLevel = LEVELS.find((lvl) => lvl.level === currentLevel.level + 1);

  const progressToNext = nextLevel
    ? ((points - currentLevel.requiredPoints) /
        (nextLevel.requiredPoints - currentLevel.requiredPoints)) *
      100
    : 100;

  // Animate progress bar
  useEffect(() => {
    let start = 0;
    const animate = () => {
      start += 2;
      if (start >= progressToNext) {
        setAnimatedProgress(progressToNext);
        return;
      }
      setAnimatedProgress(start);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [progressToNext]);

  // Animate points counter
  useEffect(() => {
    let current = 0;
    const increment = Math.ceil(points / 50);
    const timer = setInterval(() => {
      current += increment;
      if (current >= points) {
        setAnimatedPoints(points);
        clearInterval(timer);
      } else {
        setAnimatedPoints(current);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [points]);

  return (
    <>
      <div
        className="bg-white shadow-md rounded-xl p-4 my-4 border cursor-pointer hover:shadow-lg transition"
        onClick={() => setOpen(true)}
      >
        {/* Level Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white font-bold">
            {currentLevel.level}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Level {currentLevel.level}</span>
            {nextLevel && (
              <span className="text-xs text-gray-500">
                {nextLevel.requiredPoints - points} Points to next level
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden mb-3">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500"
            style={{ width: `${animatedProgress}%` }}
          />
          <div className="absolute inset-0 flex justify-between items-center px-3 text-xs font-semibold text-black">
            <span>{currentLevel.level}</span>
            <span className="flex items-center gap-1">
              <FaStar className="text-yellow-600 text-xs" />
              {animatedPoints}/{nextLevel ? nextLevel.requiredPoints : points}
            </span>
            <span>{nextLevel ? nextLevel.level : "MAX"}</span>
          </div>
        </div>

        {/* Medals */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            Medals {medals.gold + medals.silver + medals.bronze}
          </h3>
          <div className="flex gap-6">
            {medalsData.map((m) => (
              <div key={m.name} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 ${m.color} rounded-full shadow-md flex items-center justify-center`}
                >
                  <FaMedal className={`text-lg ${m.text}`} />
                </div>
                <span className={`mt-1 text-sm font-semibold ${m.text}`}>
                  {m.name}
                </span>
                <span className="text-gray-700">{medals[m.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <h2 className="font-bold text-lg">Level {currentLevel.level} Details</h2>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <p className="text-gray-700 mb-3">
            You currently have <b>{points}</b> points.
          </p>
          {nextLevel ? (
            <p className="text-sm text-gray-600 mb-2">
              Only <b>{nextLevel.requiredPoints - points}</b> points left to reach
              Level <b>{nextLevel.level}</b> 🎯
            </p>
          ) : (
            <p className="text-sm text-green-600">
              🎉 You are at the maximum Level!
            </p>
          )}

          <h3 className="mt-3 font-semibold">Your Medals</h3>
          <div className="flex gap-6 mt-2">
            {medalsData.map((m) => (
              <div key={m.name} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 ${m.color} rounded-full flex items-center justify-center shadow-md`}
                >
                  <FaMedal className={`text-lg ${m.text}`} />
                </div>
                <span className={`mt-1 text-sm font-semibold ${m.text}`}>
                  {m.name}
                </span>
                <span className="text-gray-700">{medals[m.key]}</span>
              </div>
            ))}
          </div>
        </Box>
      </Modal>
    </>
  );
};

// -----------------------------
// Profile Component
// -----------------------------
const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const userData = await getUserData(currentUser);
      setUser(userData);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await signOut(getAuth());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        User not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center text-black pb-20">
      {/* Top Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between px-2 sm:px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <button>
            <svg
              className="w-6 h-6 text-black"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>
          <span className="font-semibold text-base sm:text-lg">
            {user.username || user.name || "User"}
          </span>
          {user.verified && (
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="10" fill="#3b82f6" />
              <path d="M7 10l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 🌍 MAP button */}
          <button
            onClick={() => navigate("/map")}
            className="flex items-center gap-1 text-sm font-semibold bg-gradient-to-r from-blue-200 to-blue-600 hover:from-blue-600 hover:to-blue-700 py-2 px-3 rounded-2xl text-white shadow-lg border border-blue-400"
          >
            <FaMapMarkerAlt />
            Map
          </button>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="block sm:hidden flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-red-200 to-red-600 hover:from-red-600 hover:to-red-700 py-2 px-3 rounded-2xl text-white shadow-lg border border-red-400"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="w-full max-w-md mx-auto pt-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0">
            <div className="p-1 bg-gradient-to-tr from-pink-500 via-yellow-400 to-purple-600 rounded-full">
              <img
                src={user.photoURL}
                alt={user.username || user.name || "User"}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-white p-0.5"
              />
            </div>
          </div>
          <div className="flex-1 flex justify-around ml-4">
            <div className="flex flex-col items-center">
              <span className="font-bold text-base sm:text-lg">{user.stats.posts}</span>
              <span className="text-xs text-gray-500">Posts</span>
            </div>
            <Link to="/follow" className="flex flex-col items-center">
              <span className="font-bold text-base sm:text-lg text-blue-600">
                {user.stats.followers >= 1000
                  ? (user.stats.followers / 1000).toFixed(1) + "K"
                  : user.stats.followers}
              </span>
              <span className="text-xs text-gray-500">Followers</span>
            </Link>
            <Link to="/following" className="flex flex-col items-center">
              <span className="font-bold text-base sm:text-lg text-blue-600">
                {user.stats.following}
              </span>
              <span className="text-xs text-gray-500">Following</span>
            </Link>
          </div>
        </div>

        {/* Name + Bio */}
        <div className="font-bold text-sm mt-3">{user.name}</div>
        <div className="text-xs text-gray-800 mt-1 whitespace-pre-line">
          {user.bio.map((line, idx) => (
            <div key={idx}>
              {line.startsWith("www.") || line.startsWith("http") ? (
                <a
                  href={line.startsWith("http") ? line : `https://${line}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-semibold underline break-all"
                >
                  {line}
                </a>
              ) : (
                line
              )}
            </div>
          ))}
        </div>

        {/* ✅ Level Card */}
        <LevelCard />

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mt-4 w-full max-w-md">
          <Link
            to="/Edit_profile"
            className="flex-1 text-center py-2 font-semibold border border-gray-300 rounded-lg bg-white"
          >
            Edit Profile
          </Link>
          <button
            disabled
            className="flex-1 text-center py-2 font-semibold border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
          >
            Share Profile
          </button>
          <button
            disabled
            className="flex items-center justify-center w-10 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
          >
            ···
          </button>
        </div>
      </div>

      {/* Suggestions & Tabs */}
      <div className="w-full max-w-md px-2 mt-4">
        <SuggestionsBar />
      </div>
      <HorizontalTabs />
      <div className="h-20" />
    </div>
  );
};

export default Profile;