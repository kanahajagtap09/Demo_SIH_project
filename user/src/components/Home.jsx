import React from "react";
import FloatingButton from "../FloatingButton";
import PostList from "./PostList";
import Stories from "./Stories";

const Home = () => {
  return (
    <div className="min-h-screen relative pb-20 mt-20">
      {/* Department Stories */}
      <Stories />

      {/* List of Posts */}
      <PostList />
      
      {/* Floating Action Button for desktop */}
      <FloatingButton />
    </div>
  );
};

export default Home;