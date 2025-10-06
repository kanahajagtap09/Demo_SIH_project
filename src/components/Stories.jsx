import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const Stories = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [currentStory, setCurrentStory] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [departmentStats, setDepartmentStats] = useState(null);

  const gradients = [
    "from-purple-400 via-pink-500 to-red-500",
    "from-blue-400 via-blue-500 to-cyan-500",
    "from-green-400 via-green-500 to-emerald-500",
    "from-yellow-400 via-orange-500 to-red-500",
    "from-teal-400 via-green-500 to-lime-500",
    "from-red-400 via-red-500 to-orange-500",
    "from-indigo-400 via-purple-500 to-pink-500",
    "from-gray-400 via-gray-500 to-slate-500"
  ];

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userRole', '==', 'Department'));
        const snapshot = await getDocs(q);
        
        const departments = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.username || data.name || 'Department',
            username: data.username || 'dept',
            avatar: data.profileImage || '/placeholder.svg',
            hasStory: true,
            gradient: gradients[index % gradients.length]
          };
        });
        
        setStories(departments);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleStoryClick = async (story) => {
    setCurrentStory(story);
    setCurrentCard(0);
    setShowStoryModal(true);
    
    // Fetch department stats
    try {
      console.log('Fetching stats for department:', story.username, story.name);
      
      const issuesRef = collection(db, 'issues');
      const snapshot = await getDocs(issuesRef);
      
      console.log('Total issues found:', snapshot.docs.length);
      
      const allIssues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('All issues:', allIssues);
      
      // Map story names to actual Firebase department names
      const departmentMap = {
        'pwd_dept': 'pwd',
        'water_dept': 'water', 
        'swm_dept': 'swm',
        'traffic_dept': 'traffic',
        'health_dept': 'health',
        'environment_dept': 'environment',
        'electricity_dept': 'electricity',
        'disaster_dept': 'disaster'
      };
      
      const actualDeptName = departmentMap[story.username?.toLowerCase()] || story.username?.toLowerCase();
      console.log('Mapped department name:', actualDeptName);
      
      // Filter by department
      const departmentIssues = allIssues.filter(issue => {
        const dept = issue.department?.toLowerCase();
        console.log('Comparing:', dept, 'with', actualDeptName);
        return dept === actualDeptName;
      });
      
      console.log('Department issues found:', departmentIssues);
      
      const resolved = departmentIssues.filter(issue => issue.status === 'resolved').length;
      const escalated = departmentIssues.filter(issue => issue.escalation?.status === 'approved').length;
      const score = resolved * 100 - escalated * 50;
      const rank = Math.floor(Math.random() * 10) + 1;
      
      setDepartmentStats({ 
        resolved, 
        escalated, 
        score, 
        rank, 
        total: departmentIssues.length 
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const nextCard = () => {
    setCurrentCard(prev => (prev + 1) % 2);
  };

  const closeModal = () => {
    setShowStoryModal(false);
    setCurrentStory(null);
    setDepartmentStats(null);
  };

  useEffect(() => {
    if (showStoryModal) {
      const timer = setInterval(() => {
        setCurrentCard(prev => {
          const next = (prev + 1) % 2;
          if (next === 0) {
            closeModal();
          }
          return next;
        });
      }, 3000);
      
      return () => clearInterval(timer);
    }
  }, [showStoryModal]);

  return (
    <div className="Fsticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
          {/* Stories container */}
          <div className="flex space-x-3 min-w-max">
            {loading ? (
              // Loading skeleton
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center space-y-0.5">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))
            ) : (
              stories.map((story) => (
              <div
                key={story.id}
                onClick={() => handleStoryClick(story)}
                className="flex flex-col items-center space-y-0.5 cursor-pointer group"
              >
                {/* Story Ring with Gradient */}
                <div className={`relative p-[2px] rounded-full bg-gradient-to-tr ${story.gradient} group-hover:scale-105 transition-transform duration-200 shadow-lg`}>
                  <img
                    src={story.avatar.startsWith('http') || story.avatar.startsWith('data:') || story.avatar.startsWith('/') ? story.avatar : `data:image/jpeg;base64,${story.avatar}`}
                    alt={story.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(story.name)}&background=random&color=fff&size=56`;
                    }}
                  />
                  
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                
                {/* Department Name */}
                <span className="text-xs text-gray-700 font-medium text-center max-w-[60px] truncate">
                  {story.name.split(' ')[0]}
                </span>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Story Modal */}
      {showStoryModal && currentStory && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="relative w-full h-full flex flex-col">
            {/* Progress bars */}
            <div className="flex gap-1 mb-4 px-4 pt-4">
              {[0, 1].map((index) => (
                <div key={index} className="flex-1 h-1 bg-gray-600 rounded">
                  <div 
                    className={`h-full bg-white rounded transition-all duration-300 ${
                      index < currentCard ? 'w-full' : index === currentCard ? 'w-1/2' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>
            
            {/* Story header */}
            <div className="flex items-center gap-3 mb-6 px-4">
              <img
                src={currentStory.avatar.startsWith('http') || currentStory.avatar.startsWith('data:') || currentStory.avatar.startsWith('/') ? currentStory.avatar : `data:image/jpeg;base64,${currentStory.avatar}`}
                alt={currentStory.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-white font-semibold">{currentStory.name}</span>
              <button onClick={closeModal} className="ml-auto text-white text-xl">×</button>
            </div>
            
            {/* Story cards */}
            <div className="relative flex-1 overflow-hidden">
              {currentCard === 0 && departmentStats && (
                <div className={`absolute inset-0 bg-gradient-to-br ${currentStory.gradient} p-8 flex flex-col justify-center items-center text-white`}>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Department Ranking</h2>
                    <div className="text-6xl font-bold mb-4">#{departmentStats.rank}</div>
                    <div className="text-lg mb-4">Score: {departmentStats.score}</div>
                    <div className="text-sm opacity-80">Out of all departments</div>
                  </div>
                </div>
              )}
              
              {currentCard === 1 && departmentStats && (
                <div className={`absolute inset-0 bg-gradient-to-br ${currentStory.gradient} p-8 flex flex-col justify-center text-white`}>
                  <h2 className="text-2xl font-bold mb-6 text-center">Task Statistics</h2>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="flex justify-between items-center  bg-opacity-20 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-30">
                      <span className="text-sm font-medium">Tasks Resolved</span>
                      <span className="text-xl font-bold">{departmentStats.resolved}</span>
                    </div>
                    <div className="flex justify-between items-center  bg-opacity-20 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-30">
                      <span className="text-sm font-medium">Tasks Escalated</span>
                      <span className="text-xl font-bold">{departmentStats.escalated}</span>
                    </div>
                    <div className="flex justify-between items-center  bg-opacity-20 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-30">
                      <span className="text-sm font-medium">Total Tasks</span>
                      <span className="text-xl font-bold">{departmentStats.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Navigation areas */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 h-full" onClick={nextCard}></div>
              <div className="w-1/2 h-full" onClick={nextCard}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;