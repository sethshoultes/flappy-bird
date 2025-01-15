import React from 'react';
import { Trophy } from 'lucide-react';
import type { Database } from '../lib/database.types';

type HighScore = Database['public']['Tables']['high_scores']['Row'];

interface LeaderboardProps {
  scores: HighScore[];
  isLoading: boolean;
}

export function Leaderboard({ scores, isLoading }: LeaderboardProps) {
  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p className="text-white">Loading high scores...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">Top Scores</h2>
      </div>
      <div className="space-y-2">
        {scores.map((score, index) => (
          <div
            key={score.id}
            className="flex items-center justify-between p-2 rounded bg-white/50"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-600">#{index + 1}</span>
              <span className="font-medium">{score.username}</span>
            </div>
            <span className="font-bold text-blue-600">{score.score}</span>
          </div>
        ))}
        {scores.length === 0 && (
          <p className="text-center text-gray-500">No high scores yet!</p>
        )}
      </div>
    </div>
  );
}