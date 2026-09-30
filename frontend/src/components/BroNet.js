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
      <div className="w-full relative flex flex-col md:flex-row items-center justify-between p-3 sm:p-4 border-b border-gray-800 bg-black/40 backdrop-blur-md gap-4 md:gap-0">
        
        {/* Mobile Top Row: Logo & Exit */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Left: Logo */}
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="text-red-500 font-mono tracking-widest font-bold flex items-center gap-2">
              <span>BRO_OS</span> 
              <span className="text-gray-400 bg-gray-900 px-2 py-0.5 rounded text-[10px] border border-gray-700">ROOM: {roomCode}</span>
            </div>
          </div>
          
          {/* Right: Exit (Mobile) */}
          <div className="md:hidden shrink-0">
            <button 
              onClick={handleExit}
              className="p-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 text-red-400 rounded"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Center Group: You, Bar, Them (Clickable) */}
        {/* Center Group: Minimalist Connection Bar (Clickable) */}
        <div className="w-full md:flex-1 flex justify-center mt-2 md:mt-0">
          <button 
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center gap-1.5 font-mono w-full md:w-auto hover:bg-white/5 p-2 rounded-xl transition-colors cursor-pointer group"
          >
            {/* Dots and Bar Row */}
            <div className="flex items-center gap-3 w-48 sm:w-[250px] md:w-[300px] justify-center shrink-0 mb-1">
              {/* Green Dot (You) */}
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse shrink-0"></div>
              
              {/* Connection Bar */}
              <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                {(isConnected && hasPartners) && (
                  <motion.div
                    className="absolute top-0 bottom-0 w-16 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"
                    animate={{ left: ["0%", "100%", "0%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>

              {/* Blue/Red Dot (Them) */}
              {hasPartners ? (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse shrink-0"></div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] shrink-0"></div>
              )}
            </div>

            {/* Status Text */}
            <span className="text-[10px] text-blue-400 tracking-widest font-bold group-hover:text-blue-300">
              {isConnected && hasPartners ? "SECURE LINK ACTIVE" : "WAITING FOR PEERS"}
            </span>
            
            {/* View Members Pill */}
            <span className="text-[9px] text-gray-400 group-hover:text-white tracking-widest mt-1 border border-gray-700 px-4 py-1 rounded-full bg-gray-900/80 shadow-lg transition-colors">
              VIEW MEMBERS ({hasPartners ? onlinePartners.length + 1 : 1})
            </span>
          </button>
        </div>

        {/* Right: Exit (Desktop) */}
        <div className="hidden md:flex items-center shrink-0">
          <button 
            onClick={handleExit}
            className="px-3 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 hover:border-red-500 text-red-400 text-xs font-bold tracking-widest flex items-center gap-2 rounded transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            <LogOut size={14} /> <span>LEAVE NETWORK</span>
          </button>
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
