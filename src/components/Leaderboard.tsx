import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { browserEnv, leaderboard, type Board } from '../arcade';

export function Leaderboard() {
  const [board, setBoard] = useState<Board | undefined>();

  useEffect(() => {
    let live = true;
    void leaderboard(browserEnv(), 'pipes', 'all').then((b) => {
      if (live) setBoard(b);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!board) {
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
        {board.ok &&
          board.entries.slice(0, 10).map((e) => (
            <div key={e.rank} className="flex items-center justify-between p-2 rounded bg-white/50">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-600">#{e.rank}</span>
                <span className="font-medium">{e.name}</span>
              </div>
              <span className="font-bold text-blue-600">{e.score}</span>
            </div>
          ))}
        {board.ok && board.entries.length === 0 && <p className="text-center text-gray-500">No scores yet</p>}
        {!board.ok && <p className="text-center text-gray-500">The leaderboard is unavailable right now</p>}
      </div>
    </div>
  );
}
