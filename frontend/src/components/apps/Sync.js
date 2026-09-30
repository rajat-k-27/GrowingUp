"use client";

import { useState, useEffect, useRef } from "react";
import Window from "../Window";
import { PlayCircle, Link as LinkIcon, Pause, Play, Volume2 } from "lucide-react";
import { useSocket } from "../SocketProvider";
import ReactPlayer from "react-player";

export default function Sync({ onClose, identity }) {
  const { socket } = useSocket();
  const [url, setUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const lastProgressTime = useRef(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const playerRef = useRef(null);
  const isSeeking = useRef(false);

  // 1. Sync state from server (Listening)
  useEffect(() => {
    if (!socket) return;
    
    const handleSyncState = (data) => {
      if (data.url && data.url !== url) {
        setUrl(data.url);
        setInputUrl(data.url);
        setIsReady(false); // Reset ready state for new video
      }
      
      if (data.playing !== undefined) {
        isPlayingRef.current = data.playing;
        setPlaying(data.playing);
      }
      
      if (data.playedSeconds !== undefined && playerRef.current && isReady) {
        // Only seek if we're out of sync by more than 2 seconds
        try {
          const currentTime = playerRef.current.getCurrentTime() || 0;
          if (Math.abs(currentTime - data.playedSeconds) > 2) {
            isSeeking.current = true; // Mark as programmatic to prevent echo
            playerRef.current.seekTo(data.playedSeconds, "seconds");
            lastProgressTime.current = data.playedSeconds;
            setTimeout(() => { isSeeking.current = false; }, 1000); // Reset after seek finishes
          }
        } catch (e) {
          console.error("Seek error:", e);
        }
      }
    };

    socket.on("sync_state", handleSyncState);
    socket.emit("get_sync_state");
    
    return () => socket.off("sync_state", handleSyncState);
  }, [socket, url, isReady]);

  // 2. Load Video
  const handleLoad = (e) => {
    e.preventDefault();
    if (!inputUrl) return;
    
    // Basic formatting fix for youtu.be to ensure player compatibility
    let finalUrl = inputUrl;
    
    // Convert youtu.be share links to standard youtube.com format
    // This prevents ReactPlayer from failing the regex and defaulting to a native <video> tag (which causes the black screen)
    if (finalUrl.includes('youtu.be/')) {
      try {
        const videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
        finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      } catch(e) {}
    } else if (finalUrl.includes('youtube.com/shorts/')) {
      try {
        const videoId = finalUrl.split('youtube.com/shorts/')[1].split('?')[0];
        finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      } catch(e) {}
    }
    
    setUrl(finalUrl);
    setPlaying(false); // Do not auto-play to respect browser policies
    setIsReady(false);
    
    if (socket) {
      socket.emit("sync_update", { url: finalUrl, playing: false, playedSeconds: 0 });
    }
  };

  // 3. Play / Pause Action
  const handlePlay = () => {
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      setPlaying(true);
      if (socket) {
        socket.emit("sync_update", { url, playing: true, playedSeconds: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  };

  const handlePause = () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setPlaying(false);
      if (socket) {
        socket.emit("sync_update", { url, playing: false, playedSeconds: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  };

  const togglePlay = () => {
    playing ? handlePause() : handlePlay();
  };

  // 4. Seek Action (Dragging Slider)
  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    setPlayedSeconds(time);
    if (playerRef.current && isReady) {
      try {
        playerRef.current.seekTo(time, "seconds");
      } catch(e) {}
    }
  };

  // 5. Seek Action (Finished Dragging Custom Slider)
  const handleSeekMouseUp = (e) => {
    isSeeking.current = false;
    const time = parseFloat(e.target.value);
    if (socket) {
      socket.emit("sync_update", { url, playing, playedSeconds: time });
    }
  };

  // 5.5. Seek Action (Native YouTube Bar)
  const handleNativeSeek = (seconds) => {
    // If the seek was programmatic (from the server), ignore it to prevent echo loops
    if (isSeeking.current) return;
    
    setPlayedSeconds(seconds);
    if (socket) {
      socket.emit("sync_update", { url, playing, playedSeconds: seconds });
    }
  };

  // 6. Player Progress Heartbeat
  const handleProgress = (state) => {
    if (!isSeeking.current) {
      setPlayedSeconds(state.playedSeconds);
      
      // If time jumps by more than 2 seconds, it was a manual native scrub!
      if (Math.abs(state.playedSeconds - lastProgressTime.current) > 2) {
        if (socket) {
          socket.emit("sync_update", { url, playing, playedSeconds: state.playedSeconds });
        }
      }
      
      lastProgressTime.current = state.playedSeconds;
    }
  };

  // 7. Player Ready Hook
  const handleReady = () => {
    setIsReady(true);
    try {
      setDuration(playerRef.current?.getDuration() || 0);
    } catch(e) {}
  };

  return (
    <Window title="SYNC.exe" onClose={onClose} icon={PlayCircle}>
      <div className="flex flex-col h-full font-sans gap-4">
        
        {/* URL Input Bar */}
        <form onSubmit={handleLoad} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <LinkIcon size={16} />
            </div>
            <input 
              type="text" 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube, SoundCloud, or Media URL..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-gray-200 transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={!inputUrl}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold tracking-widest text-sm transition-colors cursor-pointer"
          >
            LOAD
          </button>
        </form>

        {/* Video Player Area */}
        <div className="flex-1 bg-black border border-gray-800 rounded-xl overflow-hidden relative shadow-2xl flex flex-col">
          {url ? (
            <div className="flex-1 w-full h-full relative">
              <ReactPlayer 
                ref={playerRef}
                url={url} 
                playing={playing}
                controls={true}
                width="100%"
                height="100%"
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleNativeSeek}
                onProgress={handleProgress}
                onReady={handleReady}
                config={{
                  youtube: {
                    playerVars: { 
                      disablekb: 1, 
                      modestbranding: 1,
                      rel: 0,
                      showinfo: 0,
                      origin: typeof window !== 'undefined' ? window.location.origin : ''
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4">
              <PlayCircle size={64} className="opacity-20" />
              <p className="font-mono text-sm tracking-widest">NO MEDIA LOADED</p>
            </div>
          )}
          
          {/* Custom Controls (Overlaid) */}
          {url && (
            <div className="bg-gray-900/90 backdrop-blur-md border-t border-gray-800 p-4 flex flex-col gap-3 z-20">
              <input 
                type="range" 
                min={0} 
                max={duration || 100}
                value={playedSeconds}
                onMouseDown={() => isSeeking.current = true}
                onMouseUp={handleSeekMouseUp}
                onChange={handleSeekChange}
                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
                  disabled={!isReady}
                >
                  {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex items-center gap-2 text-gray-400">
                  <Volume2 size={16} />
                  <span className="text-xs font-mono tracking-widest uppercase">
                    {Math.floor(playedSeconds / 60)}:{Math.floor(playedSeconds % 60).toString().padStart(2, '0')} / 
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </Window>
  );
}
