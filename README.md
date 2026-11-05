# Flappy Bird Game

A modern implementation of the classic Flappy Bird game built with React, TypeScript, and Tailwind CSS. This version features a beautiful UI, sound effects, high scores, and a leaderboard on the shared Arcade service (arcade.adventurebuildr.com).


## Features

- 🎮 Smooth, responsive gameplay
- 🎨 Beautiful, modern UI with animations
- 🏆 Global leaderboard system
- 🔊 Sound effects with toggle option
- 💾 Local high score persistence
- 📱 Fully responsive design
- ⌨️ Keyboard and mouse/touch controls

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flappy-bird
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## How to Play

- Click or press the Spacebar to make the bird flap its wings and fly upward
- Navigate through the pipes without hitting them
- Each pipe you pass increases your score
- Try to beat the high score and get on the leaderboard!

## Game Controls

- **Spacebar / Click**: Make the bird flap
- **Sound Icon**: Toggle sound effects
- **Play Again**: Restart the game after game over

## Technical Details

### Built With

- React 18
- TypeScript
- Tailwind CSS
- Vite (Build Tool)

### Game Physics

The game uses custom physics calculations for:
- Gravity effects
- Jump mechanics
- Collision detection
- Smooth animations

### Architecture

- **Components**: Modular React components for game elements
- **State Management**: React hooks for game state
- **Leaderboard**: the Arcade service, one board (`pipes`), through `src/arcade.ts`; the old Supabase backend was removed
- **Animations**: CSS animations for smooth visual effects
- **Sound System**: Browser Audio API for sound effects

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original Flappy Bird game by Dong Nguyen
- Built with ❤️ using StackBlitz