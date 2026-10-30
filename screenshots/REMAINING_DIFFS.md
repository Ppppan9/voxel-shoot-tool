# Remaining vs reference (v1.3.8)

Focus of this bump: **发射区模型变形** + **待选区前后遮挡**.

## Done in 1.3.8
1. **Tanks** — rebuilt multi-hump chibi (dual green ear bumps + belly/cap parts, eyes, no white antenna stem). SH aspect ~0.71 (was ~1.45 flat). Tighter slot packing. Thicker front-face digits. Lower faceCam tilt so not top-squashed.
2. **Inventory occlusion** — per-row `screenAnchor` depth (`invDepthStep`), mild scale falloff, renderOrder by row, dual studs, milder row overlap. Front (bottom) occludes back (top) with readable numbers.

## Still short of ad
1. Title: white banner vs bare black text on blue (leftover from prior notes).
2. Trails can still read rod-like edge-on in some stills.
3. Tank aspect ~0.71 vs ref ~0.55–0.65; spacing still a bit roomier than ad.
4. Digits thicker than 1.3.7 but ad fill can still look heavier.
5. Hand = toolkit photo `hand.png` (required).
6. Layout band knobs mostly kept (slotY 800 / invTop 960 / voxScale 0.46 / targetY 10.3 / cam3dTY 7.7); uiScale 0.38→0.40; slotW/H/gap + inv packing retuned for tank/inv fixes.
