# Remaining vs reference (v1.3.4)

Focus: 待选再收紧、发射数字不被白球挡、坦克更圆墩、数字更粗圆。Read firing `side_sphere_cage` / `side_watermelon` / `game_*` vs f_0001 / detail_27s.

## This bump
1. **待选收紧** — `invRowGap` −36 (−40 on 3×3), `invCell` 108, invScale ×1.28 so cubes fill cells; keep `invColGap` gutters.
2. **发射数字可读** — tip 更靠前；数字贴顶面偏后；label `depthTest:false` + 高 renderOrder；出膛 u&lt;0.12 不画大白球（渐显）；muzzle 上前偏移。
3. **坦克圆墩** — SH 近正方加高；hull 大圆角 0.52；更低 roughness 高光；仍单 tip + 凹槽平台 + 细绿连线。
4. **数字字体** — 手绘粗圆角数字路径（非系统 Arial），白描边+暗阴影，顶面放置。

## Still short of ad
1. Inventory packing much closer; extreme ad near-overlap can still look slightly looser in some side comps.
2. Tank silhouette rounder but not identical to ad’s softest toy blobs.
3. Hand = toolkit finger (required), not cartoon glove.
4. Prior sphere/trail/melon leftovers unchanged.
