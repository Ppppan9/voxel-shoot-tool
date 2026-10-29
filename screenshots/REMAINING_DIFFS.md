# Side-by-side vs reference — remaining differences (honest)

Screenshots: `side_*.png` (left = REF frame, right = GAME).

## Matched well
- Dark navy vertical layout; top title 「这游戏太上头了」
- 5 recessed slots + toy rounded cannons with white ammo numbers
- Bottom inventory grid of numbered colored cubes
- White spherical projectiles + colored voxel debris
- Target shapes for sphere_cage / diamond_cage / cat / house / icecream / watermelon
- Color-matched firing preference

## Remaining differences
1. **Cannon silhouette**: ad tanks are slightly chunkier / more “vehicle-like”; ours are rounded cubes + stub barrel (close, not pixel-identical).
2. **White cage ribs**: ad sphere/diamond cages have cleaner latitude/longitude ribs; ours are procedural lattice — density/pattern differ.
3. **Voxel art fidelity**: cat / house / icecream / watermelon are recognizable but not mesh-traced from the ad; proportions and color block placement are approximate.
4. **Inventory layout**: ad sometimes shows irregular/partial grids mid-montage; we use packed 3×3–4×4 from ammo plan.
5. **Hand**: default mahjong finger (preset) vs ad’s white-glove cartoon hand; upload override available.
6. **Lighting / materials**: soft plastic look is similar; specular highlights and AO are simpler than the ad render.
7. **Montage timing / exact tap order**: auto-solve uses greedy “most exposed color” rather than frame-perfect ad tap sequence.
8. **No full ad voiceover** shipped (by design); SFX are synthesized.
