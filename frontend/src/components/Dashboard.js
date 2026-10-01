"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSocket } from "./SocketProvider";
import { LogOut, Plus, LogIn, Users } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function Dashboard({ user, onJoinRoom, onLogout }) {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on("userRoomsList", (roomList) => {
      setRooms(roomList);
    });

    socket.emit("getUserRooms", user.username);

    return () => {
      socket.off("userRoomsList");
    };
  }, [socket, user.username]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      const code = joinCode.trim().toUpperCase();
      socket.emit("addRoom", { username: user.username, roomCode: code, roomName: `ROOM ${code}` });
      onJoinRoom(code);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (createName.trim()) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      socket.emit("addRoom", { username: user.username, roomCode: code, roomName: createName });
      onJoinRoom(code);
    }
  };

  const selectRoom = (code) => {
    onJoinRoom(code);
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-mono z-50 overflow-y-auto">
      <div className="crt-noise" />
      <div className="scanline" />

      <div className="min-h-full w-full flex flex-col items-center py-10 px-4 sm:px-6 relative">
        
        {/* Top Header */}
        <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 z-50">
          <div className="text-gray-400 text-sm order-2 sm:order-1 text-center sm:text-left">
            LOGGED IN AS: <br className="sm:hidden" /><span className="text-white font-bold text-lg text-shadow-glow uppercase">{user.username}</span>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-gray-500 hover:text-red-500 border border-gray-800 hover:border-red-500 px-4 py-2 rounded transition-colors order-1 sm:order-2 w-full sm:w-auto justify-center">
            <LogOut size={16} /> LOGOUT
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full flex flex-col md:flex-row gap-8 relative z-10 mt-8"
        >
        {/* Left Col: Rooms List */}
        <div className="flex-1 glass-panel border border-gray-800 p-6 flex flex-col h-[400px] md:h-[600px] rounded-xl">
          <h2 className="text-xl font-bold text-green-500 tracking-widest mb-6 border-b border-gray-800 pb-4">YOUR CONNECTIONS</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {rooms.length === 0 ? (
              <div className="text-gray-600 text-sm text-center mt-10">No active connections found. Create or join a room.</div>
            ) : (
              rooms.map((room, i) => (
                <button
                  key={i}
                  onClick={() => selectRoom(room.code)}
                  className="w-full text-left bg-gray-900 border border-gray-700 hover:border-green-500 hover:bg-gray-800 p-4 transition-all group flex justify-between items-center rounded"
                >
                  <div>
                    <div className="text-white font-bold group-hover:text-green-400">{room.name}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Users size={12} /> CODE: {room.code}
                    </div>
                  </div>
                  <div className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LogIn size={20} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Actions */}
        <div className="flex-1 flex flex-col gap-6 md:gap-8 h-auto md:h-[600px]">
          {/* Join Form */}
          <div className="glass-panel border border-blue-900/30 bg-gradient-to-b from-blue-950/20 to-transparent p-6 flex flex-col flex-1 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all">
            <h3 className="text-lg font-bold text-blue-500 tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> JOIN NETWORK
            </h3>
            <form onSubmit={handleJoin} className="flex-1 flex flex-col justify-center">
              <label className="text-xs text-gray-500 mb-2 font-bold tracking-widest">ENTER ROOM CODE</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="XXXXXX"
                className="w-full bg-black border border-gray-800 p-4 text-center tracking-[0.5em] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] uppercase mb-6 rounded transition-all"
              />
              <button type="submit" disabled={!joinCode.trim()} className="w-full bg-blue-600/10 border border-blue-500 p-4 hover:bg-blue-500 hover:text-white text-blue-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-blue-400 tracking-widest font-bold transition-all rounded shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                ESTABLISH LINK
              </button>
            </form>
          </div>

          {/* Create Form */}
          <div className="glass-panel border border-purple-900/30 bg-gradient-to-b from-purple-950/20 to-transparent p-6 flex flex-col flex-1 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-all">
            <h3 className="text-lg font-bold text-purple-500 tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span> CREATE NETWORK
            </h3>
            <form onSubmit={handleCreate} className="flex-1 flex flex-col justify-center">
              <label className="text-xs text-gray-500 mb-2 font-bold tracking-widest">NETWORK ALIAS</label>
              <input
                type="text"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="MY SQUAD"
                className="w-full bg-black border border-gray-800 p-4 text-center tracking-[0.2em] focus:outline-none focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] uppercase mb-6 rounded transition-all"
              />
              <button type="submit" disabled={!createName.trim()} className="w-full bg-purple-600/10 border border-purple-500 p-4 hover:bg-purple-500 hover:text-white text-purple-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-purple-400 tracking-widest font-bold transition-all rounded shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                GENERATE & ENTER
              </button>
            </form>
          </div>
        </div>

      </motion.div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        title="SYSTEM LOGOUT"
        message="Are you sure you want to log out completely from Bro OS?"
        confirmText="LOGOUT"
      />
    </div>
  );
}
