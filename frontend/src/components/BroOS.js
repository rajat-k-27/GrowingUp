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
      const savedToken = localStorage.getItem("bro_token");
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setShowLanding(false); // Skip landing if already logged in
        connect(savedToken); // Connect to websocket with secure token
      }
    } catch(e) {}
  }, [connect]);

  const handleLogin = (data) => {
    localStorage.setItem("bro_user", JSON.stringify(data.user));
    localStorage.setItem("bro_token", data.token);
    setUser(data.user);
    connect(data.token); // Establish websocket connection!
  };

  const handleLogout = () => {
    localStorage.removeItem("bro_user");
    localStorage.removeItem("bro_token");
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
