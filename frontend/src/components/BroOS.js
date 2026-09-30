"use client";

import { useState, useEffect } from "react";
import Desktop from "./Desktop";
import IdentitySelector from "./IdentitySelector";
import Dashboard from "./Dashboard";

import Landing from "./Landing";

import { useSocket } from "./SocketProvider";

export default function BroOS() {
  const [user, setUser] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const { connect, disconnect } = useSocket();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("bro_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setShowLanding(false); // Skip landing if already logged in
        connect(); // Connect to websocket since user is authenticated
      }
    } catch(e) {}
  }, [connect]);

  const handleLogin = (userData) => {
    localStorage.setItem("bro_user", JSON.stringify(userData));
    setUser(userData);
    connect(); // Establish websocket connection!
  };

  const handleLogout = () => {
    localStorage.removeItem("bro_user");
    setUser(null);
    setActiveRoomCode(null);
    setShowLanding(true);
    disconnect(); // Disconnect websocket to save server resources!
  };

  if (!user && showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  if (!user && !showLanding) {
    return <IdentitySelector onLogin={handleLogin} />;
  }

  if (!activeRoomCode) {
    return <Dashboard user={user} onJoinRoom={setActiveRoomCode} onLogout={handleLogout} />;
  }

  return (
    <div className="h-full w-full relative">
      <div className="bg-grid" />
      <div className="crt-noise" />
      <Desktop identity={user.username} roomCode={activeRoomCode} onExitRoom={() => setActiveRoomCode(null)} />
    </div>
  );
}
