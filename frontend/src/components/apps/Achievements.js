import Window from "../Window";
import { Trophy, Check, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSocket } from "../SocketProvider";
import toast from "react-hot-toast";
import ConfirmModal from "../ConfirmModal";

export default function Achievements({ onClose, identity }) {
  const { socket } = useSocket();

  const [achievements, setAchievements] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewAchievement = (data) => {
      setAchievements(prev => {
        return prev.map(ach => 
          ach.id === data.id ? { ...ach, unlocked: data.unlocked, unlockedBy: data.unlockedBy } : ach
        );
      });
    };

    const handleNewAchievementCreated = (data) => {
      setAchievements(prev => {
        if (prev.find(a => a.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    const handleAchievementsList = (dbList) => {
      setAchievements(prev => {
        let merged = [...prev];
        dbList.forEach(dbAch => {
          const idx = merged.findIndex(a => a.id === dbAch.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...dbAch };
          } else {
            merged.push(dbAch);
          }
        });
        // Filter out any duplicates entirely to guarantee React keys are unique
        return merged.filter((a, i, self) => self.findIndex(t => t.id === a.id) === i);
      });
    };

    const handleAchievementDeleted = (id) => {
      setAchievements(prev => prev.filter(a => a.id !== id));
    };

    socket.on("newAchievement", handleNewAchievement);
    socket.on("newAchievementCreated", handleNewAchievementCreated);
    socket.on("achievementsList", handleAchievementsList);
    socket.on("achievementDeleted", handleAchievementDeleted);
    
    socket.emit("getAchievements");

    return () => {
      socket.off("newAchievement", handleNewAchievement);
      socket.off("newAchievementCreated", handleNewAchievementCreated);
      socket.off("achievementsList", handleAchievementsList);
      socket.off("achievementDeleted", handleAchievementDeleted);
    };
  }, [socket]);

  const handleUnlock = (id) => {
    if (!socket) return;
    const ach = achievements.find(a => a.id === id);
    if (ach) {
      let currentUnlockedBy = ach.unlockedBy ? ach.unlockedBy.split(" & ") : [];
      
      // If we are already in the list, remove us
      if (currentUnlockedBy.includes(identity)) {
        currentUnlockedBy = currentUnlockedBy.filter(u => u !== identity);
      } else {
        // Add us to the list
        if (currentUnlockedBy.includes("SYSTEM")) currentUnlockedBy = []; // Override SYSTEM
        currentUnlockedBy.push(identity);
      }

      const newUnlockedState = currentUnlockedBy.length > 0;
      const newUnlockedBy = newUnlockedState ? currentUnlockedBy.join(" & ") : null;
      
      setAchievements(prev => prev.map(a => 
        a.id === id ? { ...a, unlocked: newUnlockedState, unlockedBy: newUnlockedBy } : a
      ));
      socket.emit("unlockAchievement", { id, unlocked: newUnlockedState, unlockedBy: newUnlockedBy });
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;

    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error("TITLE AND DESCRIPTION ARE REQUIRED");
      return;
    }
    
    const newAch = {
      id: "CUSTOM_" + Date.now(),
      title: newTitle.trim().toUpperCase(),
      desc: newDesc.trim(),
      unlocked: false,
      unlockedBy: null
    };

    socket.emit("createAchievement", newAch);
    setAchievements(prev => [...prev, newAch]);
    
    setNewTitle("");
    setNewDesc("");
    setIsCreating(false);
    toast.success("ACHIEVEMENT CREATED");
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Window title="ACHIEVEMENTS.exe" onClose={onClose} icon={Trophy}>
      <div className="flex flex-col h-full font-mono">
        <div className="flex justify-between items-end border-b border-yellow-900/50 pb-2 mb-2">
          <h2 className="text-yellow-500 font-bold tracking-widest text-lg">TROPHY ROOM</h2>
          <span className="text-yellow-600 text-xs">UNLOCKED: {unlockedCount}/{achievements.length}</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-2 mb-4">
          {achievements.map((ach, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={ach.id} 
              onClick={() => handleUnlock(ach.id)}
              className={`relative p-3 border flex items-start gap-4 transition-colors ${
                ach.unlocked ? 'border-yellow-500/50 bg-yellow-950/20' : 'border-gray-800 bg-black/40 opacity-50 cursor-pointer hover:border-gray-500 hover:opacity-100'
              }`}
            >
              <div className="mt-1">
                {ach.unlocked ? <Trophy className="text-yellow-500" size={20} /> : <Trophy className="text-gray-600" size={20} />}
              </div>
              <div className="flex-1 pr-6">
                <div className={`font-bold text-sm ${ach.unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>{ach.title}</div>
                <div className="text-xs text-gray-400 mt-1">{ach.desc}</div>
                {ach.unlocked && <div className="text-[10px] text-yellow-600 mt-2 flex items-center gap-1"><Check size={12}/> Unlocked by: {ach.unlockedBy}</div>}
              </div>
              <button 
                onClick={(e) => handleDelete(e, ach.id)}
                className="absolute top-3 right-3 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        {isCreating ? (
          <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 p-4 space-y-3">
            <h3 className="text-yellow-500 text-xs tracking-widest">CREATE CUSTOM ACHIEVEMENT</h3>
            <input 
              type="text" 
              placeholder="ACHIEVEMENT TITLE" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full bg-black border border-gray-700 p-2 text-xs text-white focus:border-yellow-500 outline-none"
            />
            <input 
              type="text" 
              placeholder="Description (How to unlock)" 
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-black border border-gray-700 p-2 text-xs text-white focus:border-yellow-500 outline-none"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-black border border-gray-700 text-gray-400 p-2 text-xs">CANCEL</button>
              <button type="submit" className="flex-1 bg-yellow-950 border border-yellow-900 text-yellow-500 p-2 text-xs hover:bg-yellow-900 transition-colors">CREATE</button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full bg-black border border-dashed border-gray-700 text-gray-500 hover:border-yellow-500 hover:text-yellow-500 transition-colors p-3 text-xs flex justify-center items-center gap-2"
          >
            <Plus size={14} /> ADD CUSTOM ACHIEVEMENT
          </button>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (socket && deleteConfirmId) {
            socket.emit("deleteAchievement", deleteConfirmId);
            setAchievements(prev => prev.filter(a => a.id !== deleteConfirmId));
          }
        }}
        title="DELETE ACHIEVEMENT"
        message="Are you sure you want to delete this custom achievement? It will be removed for everyone."
      />

    </Window>
  );
}
