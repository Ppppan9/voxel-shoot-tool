# Remaining vs reference (v1.3.3)

Focus this pass: lower UI — 待选间隔/数字 + 发射区大小样式角度. Read firing `side_sphere_cage` / `side_watermelon` / `game_*` vs f_0001 / detail_27s.

## This bump
1. **待选区域 spacing** — `invColGap` > `invRowGap` (row gap negative for almost-touching columns); 3×3 tighter than 4×4; chunkier `invCell`.
2. **数字样式** — white bold rounded sans on **top face** (not front); soft dark outline + drop shadow; larger digit planes.
3. **发射区** — smaller flatter tanks (`SH` + `slotW/H` + `uiScale`); single recessed dark-blue platform; thin green link line (f_0001); top-face numbers; tip forward so number stays readable; fixed micro-pitch (no yaw twist).

## Still short of ad
1. Inventory column packing closer but can still read slightly looser than f_0001’s near-zero row gaps in some stills.
2. Tank silhouette still a bit more “cube button” than ad’s chunky character-like toys; green line present but subtler than some frames.
3. Digit font depends on system rounded faces (falls back to Arial) — weight/roundness not identical to ad.
4. Hand = toolkit mahjong finger (required), not ad white cartoon glove.
5. Prior sphere/trail/melon leftovers unchanged.
