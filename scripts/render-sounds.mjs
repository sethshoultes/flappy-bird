#!/usr/bin/env node
// Generates the game's three sound effects with ElevenLabs sound effects and writes them to sounds/.
// These replace the earlier *-101soundboards.mp3 clips, whose source and licence were never recorded:
// every sound in this repo is now ours, made from the prompts below.
//
//   set -a; . ~/.config/dev-secrets/secrets.env; set +a; node scripts/render-sounds.mjs
//
// Needs ELEVENLABS_API_KEY from the canonical secrets file; it goes only in a request header and is never printed.
// A clip that already exists is kept, so re-running costs nothing; delete one to re-render it, or change its prompt.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('../sounds/', import.meta.url));
const FORMAT = 'mp3_44100_64';

const SOUNDS = {
  'flap.mp3': { seconds: 0.6, text: 'a single short soft flap of a small cartoon bird wing, a quick light whoosh, clean, no music' },
  'point.mp3': { seconds: 0.6, text: 'a short bright cheerful game score blip, one clean rising ping, retro arcade, no music' },
  'die.mp3': { seconds: 1.2, text: 'a short cartoon bonk of a small bird hitting a pipe, then a quick sad falling tone, game over, no music' },
};

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set; source ~/.config/dev-secrets/secrets.env first');

mkdirSync(OUT_DIR, { recursive: true });
let rendered = 0;
for (const [name, { seconds, text }] of Object.entries(SOUNDS)) {
  const path = OUT_DIR + name;
  if (existsSync(path) && statSync(path).size > 0) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/sound-generation?output_format=${FORMAT}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.5 }),
  });
  if (!res.ok) throw new Error(`ElevenLabs refused ${name}: HTTP ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length === 0) throw new Error(`ElevenLabs returned an empty clip for ${name}`);
  writeFileSync(path, audio);
  rendered++;
}
console.log(`sounds: ${Object.keys(SOUNDS).length} clips, ${rendered} rendered`);
