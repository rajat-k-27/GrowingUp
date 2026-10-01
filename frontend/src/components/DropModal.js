"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSocket } from "./SocketProvider";
import { Camera, Type, Mic, Image as ImageIcon, Zap, X } from "lucide-react";
import toast from "react-hot-toast";

export default function DropModal({ onClose, identity }) {
  const { socket } = useSocket();
  const [selectedType, setSelectedType] = useState(null);
  const [text, setText] = useState("");
  const [mediaBase64, setMediaBase64] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const dropTypes = [
    { id: "PHOTO", icon: Camera, color: "text-blue-400", label: "PHOTO" },
    { id: "THOUGHT", icon: Type, color: "text-green-400", label: "THOUGHT" },
    { id: "VOICE", icon: Mic, color: "text-purple-400", label: "VOICE" },
    { id: "MEME", icon: ImageIcon, color: "text-yellow-400", label: "MEME" },
    { id: "BRAINROT", icon: Zap, color: "text-orange-400", label: "BRAINROT" },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
            setMediaBase64(compressedBase64);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setMediaBase64(evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSend = () => {
    if (!socket) return;
    if (!text.trim() && !mediaBase64) {
      toast.error("DROP CANNOT BE EMPTY");
      return;
    }

    setIsUploading(true);
    socket.emit("sendDrop", { 
      identity, 
      type: selectedType || "THOUGHT", 
      content: text, 
      mediaBase64 
    });
    // We can close immediately, the server handles the upload
    onClose();
    toast.success("DROP SENT TO WALL");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
        className="glass-panel border border-blue-500/30 rounded-2xl w-full max-w-md overflow-hidden relative"
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-blue-950/20">
          <h2 className="font-bold text-blue-400 font-mono tracking-widest">NEW DROP</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6">
          {!selectedType ? (
            <div className="grid grid-cols-3 gap-4">
              {dropTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-500 hover:bg-gray-800 transition-colors"
                >
                  <type.icon className={`w-8 h-8 ${type.color}`} />
                  <span className="text-[10px] font-mono text-gray-300">{type.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-sm font-mono text-gray-400 flex justify-between">
                <span>TYPE: {selectedType}</span>
                {mediaBase64 && <span className="text-green-400">Media Attached ✓</span>}
              </div>
              
              {(selectedType === "PHOTO" || selectedType === "MEME" || selectedType === "VOICE") && !mediaBase64 && (
                <label className="w-full bg-black/50 border border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-900/50 transition-colors">
                  <span className="text-gray-400 font-mono text-sm mb-2 text-center">Tap to upload {selectedType === "VOICE" ? "Audio" : "Image"}</span>
                  <input 
                    type="file" 
                    accept={selectedType === "VOICE" ? "audio/*" : "image/*"} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
              )}

              {mediaBase64 && selectedType !== "VOICE" && (
                <img src={mediaBase64} alt="preview" className="w-full h-32 object-cover rounded-lg border border-gray-700" />
              )}
              {mediaBase64 && selectedType === "VOICE" && (
                <audio src={mediaBase64} controls className="w-full" />
              )}
              
              <textarea 
                autoFocus
                className="w-full bg-black/50 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 min-h-[80px] resize-none"
                placeholder={selectedType === "THOUGHT" ? "Drop a thought..." : "Add a caption (optional)..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="flex justify-end gap-3">
                <button onClick={() => setSelectedType(null)} className="px-4 py-2 text-gray-400 font-mono text-sm hover:text-white">BACK</button>
                <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded font-mono transition-colors">
                  SEND DROP
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
