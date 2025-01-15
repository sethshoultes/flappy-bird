import React from 'react';

interface PipeProps {
  position: number;
  height: number;
  isTop: boolean;
}

export function Pipe({ position, height, isTop }: PipeProps) {
  return (
    <div
      className={`absolute w-20 bg-green-500 border-4 border-green-700 ${
        isTop ? 'top-0' : 'bottom-0'
      }`}
      style={{
        left: `${position}px`,
        height: `${height}px`,
      }}
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-24 h-8 bg-green-500 border-4 border-green-700 ${
          isTop ? 'bottom-0' : 'top-0'
        }`}
      />
    </div>
  );
}