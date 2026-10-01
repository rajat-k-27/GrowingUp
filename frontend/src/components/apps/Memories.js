"use client";

import Window from "../Window";
import { Camera, Image as ImageIcon, Send, Clock, Calendar, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSocket } from "../SocketProvider";
import toast from "react-hot-toast";
import ImageViewer from "../ImageViewer";
import ConfirmModal from "../ConfirmModal";

export default function Memories({ onClose, identity }) {
  const { socket } = useSocket();
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [desc, setDesc] = useState("");
  const [imageStr, setImageStr] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMemory = (data) => {
      setMemories(prev => {
        // Update duplicate with server version (which has Cloudinary URL)
        if (prev.find(m => m.id === data.id)) {
          return prev.map(m => m.id === data.id ? data : m);
        }
        return [data, ...prev]; // newer at top
      });
    };

    const handleMemoriesList = (history) => {
      // Deduplicate history
      const unique = history.filter((a, i, self) => self.findIndex(t => t.id === a.id) === i);
      setMemories(unique);
      setIsLoading(false);
    };

    const handleMemoryDeleted = (id) => {
      setMemories(prev => prev.filter(m => m.id !== id && m._id !== id));
    };
    
    const fetchInit = () => {
      socket.emit("getMemories");
    };

    if (socket.connected) fetchInit();
    socket.on("connect", fetchInit);

    socket.on("newMemory", handleNewMemory);
    socket.on("memoriesList", handleMemoriesList);
    socket.on("memoryDeleted", handleMemoryDeleted);

    return () => {
      socket.off("connect", fetchInit);
      socket.off("newMemory", handleNewMemory);
      socket.off("memoriesList", handleMemoriesList);
      socket.off("memoryDeleted", handleMemoryDeleted);
    };
  }, [socket]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (e.g., limit to 2MB to not blow up MongoDB document size)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large! Please upload a file smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress heavily to prevent Socket.IO and UI lag
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setImageStr(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;
    
    if (!desc.trim() && !imageStr) {
      toast.error("PLEASE ADD A PHOTO OR A DESCRIPTION");
      return;
    }

    const now = new Date();
    
    const newMem = {
      id: "MEM_" + Date.now(),
      author: identity,
      description: desc,
      image: imageStr,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };

    socket.emit("createMemory", newMem);
    // Add locally for instant feedback
    setMemories(prev => [newMem, ...prev]);
    
    setDesc("");
    setImageStr(null);
    toast.success("MEMORY SAVED");
  };

  return (
    <Window title="MEMORIES.exe" onClose={onClose} icon={Camera} width="max-w-2xl">
      <div className="flex flex-col h-full font-sans">
        
        {/* Memory Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-40 opacity-50 space-y-4 mt-10">
                <div className="w-8 h-8 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                <div className="text-yellow-500/50 text-[10px] tracking-widest font-bold font-mono">LOADING DATA...</div>
             </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 opacity-30 space-y-3">
               <Camera size={48} className="text-gray-500" />
               <div className="text-gray-500 text-[10px] tracking-widest font-bold text-center font-mono">NO MEMORIES YET<br/><span className="text-[8px]">SNAP SOMETHING BELOW</span></div>
            </div>
          ) : memories.map((mem) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={mem._id || mem.id} 
              className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden flex flex-col"
            >
              {mem.image && (
                <div className="w-full bg-black/60 border-b border-gray-900 flex justify-center p-2">
                  <img 
                    src={mem.image} 
                    alt="Memory" 
                    className="max-h-64 object-contain rounded cursor-pointer hover:opacity-90 transition-opacity" 
                    loading="lazy" 
                    onClick={() => setExpandedImage(mem.image)}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-purple-400 font-mono tracking-widest">{mem.author}</span>
                    {mem.author === identity && (
                      <button onClick={() => setDeleteConfirmId(mem.id || mem._id)} className="text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 font-mono">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {mem.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {mem.time}</span>
                  </div>
                </div>
                {mem.description && (
                  <p className="text-gray-300 text-sm mt-2">{mem.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Upload Form */}
        <div className="bg-gray-900 border-t border-gray-800 p-4">
          {imageStr && (
            <div className="relative inline-block mb-3 border border-gray-700 p-1 bg-black rounded">
              <img src={imageStr} alt="Preview" className="h-16 object-contain" />
              <button 
                type="button" 
                onClick={() => setImageStr(null)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-black border border-gray-700 hover:bg-gray-800 text-purple-500 p-3 rounded transition-colors"
            >
              <ImageIcon size={18} />
            </button>
            <input 
              type="text" 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe this memory..."
              className="flex-1 min-w-0 bg-black border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-purple-500 text-gray-300"
            />
            <button 
              type="submit" 
              disabled={!desc.trim() && !imageStr}
              className="bg-purple-900 border border-purple-800 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-purple-300 px-6 py-2 rounded flex items-center justify-center transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (socket && deleteConfirmId) {
            socket.emit("deleteMemory", deleteConfirmId);
          }
        }}
        title="DELETE MEMORY"
        message="Are you sure you want to delete this memory? It will be permanently removed for everyone."
      />

      {expandedImage && (
        <ImageViewer src={expandedImage} onClose={() => setExpandedImage(null)} />
      )}
    </Window>
  );
}
