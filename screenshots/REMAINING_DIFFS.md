# Remaining vs reference (v1.4.1)
## Done
- Empty launchers leave promptly again (state leaving + fade ~180ms); no lingering 0.
- Hit FX: sparks as thin white radial streaks; smaller flash; denser/smaller green debris; balls fade before impact (less white blobs).
- Trails: shorter softer comets (span ~7%, thinner mesh).
- Launcher still = inventory block model.
## Leftovers
- Ad hit spray still denser/greener; ours can still show some bright white cores.
- Trails closer but ad motion-blur can look softer/film-like.
- Layout/target framing gaps from earlier still not pixel-matched.

## v1.4.2 消除逻辑
- Only voxels with an exposed face that faces the camera AND has an unobstructed exact voxel-DDA line of sight (5 samples/face) are targeted, in the real rotated+tilted pivot frame.
- If a shooter's own color is exposed but only on the hidden side, it waits for rotation (no white-rib fallback, keeps ammo balanced). White fallback only when own color has no exposed voxels left.
- Lose check still uses exposure (not visibility) so waiting for rotation never triggers a false fail.
- Debug overlay: screenshots/debug_visible_hits.png (green=visible, red=back/occluded, yellow=recent hits).
- Caveat: targetRotSpeed=0 → back voxels never become visible → level can stall (no fail).
