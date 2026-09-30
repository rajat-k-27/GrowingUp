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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel border border-red-500/50 rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-4 border-b border-red-900/50 flex justify-between items-center bg-red-950/20">
          <div className="flex items-center gap-2 text-red-500 font-bold tracking-widest">
            <AlertTriangle size={18} className="animate-pulse" />
            PING BRO
          </div>
          <button onClick={onClose} className="text-red-400/50 hover:text-red-400"><X size={20} /></button>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <h3 className="text-gray-400 text-sm font-mono mb-2 text-center">WHY ARE YOU PINGING?</h3>
          {pingReasons.map((reason, i) => (
            <button
              key={i}
              onClick={() => handlePing(reason)}
              className="w-full p-3 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 hover:border-red-500 text-red-200 font-mono text-sm transition-colors rounded"
            >
              [ {reason} ]
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
