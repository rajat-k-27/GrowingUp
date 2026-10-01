"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "./SocketProvider";
import { LogOut } from "lucide-react";
import ConnectionsModal from "./ConnectionsModal";

export default function BroNet({ identity, roomCode, onExitRoom }) {
  const { socket, isConnected } = useSocket();
  const [onlinePartners, setOnlinePartners] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    if (!socket) return;
    
    // Join the room with our identity
    socket.emit("joinRoom", { username: identity, roomCode });

    socket.on("roomUsers", (users) => {
      // Filter ourselves out so we only show partners
      setOnlinePartners(users.filter(u => u !== identity));
    });

    socket.on("roomMembers", (members) => {
      setAllMembers(members);
    });

    return () => {
      socket.off("roomUsers");
      socket.off("roomMembers");
      socket.emit("leaveRoom");
    };
  }, [socket, identity, roomCode]);

  const handleExit = () => {
    socket.emit("leaveRoom");
    onExitRoom();
  };

  const hasPartners = onlinePartners.length > 0;
  
  return (
    <>
      <div className="w-full shrink-0 relative z-50">
        {/* DESKTOP & TABLET NAVBAR (md and up) */}
        <div className="hidden md:flex w-full h-14 bg-black/60 backdrop-blur-2xl border-b border-white/5 items-center justify-between px-4 lg:px-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {/* Left: Branding */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <span className="text-red-500 font-black font-mono text-lg lg:text-xl tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">BRO_OS</span>
            <span className="bg-white/5 px-2 py-1 rounded text-[9px] lg:text-[10px] font-mono border border-white/10 text-gray-400 tracking-widest flex items-center">
              <span className="hidden lg:inline mr-1">ROOM:</span> <span className="text-white">{roomCode}</span>
            </span>
          </div>

          {/* Center: Connection Status */}
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 lg:gap-4 group cursor-pointer hover:bg-white/5 px-2 lg:px-6 py-1.5 lg:py-2 rounded-full transition-all duration-300 border border-transparent hover:border-white/10 shrink-0"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
            <div className="w-20 lg:w-48 h-1 bg-gray-900 rounded-full overflow-hidden relative shadow-inner">
              {(isConnected && hasPartners) && (
                <motion.div 
                  className="absolute inset-y-0 w-8 lg:w-12 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" 
                  animate={{ left: ["-30%", "130%"] }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                />
              )}
            </div>
            <div className={`w-2 h-2 rounded-full ${hasPartners ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} animate-pulse`} />
            
            <div className="flex flex-col items-start ml-2 gap-1">
              <span className="text-[9px] lg:text-[10px] text-blue-400 font-mono font-bold tracking-widest leading-none">
                {isConnected && hasPartners ? "SECURE LINK ACTIVE" : "WAITING"}
              </span>
              <span className="text-[8px] lg:text-[9px] text-gray-500 font-mono tracking-widest leading-none group-hover:text-gray-300 transition-colors">
                {hasPartners ? `${onlinePartners.length + 1} NODES CONNECTED` : "1 NODE CONNECTED"}
              </span>
            </div>
          </button>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <button 
              onClick={handleExit} 
              className="flex items-center gap-1 lg:gap-2 text-red-500 hover:text-red-400 font-mono text-[10px] lg:text-xs font-bold bg-red-500/10 hover:bg-red-500/20 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] whitespace-nowrap"
            >
              <LogOut size={14} /> LEAVE ROOM
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET NAVBAR (max-md) */}
        <div className="md:hidden flex flex-col items-center justify-center pt-3 px-3 pb-2 z-50">
          <div className="w-full max-w-lg bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* Decorative top glow */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            
            {/* Top Row */}
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <span className="text-red-500 font-black font-mono text-sm tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">BRO_OS</span>
                <span className="bg-gray-900/80 px-2 py-0.5 rounded font-mono border border-gray-700 text-gray-400 tracking-widest flex items-center">
                  <span className="text-[8px] mr-1">RM:</span> <span className="text-[10px] text-white">{roomCode}</span>
                </span>
              </div>
              <button 
                onClick={handleExit} 
                className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>

            {/* Bottom Row: Connection Pill */}
            <button 
              onClick={() => setShowModal(true)} 
              className="flex items-center justify-between w-full bg-white/5 border border-white/5 rounded-xl p-2.5 active:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                <div className="w-16 sm:w-32 h-1 bg-gray-900 rounded-full overflow-hidden relative">
                  {(isConnected && hasPartners) && (
                    <motion.div 
                      className="absolute inset-y-0 w-8 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" 
                      animate={{ left: ["-50%", "150%"] }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                    />
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${hasPartners ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} animate-pulse`} />
              </div>
              
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-mono text-blue-400 font-bold tracking-widest">
                  {isConnected && hasPartners ? "LINK ACTIVE" : "WAITING"}
                </span>
                <span className="text-[8px] font-mono text-gray-500 tracking-widest">
                  {hasPartners ? `${onlinePartners.length + 1} NODES` : "1 NODE"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ConnectionsModal 
            identity={identity} 
            partners={onlinePartners}
            allMembers={allMembers}
            onClose={() => setShowModal(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
