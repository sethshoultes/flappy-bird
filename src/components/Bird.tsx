import React from 'react';

interface BirdProps {
  position: number;
  rotation: number;
}

export function Bird({ position, rotation }: BirdProps) {
  return (
    <div
      className="absolute w-12 h-12 left-24"
      style={{
        top: `${position}px`,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s ease-in-out',
      }}
    >
      <div className="w-full h-full rounded-full bg-yellow-400 relative">
        {/* Wing */}
        {/* Position the wing with right/top values. Adjust these values to move the wing:
            - Increase 'right' value to move wing left
            - Adjust 'top' value to move wing up/down */}
        <div className="absolute w-8 h-5 bg-yellow-500 rounded-full right-5 top-5 animate-flap">
          <div className="absolute w-6 h-4 bg-yellow-600 rounded-full right-1 top-0.5" />
        </div>
        {/* Eye */}
        <div className="absolute w-4 h-4 bg-white rounded-full right-2 top-2">
          <div className="absolute w-2 h-2 bg-black rounded-full right-0 top-1" />
        </div>
        {/* Beak */}
        <div className="absolute w-2 h-3 bg-orange-500 rounded-sm left-11 top-5 transform rotate-12" />
      </div>
    </div>
  );
}