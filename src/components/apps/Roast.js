"use client";

import Window from "../Window";
import { Flame } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Roast({ onClose }) {
  const [currentRoast, setCurrentRoast] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const roasts = [
    "Bro travelled 5,900 km and still couldn't escape your notifications.",
    "Imagine studying in Japan and your biggest achievement is maintaining a streak on BRO.exe.",
    "Your aura is currently in the negatives. Please restart your personality.",
    "Bro is an academic victim but still has time to send brainrot."
  ];

  const handleRoast = () => {
    setAnalyzing(true);
    setCurrentRoast(null);
    setTimeout(() => {
      setAnalyzing(false);
      setCurrentRoast(roasts[Math.floor(Math.random() * roasts.length)]);
    }, 1500);
  };

  return (
    <Window title="ROAST.exe" onClose={onClose} icon={Flame}>
      <div className="flex flex-col items-center gap-6 font-mono">
        <div className="w-full text-center">
          <h2 className="text-orange-500 font-bold tracking-widest mb-2">PERSONALIZED ROAST ENGINE</h2>
          <p className="text-xs text-gray-500">Warning: May cause emotional damage.</p>
        </div>

        <button 
          onClick={handleRoast}
          className="bg-orange-500/20 text-orange-400 border border-orange-500 p-4 font-bold hover:bg-orange-500/40 transition-colors w-full"
        >
          [ GENERATE ROAST ]
        </button>

        <div className="h-32 w-full border border-gray-800 bg-black/50 p-4 flex items-center justify-center text-center">
          {analyzing && <span className="text-orange-500 animate-pulse">ANALYZING BRO... ██████ 40%</span>}
          {!analyzing && currentRoast && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-gray-300">
              <span className="text-orange-500 text-xs block mb-2">RESULT:</span>
              "{currentRoast}"
            </motion.div>
          )}
        </div>
      </div>
    </Window>
  );
}
