"use client";

import { motion } from "framer-motion";
import { X, Download } from "lucide-react";

export default function ImageViewer({ src, onClose }) {
  const handleDownload = () => {
    // Create an anchor element and trigger a download
    const link = document.createElement("a");
    link.href = src;
    link.download = `bro_os_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex flex-col items-center max-w-4xl w-full max-h-full"
      >
        <div className="w-full flex justify-end gap-4 mb-4 z-10 px-2">
          <button 
            onClick={handleDownload}
            className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
            title="Download Image"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-red-500 text-white rounded-full transition-colors shadow-lg"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <img 
          src={src} 
          alt="Expanded View" 
          className="max-w-full max-h-[80vh] object-contain rounded-lg border border-gray-800 shadow-2xl"
        />
      </motion.div>
    </div>
  );
}
