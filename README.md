# Acererak

![Acererak](https://raw.githubusercontent.com/username/acererak/main/docs/logo.png)

> Named after the legendary demilich, Acererak is an AI Dungeon Master that weaves intricate tales through an interactive graph-based storytelling system.

## Overview

Acererak transforms the D&D storytelling experience by combining the power of AI with dynamic visual story mapping. Watch your choices branch out before you as you navigate through AI-generated narratives, each decision spawning new paths and possibilities.

## Features

- 🧙‍♂️ AI-powered Dungeon Master using Google's Gemini
- 📊 Dynamic graph visualization of story progression
- 🌳 Branching narrative paths based on player choices
- 🎭 Rich story generation with D&D theming
- 📜 Story summaries and detailed content views
- 🎯 Interactive node-based navigation

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/username/acererak.git
cd acererak
```

2. Install dependencies:

```bash
npm install
```

3. Configure your AI:
   Create a `.env` file in the root directory:

```env
VITE_GEMINI_KEY=your_gemini_api_key
```

4. Start your adventure:

```bash
npm run dev
```

## Project Architecture

- `/src`
  - `/components` - React components including the story graph
  - `/contexts` - Game state and narrative progression
  - `/services` - AI integration and story generation
  - `/types` - TypeScript definitions

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Roadmap

- 🗡️ Combat system integration
- 📝 Character creation and progression
- 🎲 Skill checks and saving throws
- 💾 Save/load functionality
- 🌐 Campaign sharing
- 🎮 Enhanced graph interactions

## Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features
- 🛠️ Submit pull requests

## License

MIT © [Your Name]

---

_"Life is short. Undeath is eternal." - Acererak_
