
// import React, { useState, useRef, useCallback, useEffect } from "react";
// import { db } from "../firebase/firebase";
// import { collection, addDoc, Timestamp } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import EmojiPicker from "emoji-picker-react";
// import { FaTimes, FaCamera, FaCheck } from "react-icons/fa";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Cropper from "react-easy-crop";

// const STEPS = { CAMERA: "camera", CROP: "crop", FORM: "form" };

// export default function PostCreatorModal({ isOpen, onClose }) {
//   const [step, setStep] = useState(STEPS.CAMERA);

//   const [description, setDescription] = useState("");
//   const [imageData, setImageData] = useState(null);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const [tags, setTags] = useState([]);
//   const [tagInput, setTagInput] = useState("");

//   // Camera/crop
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const [isCameraReady, setIsCameraReady] = useState(false);
//   const [crop, setCrop] = useState({ x: 0, y: 0 });
//   const [zoom, setZoom] = useState(1);
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

//   // Geolocation
//   const [geoData, setGeoData] = useState(null);

//   // --- Camera handlers ---
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: "environment" },
//         audio: false,
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         streamRef.current = stream;
//         setIsCameraReady(true);
//       }
//     } catch {
//       toast.error("❌ Could not access camera");
//     }
//   };

//   const stopCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((t) => t.stop());
//       streamRef.current = null;
//       setIsCameraReady(false);
//     }
//   };

//   const capturePhoto = () => {
//     const canvas = document.createElement("canvas");
//     const vid = videoRef.current;
//     canvas.width = vid.videoWidth;
//     canvas.height = vid.videoHeight;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(vid, 0, 0);
//     const dataUrl = canvas.toDataURL("image/jpeg");
//     setImageData(dataUrl);
//     stopCamera();
//     setStep(STEPS.CROP);
//     getLocation();
//   };

//   // --- Location ---
//   const getLocation = () => {
//     if (!navigator.geolocation) {
//       toast.warn("⚠️ Geolocation not supported");
//       return;
//     }
//     navigator.geolocation.getCurrentPosition(
//       async (pos) => {
//         const { latitude, longitude } = pos.coords;
//         try {
//           const res = await fetch(
//             `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
//           );
//           const data = await res.json();
//           setGeoData({
//             latitude,
//             longitude,
//             city: data.city || data.locality,
//             region: data.principalSubdivision,
//             country: data.countryName,
//             address: `${data.city || data.locality}, ${data.principalSubdivision}, ${data.countryName}`,
//           });
//         } catch {
//           toast.warn("⚠️ Could not fetch detailed location");
//         }
//       },
//       () => toast.error("❌ Location permission denied")
//     );
//   };

//   // --- Crop ---
//   const onCropComplete = useCallback((_, cropped) => {
//     setCroppedAreaPixels(cropped);
//   }, []);

//   const getCroppedImage = async () => {
//     const canvas = document.createElement("canvas");
//     const image = new Image();
//     image.src = imageData;
//     await new Promise((res) => (image.onload = res));
//     const scaleX = image.naturalWidth / image.width;
//     const scaleY = image.naturalHeight / image.height;
//     canvas.width = croppedAreaPixels.width;
//     canvas.height = croppedAreaPixels.height;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(
//       image,
//       croppedAreaPixels.x * scaleX,
//       croppedAreaPixels.y * scaleY,
//       croppedAreaPixels.width * scaleX,
//       croppedAreaPixels.height * scaleY,
//       0,
//       0,
//       croppedAreaPixels.width,
//       croppedAreaPixels.height
//     );
//     setImageData(canvas.toDataURL("image/jpeg"));
//     setStep(STEPS.FORM);
//   };

//   // --- Emoji & Tags ---
//   const handleEmojiClick = (emoji) => setDescription((prev) => prev + emoji.emoji);

//   const handleAddTag = () => {
//     if (tagInput.trim()) {
//       setTags((prev) => [...prev, tagInput.startsWith("#") ? tagInput : `#${tagInput}`]);
//       setTagInput("");
//     }
//   };

//   // --- Submit ---
//   const handleSubmit = async () => {
//     if (!description && !imageData) {
//       toast.warn("⚠️ Please enter a description or capture an image.");
//       return;
//     }

//     const auth = getAuth();
//     const user = auth.currentUser;
//     if (!user) return toast.error("❌ Login required");

//     try {
//       await addDoc(collection(db, "posts"), {
//         userId: user.uid,
//         text: description,
//         image: imageData || null, // ✅ stored directly in Firestore (Base64 string)
//         tags,
//         geo: geoData
//           ? {
//               latitude: geoData.latitude,
//               longitude: geoData.longitude,
//               city: geoData.city,
//               region: geoData.region,
//               country: geoData.country,
//               address: geoData.address,
//             }
//           : null,
//         createdAt: Timestamp.now(),
//       });

//       toast.success("🚀 Post created successfully!");
//       resetForm();
//       onClose();
//     } catch (err) {
//       console.error("Error posting:", err);
//       toast.error("❌ Error posting. Check permissions or connection.");
//     }
//   };

//   const resetForm = () => {
//     setDescription("");
//     setTags([]);
//     setImageData(null);
//     setShowEmojiPicker(false);
//     setStep(STEPS.CAMERA);
//     setGeoData(null);
//     setCrop({ x: 0, y: 0 });
//     setZoom(1);
//     setCroppedAreaPixels(null);
//   };

//   useEffect(() => {
//     if (isOpen) startCamera();
//     else stopCamera();
//     return () => stopCamera();
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
//       <ToastContainer position="top-right" autoClose={3000} />
//       <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg relative overflow-hidden">
//         <button
//           className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-2xl"
//           onClick={onClose}
//         >
//           <FaTimes />
//         </button>

//         <div className="max-h-[90vh] overflow-y-auto">
//           {/* CAMERA */}
//           {step === STEPS.CAMERA && (
//             <div className="relative">
//               <video ref={videoRef} autoPlay playsInline className="w-full h-[60vh] object-cover" />
//               {isCameraReady && (
//                 <div className="absolute bottom-6 w-full flex justify-center">
//                   <button
//                     onClick={capturePhoto}
//                     className="bg-blue-600 text-white p-4 rounded-full shadow-xl"
//                   >
//                     <FaCamera className="text-2xl" />
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* CROP */}
//           {step === STEPS.CROP && (
//             <div className="relative h-[60vh]">
//               <Cropper
//                 image={imageData}
//                 crop={crop}
//                 zoom={zoom}
//                 aspect={1}
//                 onCropChange={setCrop}
//                 onZoomChange={setZoom}
//                 onCropComplete={onCropComplete}
//               />
//               <div className="absolute bottom-6 flex w-full justify-center gap-4">
//                 <button
//                   onClick={() => {
//                     setImageData(null);
//                     setStep(STEPS.CAMERA);
//                     startCamera();
//                   }}
//                   className="bg-gray-600 text-white px-6 py-2 rounded-md"
//                 >
//                   Retake
//                 </button>
//                 <button
//                   onClick={getCroppedImage}
//                   className="bg-blue-600 text-white px-6 py-2 rounded-md flex items-center"
//                 >
//                   <FaCheck className="mr-2" /> Use Photo
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* FORM */}
//           {step === STEPS.FORM && (
//             <div className="p-6">
//               <div className="relative mb-6 border rounded-lg overflow-hidden shadow-md">
//                 <img src={imageData} alt="Preview" className="w-full max-h-[300px] object-cover" />
//                 <button
//                   onClick={() => {
//                     setImageData(null);
//                     setStep(STEPS.CAMERA);
//                     startCamera();
//                   }}
//                   className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-2 hover:bg-red-100 text-red-600 shadow"
//                 >
//                   <FaCamera />
//                 </button>
//                 {geoData && (
//                   <div className="bg-gray-900 text-white text-sm p-3">
//                     📍 {geoData.address} <br />
//                     Lat: {geoData.latitude.toFixed(5)}° | Long: {geoData.longitude.toFixed(5)}°
//                   </div>
//                 )}
//               </div>

//               <textarea
//                 rows="3"
//                 className="w-full border rounded-md p-3 mb-4"
//                 placeholder="Write something..."
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//               />

//               <div className="flex items-center gap-2 mb-3">
//                 <input
//                   type="text"
//                   className="border rounded-md p-2 flex-grow"
//                   placeholder="Add #tag"
//                   value={tagInput}
//                   onChange={(e) => setTagInput(e.target.value)}
//                   onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
//                 />
//                 <button
//                   onClick={handleAddTag}
//                   className="bg-blue-500 text-white px-3 py-2 rounded-md"
//                 >
//                   Add
//                 </button>
//               </div>

//               {tags.length > 0 && (
//                 <div className="flex flex-wrap gap-2 mb-3">
//                   {tags.map((t, i) => (
//                     <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
//                       {t}
//                     </span>
//                   ))}
//                 </div>
//               )}

//               <button
//                 onClick={() => setShowEmojiPicker((p) => !p)}
//                 className="bg-yellow-400 px-4 py-2 rounded-md mb-3"
//               >
//                 😀 Emoji
//               </button>
//               {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}

//               <button
//                 onClick={handleSubmit}
//                 className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold"
//               >
//                 🚀 Post
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState, useRef, useCallback, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import EmojiPicker from "emoji-picker-react";
import { FaTimes, FaCamera, FaCheck } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cropper from "react-easy-crop";
import Lottie from "lottie-react";
import CheckedAnimation from "../assets/Checked.json";

const STEPS = { CAMERA: "camera", CROP: "crop", FORM: "form" };

export default function PostCreatorModal({ isOpen, onClose }) {
  const [step, setStep] = useState(STEPS.CAMERA);

  const [description, setDescription] = useState("");
  const [imageData, setImageData] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Camera/crop
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Geolocation
  const [geoData, setGeoData] = useState(null);

  // ✅ Success animation
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // --- Camera handlers ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch {
      toast.error("❌ Could not access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    const vid = videoRef.current;
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(vid, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setImageData(dataUrl);
    stopCamera();
    setStep(STEPS.CROP);
    getLocation();
  };

  // --- Location ---
  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.warn("⚠️ Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          setGeoData({
            latitude,
            longitude,
            city: data.city || data.locality,
            region: data.principalSubdivision,
            country: data.countryName,
            address: `${data.city || data.locality}, ${data.principalSubdivision}, ${data.countryName}`,
          });
        } catch {
          toast.warn("⚠️ Could not fetch detailed location");
        }
      },
      () => toast.error("❌ Location permission denied")
    );
  };

  // --- Crop ---
  const onCropComplete = useCallback((_, cropped) => {
    setCroppedAreaPixels(cropped);
  }, []);

  const getCroppedImage = async () => {
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = imageData;
    await new Promise((res) => (image.onload = res));
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      croppedAreaPixels.x * scaleX,
      croppedAreaPixels.y * scaleY,
      croppedAreaPixels.width * scaleX,
      croppedAreaPixels.height * scaleY,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );
    setImageData(canvas.toDataURL("image/jpeg"));
    setStep(STEPS.FORM);
  };

  // --- Emoji & Tags ---
  const handleEmojiClick = (emoji) => setDescription((prev) => prev + emoji.emoji);

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags((prev) => [...prev, tagInput.startsWith("#") ? tagInput : `#${tagInput}`]);
      setTagInput("");
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!description && !imageData) {
      toast.warn("⚠️ Please enter a description or capture an image.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return toast.error("❌ Login required");

    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text: description,
        image: imageData || null,
        tags,
        geo: geoData
          ? {
              latitude: geoData.latitude,
              longitude: geoData.longitude,
              city: geoData.city,
              region: geoData.region,
              country: geoData.country,
              address: geoData.address,
            }
          : null,
        createdAt: Timestamp.now(),
      });

      // ✅ Show toast + lottie animation
      toast.success("🚀 Post created successfully!");
      setShowSuccessAnim(true);

      setTimeout(() => {
        setShowSuccessAnim(false);
        resetForm();
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Error posting:", err);
      toast.error("❌ Error posting. Check permissions or connection.");
    }
  };

  const resetForm = () => {
    setDescription("");
    setTags([]);
    setImageData(null);
    setShowEmojiPicker(false);
    setStep(STEPS.CAMERA);
    setGeoData(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  useEffect(() => {
    if (isOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ✅ Success Lottie Animation Overlay */}
      {showSuccessAnim && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000]">
          <Lottie 
            animationData={CheckedAnimation} 
            loop={false} 
            style={{ width: 200, height: 200 }} 
          />
        </div>
      )}

      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg relative overflow-hidden">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-2xl"
          onClick={onClose}
        >
          <FaTimes />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          {/* CAMERA */}
          {step === STEPS.CAMERA && (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-[60vh] object-cover" />
              {isCameraReady && (
                <div className="absolute bottom-6 w-full flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-xl"
                  >
                    <FaCamera className="text-2xl" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CROP */}
          {step === STEPS.CROP && (
            <div className="relative h-[60vh]">
              <Cropper
                image={imageData}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <div className="absolute bottom-6 flex w-full justify-center gap-4">
                <button
                  onClick={() => {
                    setImageData(null);
                    setStep(STEPS.CAMERA);
                    startCamera();
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md"
                >
                  Retake
                </button>
                <button
                  onClick={getCroppedImage}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md flex items-center"
                >
                  <FaCheck className="mr-2" /> Use Photo
                </button>
              </div>
            </div>
          )}

          {/* FORM */}
          {step === STEPS.FORM && (
            <div className="p-6">
              <div className="relative mb-6 border rounded-lg overflow-hidden shadow-md">
                <img src={imageData} alt="Preview" className="w-full max-h-[300px] object-cover" />
                <button
                  onClick={() => {
                    setImageData(null);
                    setStep(STEPS.CAMERA);
                    startCamera();
                  }}
                  className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-2 hover:bg-red-100 text-red-600 shadow"
                >
                  <FaCamera />
                </button>
                {geoData && (
                  <div className="bg-gray-900 text-white text-sm p-3">
                    📍 {geoData.address} <br />
                    Lat: {geoData.latitude.toFixed(5)}° | Long: {geoData.longitude.toFixed(5)}°
                  </div>
                )}
              </div>

              <textarea
                rows="3"
                className="w-full border rounded-md p-3 mb-4"
                placeholder="Write something..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  className="border rounded-md p-2 flex-grow"
                  placeholder="Add #tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  className="bg-blue-500 text-white px-3 py-2 rounded-md"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((t, i) => (
                    <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowEmojiPicker((p) => !p)}
                className="bg-yellow-400 px-4 py-2 rounded-md mb-3"
              >
                😀 Emoji
              </button>
              {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold"
              >
                🚀 Post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}