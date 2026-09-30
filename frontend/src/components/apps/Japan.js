"use client";

import Window from "../Window";
import { Map } from "lucide-react";
import { motion } from "framer-motion";

export default function Japan({ onClose }) {
  const locations = [
    { city: "TOKYO", spots: ["University", "First apartment", "Akihabara random side quest"] },
    { city: "KYOTO", spots: ["Temple trip", "Matcha overload"] }
  ];

  return (
    <Window title="JAPAN.exe" onClose={onClose} icon={Map}>
      <div className="flex flex-col gap-6 font-mono">
        <div className="text-center border-b border-red-900/50 pb-4">
          <h2 className="text-red-500 font-bold tracking-widest text-xl mb-1">JAPAN DLC</h2>
          <p className="text-xs text-red-400/50">Tracking the 2-year side quest.</p>
        </div>

        <div className="space-y-6">
          {locations.map((loc, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              key={i} 
              className="bg-red-950/10 border border-red-900/30 p-4"
            >
              <h3 className="text-red-400 font-bold mb-3">{loc.city}</h3>
              <ul className="space-y-2">
                {loc.spots.map((spot, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-red-600">📍</span> {spot}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </Window>
  );
}
