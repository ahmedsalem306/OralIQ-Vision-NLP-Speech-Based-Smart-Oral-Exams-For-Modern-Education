import React, { useEffect, useRef, useState } from 'react';

/**
 * AvatarCanvas
 * -----------------
 * Renders a placeholder canvas for the AI avatar. In a real implementation this could
 * be a Three.js / React‑Three‑Fiber scene loading a GLTF avatar. For now we mock the
 * visual using CSS animations to demonstrate idle, speaking and blinking states.
 */
const AvatarCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [speaking, setSpeaking] = useState(false);

  // Mock speaking toggle every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => setSpeaking((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={canvasRef} className="relative w-full h-full flex items-center justify-center">
      {/* Avatar background */}
      <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 rounded-full shadow-2xl animate-pulse" />

      {/* Idle / Speaking overlay */}
      <div
        className={`absolute inset-0 rounded-full ${speaking ? 'bg-white/30' : 'bg-white/10'} transition-opacity duration-500`}
      />

      {/* Blinking effect – simple sinus animation */}
      <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 animate-blink" />
    </div>
  );
};

export default AvatarCanvas;
