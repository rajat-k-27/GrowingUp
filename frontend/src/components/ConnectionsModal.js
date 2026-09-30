"use client";

import { motion } from "framer-motion";
import { X, Users, Activity, Clock } from "lucide-react";

export default function ConnectionsModal({ onClose, identity, partners, allMembers = [] }) {
  // Find offline members and remove any duplicates
  const activeMembersSet = new Set([...partners, identity]);
  const offlineMembers = Array.from(new Set(allMembers.filter(m => !activeMembersSet.has(m))));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#0a0a0f] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Users size={18} />
            <span className="font-bold tracking-widest text-sm">ROOM CONNECTIONS</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-gray-500 tracking-widest border-b border-gray-800 pb-2 flex justify-between">
            <span>NETWORK STATUS</span>
            <span className="text-green-500 flex items-center gap-1"><Activity size={12}/> {partners.length + 1} ONLINE</span>
          </div>

          <div className="space-y-2">
            {/* You */}
            <div className="flex items-center justify-between bg-black border border-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
                <span className="text-gray-200 font-bold">{identity}</span>
              </div>
              <span className="text-[10px] text-green-600 font-bold bg-green-950/30 px-2 py-1 rounded">YOU</span>
            </div>

            {/* Partners */}
            {partners.map((p, idx) => (
              <div key={`active-${idx}`} className="flex items-center justify-between bg-black border border-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse"></div>
                  <span className="text-gray-200 font-bold">{p}</span>
                </div>
                <span className="text-[10px] text-blue-500 font-bold bg-blue-950/30 px-2 py-1 rounded">ACTIVE</span>
              </div>
            ))}
            
            {/* Offline Members */}
            {offlineMembers.map((p, idx) => (
              <div key={`offline-${idx}`} className="flex items-center justify-between bg-black border border-gray-800/50 p-3 rounded-lg opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                  <span className="text-gray-400 font-bold">{p}</span>
                </div>
                <span className="text-[10px] flex items-center gap-1 text-gray-500 font-bold px-2 py-1 rounded border border-gray-800"><Clock size={10} /> INACTIVE</span>
              </div>
            ))}

            {partners.length === 0 && offlineMembers.length === 0 && (
              <div className="text-center p-4 text-xs text-gray-600 italic">
                No other peers have joined this room yet.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
