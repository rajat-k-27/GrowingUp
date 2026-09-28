"use client";

import { Brain } from "lucide-react";
import Window from "../Window";
import { motion } from "framer-motion";

export default function SharedBrain({ onClose }) {
  const stats = [
    { label: "Braincells", value: "2", color: "text-red-400" },
    { label: "Brainrot", value: "97%", color: "text-purple-400" },
    { label: "Common Sense", value: "ERROR", color: "text-red-500" },
    { label: "Yapping", value: "84%", color: "text-blue-400" },
    { label: "Aura", value: "QUESTIONABLE", color: "text-yellow-400" },
    { label: "Friendship", value: "∞", color: "text-green-400" },
  ];

  return (
    <Window title="BRAIN.exe" onClose={onClose} icon={Brain}>
      <div className="flex flex-col items-center gap-8 font-mono">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full" />
          <Brain size={120} className="text-pink-400 relative z-10 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
        </motion.div>
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-widest text-pink-300">OUR SHARED BRAIN</h2>
          <p className="text-xs text-gray-500">Processing complex thoughts... (Failed)</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mt-4">
          {stats.map((stat, i) => (
            <div key={i} className="border border-gray-800 bg-black/50 p-4 flex flex-col gap-1 items-center rounded hover:border-gray-600 transition-colors">
              <span className="text-[10px] text-gray-500 tracking-widest uppercase">{stat.label}</span>
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-pink-900/50 bg-pink-950/20 p-4 w-full rounded">
          <h3 className="text-pink-400 text-xs mb-2 tracking-widest">TODAY'S BRAINROT</h3>
          <p className="text-sm text-gray-300">
            Would you rather fight 100 duck-sized versions of your bro, OR fight one bro-sized duck?
          </p>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 bg-gray-900 border border-gray-700 p-2 text-xs hover:bg-gray-800">100 DUCKS</button>
            <button className="flex-1 bg-gray-900 border border-gray-700 p-2 text-xs hover:bg-gray-800">BRO DUCK</button>
          </div>
        </div>
      </div>
    </Window>
  );
}
