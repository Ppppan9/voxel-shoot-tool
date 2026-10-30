# Remaining vs reference (v1.4.0)
## Done
- Hit FX: sparks render as thin white velocity streaks (no round blobs); flash 0.6; more green debris shards.
- Pick→slot: 100ms near-instant pop (arc 0.4), was 320ms/3.2.
- Empty launchers stay in slot showing 0 until replaced by a new pick (state 'empty' counts as free).
- targetY 10.3→10.0. Launcher still = inventory block model.
## Leftovers
- Ad hit spray denser/greener; ours still shows some white ball cores near hits.
- Tap feedback/slot bob/countdown not retimed per frame (kept prior values).
- Tanks↔inv gap and target framing still not pixel-matched; ad target bigger/tilted cage.
