"use client";

import { motion } from "framer-motion";
import { X, Minus, Square } from "lucide-react";

export default function Window({ title, onClose, children, icon: Icon, width = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
        className={`w-full ${width} bg-[#0a0a0f] border border-gray-700 shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]`}
      >
        {/* Title Bar */}
        <div className="bg-[#111] border-b border-gray-800 p-2 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 pl-2 text-gray-400 font-mono text-sm">
            {Icon && <Icon size={14} />}
            {title}
          </div>
          <div className="flex items-center gap-2 pr-2">
            <button className="text-gray-500 hover:text-white transition-colors"><Minus size={14} /></button>
            <button className="text-gray-500 hover:text-white transition-colors"><Square size={12} /></button>
            <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors ml-2"><X size={16} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#050508] relative">
          <div className="relative z-10 p-4 sm:p-6">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
