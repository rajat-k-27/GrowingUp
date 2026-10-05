"use client";

import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Minus, Square, Copy } from "lucide-react";

export default function Window({ title, onClose, children, icon: Icon, width = "max-w-2xl" }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const dragControls = useDragControls();

  return (
    <div className={`z-[100] flex pointer-events-none ${
      isMaximized 
        ? "fixed inset-0 pb-[75px] sm:pb-0 bg-[#000]" 
        : "absolute inset-0 items-center justify-center p-4 pb-24 sm:p-6 sm:pb-6"
    }`}>
      <motion.div
        drag={!isMaximized}
        dragControls={dragControls}
        dragMomentum={false}
        dragListener={false}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
        className={`bg-[#0a0a0f] overflow-hidden pointer-events-auto flex flex-col ${
          isMaximized 
            ? "w-full h-full border-b sm:border-b-0 border-gray-700" 
            : `w-full ${width} border border-gray-700 shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-lg h-[75vh] sm:h-[80vh] max-h-full sm:max-h-[85vh]`
        }`}
      >
        {/* Title Bar (Hidden when Maximized on ALL devices) */}
        <div 
          className={`bg-[#111] border-b border-gray-800 p-2 items-center justify-between select-none shrink-0 ${isMaximized ? 'hidden' : 'flex'} cursor-move touch-none`}
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-2 pl-2 text-gray-400 font-mono text-sm">
            {Icon && <Icon size={14} />}
            {title}
          </div>
          <div className="flex items-center gap-2 pr-2" onPointerDown={(e) => e.stopPropagation()}>
            <button className="text-gray-500 hover:text-white transition-colors cursor-pointer"><Minus size={14} /></button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-gray-500 hover:text-white transition-colors cursor-pointer ml-1"
            >
              {isMaximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors ml-2 cursor-pointer"><X size={16} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#050508] relative">
          
          {/* Floating controls when maximized (ALL devices) */}
          {isMaximized && (
            <div className="absolute top-4 right-4 z-[100] flex items-center gap-3">
              <button 
                onClick={() => setIsMaximized(false)}
                className="w-10 h-10 bg-black/60 backdrop-blur-md border border-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:text-white shadow-lg active:scale-95 transition-transform"
              >
                <Copy size={16} />
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-black/60 backdrop-blur-md border border-red-900/50 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 shadow-lg active:scale-95 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className={`relative z-10 p-4 sm:p-6 h-full flex flex-col ${isMaximized ? 'pt-16 sm:pt-16' : ''}`}>
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
