import { db } from '../firebase/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

// Department mapping for civic issues
const DEPARTMENTS = {
  'pwd': { name: 'Public Works Department', priority: 'High' },
  'water': { name: 'Water Supply & Sewage', priority: 'High' },
  'swm': { name: 'Solid Waste Management', priority: 'Medium' },
  'traffic': { name: 'Traffic Police / Transport', priority: 'High' },
  'health': { name: 'Health & Sanitation', priority: 'High' },
  'environment': { name: 'Environment & Parks', priority: 'Medium' },
  'electricity': { name: 'Electricity Department', priority: 'High' },
  'disaster': { name: 'Disaster Management', priority: 'Critical' }
};

// Test Gemini API call
export const testGeminiAPI = async (testDescription = "There is a pothole on Main Street that needs repair") => {
  console.log('Testing Gemini API with:', testDescription);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=AIzaSyAj2locQOLzDa5F7E91StUEdJGIzZ7d9DQ`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Test: Categorize this civic issue: "${testDescription}". Respond with JSON: {"department": "pwd", "priority": "High", "summary": "Road repair needed"}`
            }]
          }]
        })
      }
    );

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Full API response:', data);
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log('AI response text:', aiResponse);
    
    return { success: true, response: aiResponse, fullData: data };
  } catch (error) {
    console.error('Gemini API test failed:', error);
    return { success: false, error: error.message };
  }
};

// AI Processing with Gemini Pro (STRICT department only)
export const processWithAI = async (description, imageUrl) => {
  console.log('🤖 AI Processing started for:', description);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAj2locQOLzDa5F7E91StUEdJGIzZ7d9DQ`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a strict civic issue classifier. Analyze this post: "${description}"
              
              CRITICAL RULES:
              1. ONLY accept issues that EXACTLY match these 8 department categories
              2. If the issue does NOT fit ANY department category, respond: "REJECT"
              3. If it's irrelevant (social media/personal/ads/entertainment), respond: "REJECT"

              ACCEPTED DEPARTMENTS (STRICT MATCHING ONLY):
              - pwd: Roads, potholes, construction, buildings, infrastructure repairs
              - water: Water leaks, pipe bursts, sewage blockage, drainage problems
              - swm: Garbage collection, waste disposal, street cleaning, dustbin issues
              - traffic: Traffic signals, parking violations, vehicle issues, road safety
              - health: Public health threats, disease outbreaks, hospital issues, sanitation
              - environment: Parks maintenance, tree cutting, pollution, garden issues
              - electricity: Power outages, street lights, electrical cables, transformer issues
              - disaster: Fire, flood, accidents, emergency situations
              
              RESPONSE FORMAT (strict JSON only):
              {
                "department": "pwd | water | swm | traffic | health | environment | electricity | disaster",
                "priority": "High | Medium | Low | Critical",
                "summary": "short description"
              }

              If the issue doesn't fit, just respond: "REJECT"`
            }]
          }]
        })
      }
    );

    console.log('📞 API Response status:', response.status);
    const data = await response.json();
    console.log('📊 Full API response:', data);
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log('🤖 AI response text:', aiResponse);

    // Handle rejection
    if (aiResponse.startsWith("REJECT")) {
      console.log('❌ AI rejected the post');
      return {
        category: 'rejected',
        priority: 'Low',
        summary: 'Post rejected: Not a civic issue',
        status: 'rejected'
      };
    }

    // Strip markdown code blocks if present
    let cleanResponse = aiResponse;
    if (aiResponse.startsWith('```json') && aiResponse.endsWith('```')) {
      cleanResponse = aiResponse.slice(7, -3).trim();
    } else if (aiResponse.startsWith('```') && aiResponse.endsWith('```')) {
      cleanResponse = aiResponse.slice(3, -3).trim();
    }
    console.log('🧹 Cleaned response:', cleanResponse);

    // Try to parse AI JSON response
    let parsed;
    try {
      parsed = JSON.parse(cleanResponse);
      console.log('✅ Successfully parsed AI JSON:', parsed);
    } catch (e) {
      console.error("❌ AI returned invalid JSON:", aiResponse);
      console.error('JSON parse error:', e.message);
      return {
        category: 'rejected',
        priority: 'Low',
        summary: 'Post rejected: Invalid AI response',
        status: 'rejected'
      };
    }

    // Validate department
    if (!parsed.department || !Object.keys(DEPARTMENTS).includes(parsed.department.toLowerCase())) {
      return {
        category: 'rejected',
        priority: 'Low',
        summary: 'Post rejected: Does not match any civic department category',
        status: 'rejected'
      };
    }

    const deptId = parsed.department.toLowerCase();
    const result = {
      category: DEPARTMENTS[deptId].name,
      department: deptId,
      priority: parsed.priority || DEPARTMENTS[deptId].priority,
      summary: parsed.summary || description.substring(0, 100),
      status: 'working'
    };
    
    console.log('✅ AI categorization successful:', result);
    return result;

  } catch (error) {
    console.error('❌ AI processing failed:', error);
    return {
      category: 'rejected',
      priority: 'Low',
      summary: 'Post rejected: AI processing error',
      status: 'rejected'
    };
  }
};

// Expose test function to window for browser console testing
if (typeof window !== 'undefined') {
  window.testGeminiAPI = testGeminiAPI;
  window.processWithAI = processWithAI;
}



// Update issue status and history
export const updateIssueStatus = async (issueId, status, assignedPersonnel = null, eta = null) => {
  try {
    const issueRef = doc(db, 'issues', issueId);
    const updateData = {
      status,
      lastUpdated: serverTimestamp(),
      updateHistory: arrayUnion({
        status,
        timestamp: new Date(),
        updatedBy: assignedPersonnel?.name || 'System'
      })
    };
    
    if (status === 'assign' && assignedPersonnel) {
      updateData.assignedAt = serverTimestamp();
      updateData.assignedPersonnel = assignedPersonnel;
    }
    
    if (eta) {
      updateData.eta = eta;
    }
    
    await updateDoc(issueRef, updateData);
    return true;
  } catch (error) {
    console.error('Failed to update issue:', error);
    return false;
  }
};

// Calculate duplicate similarity
export const calculateSimilarity = (desc1, desc2, geo1, geo2) => {
  // Text similarity (simple word matching)
  const words1 = desc1.toLowerCase().split(' ');
  const words2 = desc2.toLowerCase().split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  const textSimilarity = commonWords.length / Math.max(words1.length, words2.length);
  
  // Geographic proximity (within 100 meters)
  const geoDistance = Math.sqrt(
    Math.pow((geo1.latitude - geo2.latitude) * 111000, 2) +
    Math.pow((geo1.longitude - geo2.longitude) * 111000, 2)
  );
  const geoSimilarity = geoDistance < 100 ? 1 : 0;
  
  return textSimilarity * 0.7 + geoSimilarity * 0.3;
};