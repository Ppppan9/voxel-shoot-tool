# Remaining vs reference (v1.3.9)
## Done
- Launcher block = exact inventory block model (makeInvBlock), same scale (invScale) and tilt; no morph pick→fly→slot→fire; recoil = position only, leave = uniform fade/shrink.
- Muzzle from block top. Trails longer/wider comets (span 11%, len 0.6–1.2, glow 1.8).
- Hit FX toned to ref: smaller balls (ballR .09), less halo/glow, flash 1.1/120ms, sparks 6, more+smaller debris.
- Inventory col gap 6→2. Title white banner now off by default (setting 顶部白底横幅).
## Leftovers
- Ref hits read as many thin long white streaks + green shard spray; ours still has more round white blobs.
- Ref fly-in is ~instant pop; ours is 320ms arc.
- Ref keeps 0-ammo tanks visible longer; ours fades out.
