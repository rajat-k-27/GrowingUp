"use client";

import { motion } from "framer-motion";
import { useSocket } from "./SocketProvider";
import { AlertTriangle, X } from "lucide-react";

export default function PingModal({ onClose, identity }) {
  const { socket } = useSocket();

  const pingReasons = [
    "BRO",
    "LOOK AT THIS",
    "I'M BORED",
    "CALL ME LATER",
    "EMERGENCY",
    "NO REASON",
    "🗿",
    "WAKE UP"
  ];

  const handlePing = (reason) => {
    if (socket) {
      socket.emit("pingBro", { identity, reason });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-black/90 border border-cyan-500/30 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-[0_20px_60px_rgba(34,211,238,0.2)] relative"
      >
        {/* Warning Stripes Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, #06b6d4 10px, #06b6d4 20px)" }}></div>
        
        <div className="p-5 border-b border-cyan-500/20 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3 text-cyan-400 font-bold tracking-widest text-lg">
            <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30">
              <AlertTriangle size={20} className="animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </div>
            INITIATE PING
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 flex flex-col gap-4 relative z-10">
          <h3 className="text-gray-400 text-xs font-mono text-center tracking-[0.2em]">SELECT PROTOCOL</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {pingReasons.map((r, idx) => (
              <button 
                key={idx}
                onClick={() => handlePing(r)}
                className={`p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-400 text-gray-300 font-bold text-xs tracking-widest transition-all text-center flex items-center justify-center ${r === "EMERGENCY" ? "col-span-2 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]" : ""}`}
              >
                {r}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="mt-2 text-[10px] tracking-widest text-gray-600 hover:text-gray-400 text-center font-bold">
            CANCEL
          </button>
        </div>
      </motion.div>
    </div>
  );
}
