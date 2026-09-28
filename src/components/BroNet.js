"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSocket } from "./SocketProvider";

import { LogOut } from "lucide-react";

export default function BroNet({ identity, roomCode, onExitRoom }) {
  const { socket, isConnected } = useSocket();
  const [onlinePartners, setOnlinePartners] = useState([]);
  
  useEffect(() => {
    if (!socket) return;
    
    // Join the room with our identity
    socket.emit("joinRoom", { username: identity, roomCode });

    socket.on("roomUsers", (users) => {
      // Filter ourselves out so we only show partners
      setOnlinePartners(users.filter(u => u !== identity));
    });

    return () => {
      socket.off("roomUsers");
      socket.emit("leaveRoom");
    };
  }, [socket, identity, roomCode]);

  const handleExit = () => {
    socket.emit("leaveRoom");
    onExitRoom();
  };

  const hasPartners = onlinePartners.length > 0;
  
  return (
    <div className="w-full relative flex flex-col md:flex-row items-center justify-between p-4 border-b border-gray-800 bg-black/40 backdrop-blur-md min-h-[70px] gap-4 md:gap-0">
      
      {/* Left: Logo */}
      <div className="flex flex-col items-center md:items-start gap-1">
        <div className="text-red-500 font-mono text-sm tracking-widest font-bold">
          BRO_OS <span className="text-gray-500 text-xs">[{roomCode}]</span>
        </div>
      </div>

      {/* Center Group: You, Bar, Them */}
      <div className="flex items-center gap-4 md:gap-6 font-mono order-first md:order-none w-full md:w-auto justify-center">
        {/* Us */}
        <div className="flex flex-col items-end text-green-400">
          <span className="font-bold flex items-center gap-2">
            <span className="hidden sm:inline">{identity}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
          </span>
          <span className="text-[10px] text-green-700 hidden sm:block">ONLINE (YOU)</span>
        </div>

        {/* Connection Bar */}
        <div className="flex flex-col items-center flex-1 max-w-[150px] md:max-w-[250px] md:w-[250px]">
          <div className="relative w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-1">
            {(isConnected && hasPartners) && (
              <motion.div
                className="absolute top-0 bottom-0 w-12 bg-blue-500 rounded-full"
                animate={{ left: ["0%", "100%", "0%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          <span className="text-[8px] md:text-[10px] text-blue-400 tracking-widest whitespace-nowrap">
            {isConnected && hasPartners ? "SECURE LINK ACTIVE" : "WAITING FOR PEERS"}
          </span>
        </div>

        {/* Them */}
        <div className={`flex flex-col items-start ${hasPartners ? 'text-blue-400' : 'text-gray-600'}`}>
          {hasPartners ? (
            <>
              <span className="font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                <span className="hidden sm:inline">{onlinePartners.join(" & ").toUpperCase()}</span>
              </span>
              <span className="text-[10px] text-blue-700 hidden sm:block">CONNECTED</span>
            </>
          ) : (
            <>
              <span className="font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
              </span>
              <span className="text-[10px] text-gray-700 hidden sm:block">OFFLINE</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Exit */}
      <div className="flex items-center">
        <button 
          onClick={handleExit}
          className="px-3 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 hover:border-red-500 text-red-400 text-xs font-bold tracking-widest flex items-center gap-2 rounded transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        >
          <LogOut size={14} /> <span className="hidden sm:inline">LEAVE NETWORK</span>
        </button>
      </div>
      
    </div>
  );
}
