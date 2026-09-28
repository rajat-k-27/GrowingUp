"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSocket } from "./SocketProvider";

export default function IdentitySelector({ onLogin }) {
  const { socket } = useSocket();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on("loginSuccess", (user) => {
      onLogin(user);
    });

    socket.on("loginError", (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off("loginSuccess");
      socket.off("loginError");
    };
  }, [socket, onLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Fields cannot be empty");
      setTimeout(() => setError(null), 2000);
      return;
    }
    
    if (isLogin) {
      socket.emit("login", { username: username.trim().toUpperCase(), password });
    } else {
      socket.emit("register", { username: username.trim().toUpperCase(), password });
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-mono z-50 overflow-y-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative">
      <div className="crt-noise" />
      <div className="scanline" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 max-w-md w-full border border-gray-800 flex flex-col items-center gap-6"
      >
        <h2 className="text-2xl font-bold text-center tracking-widest text-blue-500">
          BRO-NET AUTH
        </h2>
        <div className="flex w-full text-xs tracking-widest mb-4">
          <button 
            type="button" 
            onClick={() => setIsLogin(true)} 
            className={`flex-1 p-2 border-b-2 ${isLogin ? 'border-blue-500 text-blue-400' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
          >
            LOGIN
          </button>
          <button 
            type="button" 
            onClick={() => setIsLogin(false)} 
            className={`flex-1 p-2 border-b-2 ${!isLogin ? 'border-blue-500 text-blue-400' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
          >
            REGISTER
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div>
            <label className="text-xs text-gray-500 mb-2 block tracking-widest">USERNAME</label>
            <input
              type="text"
              placeholder="AGENT CODENAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-gray-700 p-4 text-center tracking-[0.5em] focus:outline-none focus:border-blue-500 uppercase"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-2 block tracking-widest">PASSWORD</label>
            <input
              type="password"
              placeholder="SECRET KEY"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-700 p-4 text-center tracking-[1em] focus:outline-none focus:border-blue-500"
            />
          </div>

          <button type="submit" className="w-full bg-blue-900/20 border border-blue-500/50 p-4 hover:bg-blue-800/30 text-blue-500 tracking-widest font-bold transition-all mt-2">
            {isLogin ? "AUTHENTICATE" : "CREATE ACCOUNT"}
          </button>
          
          {error && <div className="text-red-500 text-xs animate-pulse text-center mt-2 border border-red-900 bg-red-950/20 p-2">{error}</div>}
        </form>
      </motion.div>
      </div>
    </div>
  );
}
