# Assets

## Visual
- Default finger: copied from mahjong / pin-rescue / arrow-escape (`src/default_hand.js`), anchor **0.2204 / 0.0367**.
- Voxel targets, cannons, inventory blocks, balls, debris: procedural three.js (RoundedBox / Sphere). No third-party art packs.
- Reference ad frames: `ref/frames/` (for QA screenshots only; not shipped in the playable bundle).

## Audio
- All SFX are **synthesized** in `src/audio.js` (WebAudio oscillators + noise): pop, shoot, hit, whoosh, chime, error.
- Reference `ref/ref.mp4` contains voiceover / music; **not** extracted as default-on BGM (ad voiceover must not ship as default).
- No short BG snippets were extracted — none were clearly isolated SFX without voiceover bleed.

## Levels
Preset shapes matched from the ad montage: sphere_cage, diamond_cage, cat, house, icecream, watermelon.
