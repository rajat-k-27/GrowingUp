"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, Trash2, Pencil, Check, X, ShieldAlert, Users, Activity } from "lucide-react";
import Window from "../Window";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../SocketProvider";

export default function SharedBrain({ onClose, identity, roomCreator }) {
  const { socket } = useSocket();
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  
  const [showSettleModal, setShowSettleModal] = useState(false);
  
  const [roomUsers, setRoomUsers] = useState([identity]);
  const [roomMembers, setRoomMembers] = useState([]);
  
  // Empty array means "ALL"
  const [splitWithSelection, setSplitWithSelection] = useState([]); 
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (!socket) return;
    
    const fetchInit = () => {
      socket.emit("getLedgerHistory");
      socket.emit("getRoomUsers");
      socket.emit("getRoomMembers");
    };

    if (socket.connected) fetchInit();
    socket.on("connect", fetchInit);
    
    socket.on("ledgerHistory", (data) => {
      setExpenses(data);
      setIsLoading(false);
    });
    
    socket.on("newExpense", (exp) => {
      setExpenses((prev) => [exp, ...prev]);
    });
    
    socket.on("expenseDeleted", (id) => {
      setExpenses((prev) => prev.filter(e => e._id !== id));
    });
    
    socket.on("expenseUpdated", (updatedExp) => {
      setExpenses((prev) => prev.map(e => e._id === updatedExp._id ? updatedExp : e));
    });

    socket.on("roomUsers", (users) => {
      setRoomUsers(users);
    });

    socket.on("roomMembers", (members) => {
      setRoomMembers(members);
    });

    return () => {
      socket.off("connect", fetchInit);
      socket.off("ledgerHistory");
      socket.off("newExpense");
      socket.off("expenseDeleted");
      socket.off("expenseUpdated");
      socket.off("roomUsers");
      socket.off("roomMembers");
    };
  }, [socket]);

  // Calculations only for UNSETTLED debts
  const involvedExpenses = expenses.filter(exp => {
    if (exp.paidBy === identity) return true;
    if (!exp.splitWith || exp.splitWith.length === 0) return true;
    return exp.splitWith.includes(identity);
  });
  
  const activeExpenses = involvedExpenses.filter(e => !e.settled);
  const historyExpenses = involvedExpenses.filter(e => e.settled);

  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // allKnownUsers includes historical participants, current online participants, and all DB members
  const allKnownUsers = Array.from(new Set([...roomUsers, ...roomMembers, ...expenses.flatMap(e => e.splitWith || []), ...expenses.map(e => e.paidBy), identity]));
  
  const balances = allKnownUsers.map(user => {
    let balance = 0;
    let paid = 0;
    
    activeExpenses.forEach(exp => {
      const splitters = exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : allKnownUsers;
      const share = exp.amount / splitters.length;
      
      if (exp.paidBy === user) {
        balance += exp.amount;
        paid += exp.amount;
        
        // Reduce creator's positive balance for everyone who has already paid
        if (exp.markedPaidBy && exp.markedPaidBy.length > 0) {
          balance -= (share * exp.markedPaidBy.length);
        }
      }
      
      if (splitters.includes(user)) {
        balance -= share;
        
        // If user paid their share, cancel out this debt
        if (exp.markedPaidBy && exp.markedPaidBy.includes(user)) {
          balance += share;
        }
      }
    });
    
    return { name: user, paid, balance };
  }).filter(b => b.paid !== 0 || Math.abs(b.balance) > 0.01).sort((a, b) => b.balance - a.balance);

  const myBalance = balances.find(b => b.name === identity)?.balance || 0;

  // Calculate pairwise net debts specifically for the current user
  const pairwise = {};
  activeExpenses.forEach(exp => {
    const splitters = exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : allKnownUsers;
    const share = exp.amount / splitters.length;
    
    splitters.forEach(splitter => {
      if (splitter === exp.paidBy) return;
      if (exp.markedPaidBy && exp.markedPaidBy.includes(splitter)) return;
      
      if (!pairwise[splitter]) pairwise[splitter] = {};
      pairwise[splitter][exp.paidBy] = (pairwise[splitter][exp.paidBy] || 0) + share;
    });
  });

  const myDebts = [];
  const myCredits = [];
  
  allKnownUsers.forEach(otherUser => {
    if (otherUser === identity) return;
    const iOweThem = (pairwise[identity] && pairwise[identity][otherUser]) || 0;
    const theyOweMe = (pairwise[otherUser] && pairwise[otherUser][identity]) || 0;
    
    const net = theyOweMe - iOweThem;
    if (net > 0.01) myCredits.push({ name: otherUser, amount: net });
    else if (net < -0.01) myDebts.push({ name: otherUser, amount: Math.abs(net) });
  });

  const toggleSplitUser = (user) => {
    let current = splitWithSelection.length === 0 ? [...allKnownUsers] : [...splitWithSelection];
    
    if (current.includes(user)) {
      if (current.length === 1) return; // Prevent unchecking everyone
      current = current.filter(u => u !== user);
    } else {
      current.push(user);
    }
    
    if (current.length === allKnownUsers.length) {
      setSplitWithSelection([]); // ALL
    } else {
      setSplitWithSelection(current);
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount)) return;
    
    const expData = { 
      title: title.trim(), 
      amount: parseFloat(amount), 
      paidBy: identity,
      splitWith: splitWithSelection
    };
    
    socket.emit("createExpense", expData);
    setTitle("");
    setAmount("");
    setSplitWithSelection([]);
  };

  const handleSettle = () => {
    socket.emit("settleDebts");
    setShowSettleModal(false);
  };

  const startEditing = (exp) => {
    setEditingId(exp._id);
    setEditTitle(exp.title);
    setEditAmount(exp.amount);
  };

  const saveEdit = (id) => {
    socket.emit("editExpense", { id, title: editTitle, amount: parseFloat(editAmount) });
    setEditingId(null);
  };

  const handleDelete = (id) => {
    socket.emit("deleteExpense", id);
  };

  const handleSettleExpense = (id) => {
    socket.emit("settleExpense", id);
  };

  return (
    <Window title="LEDGER.exe" onClose={onClose} icon={Wallet}>
      <div className="flex flex-col h-full bg-[#050508] p-4 font-mono overflow-y-auto hide-scrollbar relative">
        
        {/* Settlement Modal */}
        {showSettleModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-red-950/40 border border-red-500/50 p-6 rounded-3xl w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
              <h2 className="text-xl font-black text-red-400 mb-2 tracking-[0.2em]">SETTLE MY DEBTS?</h2>
              <p className="text-xs text-red-200/60 mb-8 font-sans">This will mark all active debts created by YOU as SETTLED and archive them. Ensure real-world transactions are complete.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowSettleModal(false)} className="flex-1 p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-white font-bold tracking-widest text-sm">CANCEL</button>
                <button onClick={handleSettle} className="flex-1 p-3 bg-red-600 hover:bg-red-500 transition-colors rounded-xl text-white font-black tracking-widest text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)]">CONFIRM</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Split Selection Modal */}
        {showSplitModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm bg-[#0a0a0f] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 text-blue-400">
                  <Users size={18} />
                  <span className="font-bold tracking-widest text-sm">SELECT MEMBERS</span>
                </div>
                <button type="button" onClick={() => setShowSplitModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                <div className="text-xs text-gray-500 tracking-widest border-b border-gray-800 pb-2 flex justify-between items-center">
                  <span>SPLIT GROUP</span>
                  <button onClick={() => setSplitWithSelection([])} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md hover:bg-blue-500/30 transition-colors text-[10px] font-bold tracking-widest">
                    SELECT ALL
                  </button>
                </div>
                
                <div className="space-y-2">
                  {allKnownUsers.map(user => {
                    const isSelected = splitWithSelection.length === 0 || splitWithSelection.includes(user);
                    const isOnline = roomUsers.includes(user);
                    const isMe = user === identity;
                    
                    return (
                       <div key={user} onClick={() => toggleSplitUser(user)} className={`flex items-center justify-between bg-black border p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-800/50 opacity-60'}`}>
                         <div className="flex items-center gap-3">
                            {isOnline ? (
                               <div className={`w-2.5 h-2.5 rounded-full ${isMe ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'} animate-pulse`}></div>
                            ) : (
                               <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                            )}
                            <span className={`font-bold ${isOnline ? 'text-gray-200' : 'text-gray-400'}`}>{user}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            {isMe && <span className="text-[10px] text-green-600 font-bold bg-green-950/30 px-2 py-1 rounded">YOU</span>}
                            {!isOnline && <span className="text-[10px] text-gray-500 font-bold border border-gray-800 px-2 py-1 rounded">INACTIVE</span>}
                            
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ml-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-black/50'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                            </div>
                         </div>
                       </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* The DEBT SCALE */}
        <div className="bg-black border border-white/10 p-5 rounded-3xl relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-6 shrink-0">
          <h3 className="text-center text-[10px] text-gray-500 tracking-[0.3em] font-bold mb-5 flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-gray-700" /> THE DEBT SCALE <div className="h-[1px] w-8 bg-gray-700" />
          </h3>
          
          <div className="space-y-4">
            {balances.length === 0 ? (
              <div className="text-center text-[10px] text-gray-600 tracking-widest py-2">NO ACTIVE BALANCES</div>
            ) : balances.map((b, i) => {
               const width = (b.paid / (totalSpent || 1)) * 100;
               return (
                 <div key={i} className="relative group">
                   <div className="flex justify-between text-[10px] mb-1.5 font-bold tracking-widest">
                     <span className={b.name === identity ? "text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" : "text-gray-300"}>
                       {b.name} {b.name === identity && "(YOU)"}
                     </span>
                     <span className={b.balance > 0 ? "text-green-400" : b.balance < 0 ? "text-red-400" : "text-gray-500"}>
                       {b.balance > 0 ? `OWED ₹${b.balance.toFixed(0)}` : b.balance < 0 ? `OWES ₹${Math.abs(b.balance).toFixed(0)}` : "SETTLED"}
                     </span>
                   </div>
                   <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{width: 0}} 
                       animate={{width: `${width}%`}} 
                       transition={{type: "spring", damping: 20}}
                       className={`h-full rounded-full ${b.name === identity ? "bg-blue-500 shadow-[0_0_10px_#3b82f6]" : "bg-white"}`} 
                     />
                   </div>
                 </div>
               )
            })}
          </div>
          
          <div className="flex justify-between mt-6 pt-4 border-t border-white/5 mb-4">
            <div className="text-left">
              <p className="text-[9px] text-gray-500 tracking-wider">TOTAL ACTIVE</p>
              <p className="text-2xl font-black text-white tracking-widest">₹{totalSpent.toFixed(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 tracking-wider">YOUR STATUS</p>
              <p className={`text-2xl font-black tracking-widest ${myBalance > 0 ? 'text-green-400' : myBalance < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {myBalance > 0 ? `+ ₹${myBalance.toFixed(0)}` : myBalance < 0 ? `- ₹${Math.abs(myBalance).toFixed(0)}` : 'EQUAL'}
              </p>
            </div>
          </div>
          
          {(myDebts.length > 0 || myCredits.length > 0) && (
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <p className="text-[9px] text-gray-500 tracking-[0.2em] font-bold text-center mb-1">INDIVIDUAL BREAKDOWN</p>
              {myDebts.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                  <span className="text-gray-400">YOU OWE <strong className="text-white tracking-wider">{d.name}</strong></span>
                  <span className="text-red-400 font-black tracking-widest">₹{d.amount.toFixed(0)}</span>
                </div>
              ))}
              {myCredits.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] bg-green-500/10 p-2.5 rounded-xl border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.05)]">
                  <span className="text-gray-400"><strong className="text-white tracking-wider">{c.name}</strong> OWES YOU</span>
                  <span className="text-green-400 font-black tracking-widest">₹{c.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          
          {activeExpenses.some(e => e.paidBy === identity) && (
            <button 
              onClick={() => setShowSettleModal(true)}
              className="mt-5 w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 py-3.5 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            >
              SETTLE MY DEBTS
            </button>
          )}
        </div>

        {/* Add Form (Mobile Optimized) */}
        <form onSubmit={handleAddExpense} className="flex flex-col gap-3 mb-6 shrink-0 relative z-10 bg-black/30 p-4 rounded-3xl border border-white/5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="What did we buy?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 text-white transition-all shadow-inner"
            />
            <div className="relative w-full sm:w-36 shrink-0">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
              <input
                type="number"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 text-white transition-all shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-bold tracking-widest hidden sm:inline">SPLIT:</span>
              <button 
                type="button" 
                onClick={() => setShowSplitModal(true)}
                className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 truncate max-w-[200px]"
              >
                {splitWithSelection.length === 0 ? "ALL MEMBERS" : splitWithSelection.length === 1 ? splitWithSelection[0] : `${splitWithSelection.length} MEMBERS`}
              </button>
            </div>
            
            <button type="submit" disabled={!title || !amount} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-6 py-2 rounded-xl disabled:opacity-30 transition-all hover:bg-blue-500/30 active:scale-95 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Plus size={18} />
            </button>
          </div>
        </form>

        {/* Active Ledger List */}
        <div className="flex-1 shrink-0 mb-6">
          <h3 className="text-[10px] text-gray-500 tracking-[0.2em] font-bold mb-3 pl-1">ACTIVE DEBTS</h3>
          <AnimatePresence>
            {activeExpenses.map(exp => (
              <motion.div key={exp._id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.9}} className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-2 group hover:bg-white/10 transition-colors">
                {editingId === exp._id ? (
                  <div className="flex gap-2 items-center">
                    <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="flex-1 bg-black border border-blue-500/50 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input type="number" value={editAmount} onChange={e=>setEditAmount(e.target.value)} className="w-full bg-black border border-blue-500/50 rounded-xl pl-6 pr-2 py-2 text-xs text-white outline-none" />
                    </div>
                    <button onClick={()=>saveEdit(exp._id)} className="text-green-400 p-2 bg-green-400/10 rounded-xl"><Check size={14}/></button>
                    <button onClick={()=>setEditingId(null)} className="text-gray-400 p-2 bg-white/5 rounded-xl"><X size={14}/></button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white tracking-wide truncate">{exp.title}</p>
                      <p className="text-[9px] text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                        <span>Paid by <span className={exp.paidBy===identity?"text-blue-400 font-bold":"text-white font-bold"}>{exp.paidBy}</span></span> 
                        <span className="hidden sm:inline mx-1">•</span> 
                        <span className="truncate">Split: <span className="text-purple-400">{exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith.join(", ") : "ALL"}</span></span>
                      </p>
                      {exp.markedPaidBy && exp.markedPaidBy.length > 0 && (
                        <p className="text-[9px] text-green-400 mt-1 font-bold tracking-widest">
                          Paid by: {exp.markedPaidBy.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 mt-2 sm:mt-0">
                      <span className="font-black text-white tracking-widest text-lg shrink-0">₹{exp.amount}</span>
                      {exp.paidBy === identity && (
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>startEditing(exp)} className="text-gray-400 hover:text-blue-400 bg-black/40 hover:bg-blue-500/10 p-2 rounded-lg transition-colors" title="Edit"><Pencil size={14}/></button>
                          <button onClick={()=>handleDelete(exp._id)} className="text-gray-400 hover:text-red-400 bg-black/40 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Delete"><Trash2 size={14}/></button>
                        </div>
                      )}
                      {exp.paidBy !== identity && (
                        <div className="flex ml-2">
                          {exp.markedPaidBy && exp.markedPaidBy.includes(identity) ? (
                            <span className="text-[10px] bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/30 font-black tracking-widest flex items-center gap-1">
                              <Check size={12}/> PAID
                            </span>
                          ) : (
                            <button 
                              onClick={() => socket.emit("markExpensePaid", exp._id)} 
                              className="text-[10px] bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/50 px-4 py-1.5 rounded-lg transition-all font-black tracking-widest shadow-[0_0_15px_rgba(74,222,128,0.3)] active:scale-95"
                            >
                              I PAID
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {activeExpenses.length === 0 && !isLoading && (
            <div className="text-center text-gray-600 text-[10px] tracking-widest py-8 border border-dashed border-white/10 rounded-2xl mt-2">NO ACTIVE DEBTS</div>
          )}
        </div>
        
        {/* History List */}
        {historyExpenses.length > 0 && (
          <div className="flex-1 shrink-0 mt-4">
            <button 
              onClick={() => setShowArchive(!showArchive)}
              className="w-full text-left text-[10px] text-gray-500 hover:text-gray-300 tracking-[0.2em] font-bold mb-3 pl-1 flex justify-between items-center"
            >
              <span>SETTLED ARCHIVE ({historyExpenses.length})</span>
              <span>{showArchive ? 'HIDE' : 'SHOW'}</span>
            </button>
            {showArchive && historyExpenses.map(exp => (
              <div key={exp._id} className="bg-black/30 border border-white/5 rounded-xl p-3 mb-2 opacity-50 flex justify-between items-center hover:opacity-100 transition-opacity">
                <div>
                  <p className="text-xs font-bold text-gray-400 line-through tracking-wider">{exp.title}</p>
                  <p className="text-[9px] text-gray-600">{exp.paidBy}</p>
                </div>
                <span className="text-xs font-black text-gray-500">₹{exp.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Window>
  );
}
