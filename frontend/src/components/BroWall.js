"use client";

import { useEffect, useState } from "react";
import { useSocket } from "./SocketProvider";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import AudioPlayer from "./AudioPlayer";

export default function BroWall({ identity }) {
  const { socket } = useSocket();
  const [activities, setActivities] = useState([
    { id: 1, text: "System initialized.", time: new Date().toLocaleTimeString(), sender: "SYSTEM", type: "system" }
  ]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit("getActivityHistory");

    socket.on("activityHistory", (history) => {
      // Map DB schema to component state
      const mapped = history.map(item => ({
        id: item._id,
        text: item.text,
        time: item.time,
        sender: item.sender,
        type: item.type,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType
      }));
      setActivities([...mapped, { id: "init", text: "System initialized.", time: new Date().toLocaleTimeString(), sender: "SYSTEM", type: "system" }]);
    });

    const addActivity = (text, sender, type, mediaUrl = null, mediaType = null) => {
      setActivities(prev => [{
        id: Date.now(), text, time: new Date().toLocaleTimeString(), sender, type, mediaUrl, mediaType
      }, ...prev].slice(0, 50));
    };

    socket.on("newDrop", (data) => {
      const displayContent = data.content ? `: "${data.content}"` : "";
      addActivity(`Dropped a ${data.type.toLowerCase()}${displayContent}`, data.identity, "drop", data.mediaUrl, data.mediaType);
    });

    socket.on("newPing", (data) => {
      addActivity(`Pinged: "${data.reason}"`, data.identity, "ping");
    });

    socket.on("hereUpdate", (data) => {
      addActivity("I'm Here ❤️", data.identity, "here");
    });

    socket.on("statusUpdate", (data) => {
      addActivity(`Status changed: "${data.status}"`, data.identity, "status");
    });

    return () => {
      socket.off("activityHistory");
      socket.off("newDrop");
      socket.off("newPing");
      socket.off("hereUpdate");
      socket.off("statusUpdate");
    };
  }, [socket]);

  return (
    <>
      <div className="w-full flex-1 glass-panel border border-gray-800 rounded-xl p-4 flex flex-col min-h-0">
        <h3 className="text-xs text-gray-500 font-mono tracking-widest mb-4 border-b border-gray-800 pb-2 flex-shrink-0">BRO WALL_ACTIVITY</h3>
        <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm pr-2 hide-scrollbar">
          <AnimatePresence>
            {activities.map((act) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className="mt-1">
                  {act.sender === "RAJAT" ? "👑" : act.sender === "BRO" ? "🇯🇵" : "⚙️"}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-300 text-xs">{act.sender} <span className="text-gray-600 font-normal">{act.time}</span></span>
                  <span className={`
                    ${act.type === 'ping' ? 'text-red-400' : ''}
                    ${act.type === 'drop' ? 'text-blue-400' : ''}
                    ${act.type === 'here' ? 'text-pink-400' : ''}
                    ${act.type === 'system' ? 'text-green-500' : 'text-gray-400'}
                  `}>
                    {act.text}
                    {act.mediaUrl && (
                      <button 
                        onClick={() => setSelectedMedia({ url: act.mediaUrl, type: act.mediaType })}
                        className="ml-2 text-blue-500 underline hover:text-blue-400 font-bold font-mono text-[10px] tracking-widest"
                      >
                        {act.mediaType === 'image' ? '[VIEW PHOTO]' : '[LISTEN]'}
                      </button>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95"
          >
            <div className="relative max-w-3xl w-full flex flex-col items-center">
              <div className="absolute -top-12 right-0 flex gap-4">
                <a href={selectedMedia.url} download={`bro_os_media_${Date.now()}`} className="text-gray-400 hover:text-blue-500 transition-colors bg-gray-900/50 p-2 rounded-full border border-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </a>
                <button onClick={() => setSelectedMedia(null)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-900/50 p-2 rounded-full border border-gray-700">
                  <X size={24} />
                </button>
              </div>
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} alt="fullscreen" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
              ) : (
                <div className="w-full bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl flex flex-col gap-4">
                  <span className="text-blue-400 font-mono tracking-widest text-sm font-bold">AUDIO DROP</span>
                  <AudioPlayer src={selectedMedia.url} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
