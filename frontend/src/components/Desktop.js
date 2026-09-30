"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BroNet from "./BroNet";
import { Package, Brain, Camera, PlayCircle, Palette, Trophy, Lock, MessageSquare, Zap, AlertTriangle, Heart, X, Grid } from "lucide-react";
import DropModal from "./DropModal";
import PingModal from "./PingModal";
import BroWall from "./BroWall";
import { useSocket } from "./SocketProvider";
import SharedBrain from "./apps/SharedBrain";
import Memories from "./apps/Memories";
import Sync from "./apps/Sync";
import Draw from "./apps/Draw";
import Achievements from "./apps/Achievements";
import Secret from "./apps/Secret";
import Chat from "./apps/Chat";

export default function Desktop({ identity, roomCode, onExitRoom }) {

  const [activeWindow, setActiveWindow] = useState(null);
  const [showDrop, setShowDrop] = useState(false);
  const [showPing, setShowPing] = useState(false);
  const [showAppDrawer, setShowAppDrawer] = useState(false);
  const { socket } = useSocket();

  const icons = [
    { name: "DROP.exe", icon: Package, color: "text-blue-400", onClick: () => setShowDrop(true) },
    { name: "BRAIN.exe", icon: Brain, color: "text-pink-400", onClick: () => setActiveWindow("BRAIN") },
    { name: "MEMORIES.exe", icon: Camera, color: "text-yellow-400", onClick: () => setActiveWindow("MEMORIES") },
    { name: "SYNC.exe", icon: PlayCircle, color: "text-blue-400", onClick: () => setActiveWindow("SYNC") },
    { name: "DRAW.exe", icon: Palette, color: "text-purple-400", onClick: () => setActiveWindow("DRAW") },
    { name: "ACHIEVEMENTS.exe", icon: Trophy, color: "text-yellow-500", onClick: () => setActiveWindow("ACHIEVEMENTS") },
    { name: "SECRET.exe", icon: Lock, color: "text-gray-500", onClick: () => setActiveWindow("SECRET") },
    { name: "CHAT.exe", icon: MessageSquare, color: "text-green-400", onClick: () => setActiveWindow("CHAT") },
  ];

  const handleImHere = () => {
    if (socket) {
      socket.emit("imHere", { identity, timestamp: Date.now() });
    }
  };

  return (
    <div className="flex flex-col h-full text-white font-sans selection:bg-blue-500/30">
      <BroNet identity={identity} roomCode={roomCode} onExitRoom={onExitRoom} />
      
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Desktop Icons */}
        <div className="w-24 p-4 flex flex-col gap-6 z-50 hidden sm:flex relative">
          {icons.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1 group hover:bg-white/10 p-2 rounded transition-colors relative z-50 cursor-pointer"
            >
              <item.icon className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform drop-shadow-lg`} />
              <span className="text-[10px] text-center font-mono break-words">{item.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full p-4 z-10 flex flex-col h-full overflow-hidden">
          
          <div className="m-auto max-w-md md:max-w-2xl w-full space-y-4 flex flex-col h-full md:h-[600px] pb-16 sm:pb-0 pt-2">
            {/* The Huge DROP Button */}
            <button
              onClick={() => setShowDrop(true)}
              className="w-full relative group flex-shrink-0"
            >
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-2xl"></div>
              <div className="relative glass-panel border border-blue-500/30 p-6 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-400 transition-colors">
                <Package className="w-12 h-12 text-blue-400" />
                <span className="text-xl font-bold tracking-widest text-blue-100">DROP SOMETHING</span>
              </div>
            </button>

            {/* Quick Actions Row */}
            <div className="flex gap-4 w-full flex-shrink-0">
              <button 
                onClick={() => setShowPing(true)}
                className="flex-1 glass-panel border border-red-500/30 p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors group"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 group-hover:animate-pulse" />
                <span className="font-bold text-red-100 tracking-wider">PING BRO</span>
              </button>

              <button 
                onClick={handleImHere}
                className="flex-1 glass-panel border border-pink-500/30 p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-pink-500/10 transition-colors group"
              >
                <Heart className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-pink-100 tracking-wider">I'M HERE</span>
              </button>
            </div>

            {/* Bro Wall */}
            <BroWall identity={identity} />
          </div>

        </div>

        {/* Mobile Bottom Dock (visible on mobile) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0f] border-t border-gray-800 p-2 flex justify-around items-center pb-safe z-[60]">
           <button onClick={() => setShowDrop(true)} className="p-3 text-blue-400 flex flex-col items-center gap-1"><Package size={24} /><span className="text-[10px] font-mono">DROP</span></button>
           <button onClick={() => setActiveWindow("CHAT")} className="p-3 text-green-400 flex flex-col items-center gap-1"><MessageSquare size={24} /><span className="text-[10px] font-mono">CHAT</span></button>
           <button onClick={() => setShowPing(true)} className="p-3 text-red-400 flex flex-col items-center gap-1"><AlertTriangle size={24} /><span className="text-[10px] font-mono">PING</span></button>
           <button onClick={() => setShowAppDrawer(true)} className="p-3 text-white flex flex-col items-center gap-1"><Grid size={24} /><span className="text-[10px] font-mono">APPS</span></button>
        </div>

        {/* Mobile App Drawer Overlay */}
        <AnimatePresence>
          {showAppDrawer && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: "circOut", duration: 0.2 }}
              className="sm:hidden fixed inset-0 z-[60] bg-black/95 flex flex-col justify-end"
            >
              <div className="p-4 flex justify-between items-center border-b border-gray-800 bg-gray-900/50">
                <span className="text-white font-mono font-bold tracking-widest text-sm">ALL APPLICATIONS</span>
                <button onClick={() => setShowAppDrawer(false)} className="text-gray-400 hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6 p-6 overflow-y-auto mb-10">
                {icons.filter(i => i.name !== "DROP.exe" && i.name !== "CHAT.exe").map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      item.onClick();
                      setShowAppDrawer(false);
                    }}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-500 transition-colors"
                  >
                    <item.icon className={`w-10 h-10 ${item.color} drop-shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] text-center font-mono text-gray-300 break-words">{item.name.replace('.exe', '')}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      {/* Windows rendering */}
      {activeWindow === "BRAIN" && <SharedBrain onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "MEMORIES" && <Memories onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "SYNC" && <Sync onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "DRAW" && <Draw onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "ACHIEVEMENTS" && <Achievements onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "SECRET" && <Secret onClose={() => setActiveWindow(null)} identity={identity} />}
      {activeWindow === "CHAT" && <Chat onClose={() => setActiveWindow(null)} identity={identity} />}
      
      </div>

      {showDrop && <DropModal onClose={() => setShowDrop(false)} identity={identity} />}
      {showPing && <PingModal onClose={() => setShowPing(false)} identity={identity} />}
    </div>
  );
}
