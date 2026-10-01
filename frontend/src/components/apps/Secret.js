"use client";

import Window from "../Window";
import { Lock, Unlock, Eye, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../SocketProvider";
import toast from "react-hot-toast";

export default function Secret({ onClose, identity }) {
  const { socket } = useSocket();

  const [password, setPassword] = useState("");
  const [currentPin, setCurrentPin] = useState(null);
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  
  const [secrets, setSecrets] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handleNewSecret = (msg) => {
      // Only show if the message has the same PIN we unlocked with
      if (currentPin && msg.pin === currentPin) {
        setSecrets(prev => [...prev, msg]);
      }
    };
    const handleSecretHistory = (data) => {
      if (data.pin === currentPin) {
        setSecrets(data.history);
      }
    };
    
    socket.on("newSecretMessage", handleNewSecret);
    socket.on("secretHistory", handleSecretHistory);
    
    if (unlocked && currentPin) {
      socket.emit("getSecretHistory", currentPin);
    }

    return () => {
      socket.off("newSecretMessage", handleNewSecret);
      socket.off("secretHistory", handleSecretHistory);
    };
  }, [socket, unlocked, currentPin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [secrets, unlocked]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.trim() !== "") {
      setCurrentPin(password.trim());
      setUnlocked(true);
      toast.success("ACCESS GRANTED");
    } else {
      setError(true);
      toast.error("PIN CANNOT BE EMPTY");
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleSendSecret = (e) => {
    e.preventDefault();
    if (!socket || !currentPin) return;
    if (!input.trim()) {
      toast.error("CANNOT SEND EMPTY MESSAGE");
      return;
    }
    const newSecret = { id: Date.now(), sender: identity, text: input, timestamp: new Date().toLocaleTimeString(), pin: currentPin };
    socket.emit("secretMessage", newSecret);
    setInput("");
  };

  if (unlocked) {
    return (
      <Window title="SECRET.exe - UNLOCKED" onClose={onClose} icon={Unlock} width="max-w-2xl">
        <div className="flex flex-col h-full font-mono">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-red-950/20 text-red-500">
            <span className="font-bold tracking-widest text-xs">CLASSIFIED COMM CHANNEL [ {currentPin} ]</span>
            <Eye size={16} />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {secrets.length === 0 && <div className="text-gray-600 text-center text-xs mt-10">No secrets found for this PIN. Drop one below.</div>}
            {secrets.map((sec, idx) => (
              <div key={sec._id || sec.id || idx} className="p-4 bg-black/60 border border-gray-800">
                <div className="text-[10px] text-gray-500 mb-2 flex justify-between">
                  <span>AGENT: {sec.sender}</span>
                  <span>{sec.timestamp}</span>
                </div>
                <div className="text-gray-300 font-serif italic text-lg leading-relaxed">
                  "{sec.text}"
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSendSecret} className="p-4 bg-gray-900 border-t border-gray-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Encrypt a new secret..."
              className="flex-1 bg-black border border-gray-800 px-4 py-3 text-sm focus:outline-none focus:border-red-900 text-gray-300"
            />
            <button type="submit" className="bg-red-950 border border-red-900 hover:bg-red-900 text-red-500 px-6 py-2 flex items-center justify-center transition-colors">
              <Send size={16} />
            </button>
          </form>
        </div>
      </Window>
    );
  }

  return (
    <Window title="SECRET.exe" onClose={onClose} icon={Lock} width="max-w-md">
      <div className="flex flex-col items-center justify-center p-8 gap-6 font-mono text-center">
        <Lock size={48} className={error ? "text-red-500" : "text-gray-600"} />
        
        <div>
          <h2 className="text-gray-400 tracking-widest font-bold mb-2">CLASSIFIED FILES</h2>
          <p className="text-xs text-gray-600">Create or enter an access PIN.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ENTER PIN"
            className="w-full bg-black border border-gray-800 text-center text-white p-3 focus:outline-none focus:border-gray-500 tracking-[1em]"
          />
          <button type="submit" className="bg-gray-900 border border-gray-800 text-gray-400 p-2 hover:bg-gray-800 transition-colors text-sm tracking-widest">
            AUTHENTICATE
          </button>
        </form>

        {error && <span className="text-red-500 text-xs animate-pulse">ACCESS DENIED. SKILL ISSUE.</span>}
      </div>
    </Window>
  );
}
