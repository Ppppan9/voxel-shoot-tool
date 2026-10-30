# Remaining diffs vs ad refs (v1.3.7)

Pixel-measured on `f_0001` vs `screenshots/game_sphere_cage.png` (720×1280):

| Band | REF | GAME |
|------|-----|------|
| Target extent | 0.194–0.649 | 0.167–0.649 |
| Slot green peak | 0.671 | 0.658 |
| Inv start | ≈0.753 | ≈0.753 |

## Done in 1.3.7
- **Chibi shooters:** squat rounded hull + small circular eyes + short white muzzle (`makeShooter`, `SH={w:1.62,d:1.28,h:1.12}`).
- **Front-face numbers:** heavy white `fillText` + outline on tank/inv front planes (not top-face stroke paths).
- **Short comet trails:** ~8% path / worldLen clamped ≈0.45–0.9; soft textured tapered cylinders — not muzzle→target rods.
- **三带排版:** retuned `ui2d` (`slotY:800`, `invTop:960`, tight col packing) + `voxScale:0.46`, `targetY:10.3`, `cam3dTY:7.7`, `uiScale:0.38`.

## Still softer vs ad (not blockers)
- Title: GAME uses white banner; some refs float bare black text.
- Hand: toolkit photorealistic hand retained (ad uses cartoon).
- Target top breathing: GAME target starts ~0.03 screen higher than `f_0001` (slightly larger silhouette under title).
- Tank silhouette: still a single rounded hull vs ad’s multi-hump organic chibi.
- Trail softness: short, but soft-cylinder can read slightly “rod-like” edge-on vs painted teardrop.
- Inv blocks: high-gloss OK; ad sometimes flatter candy plastic.

## Verify
- `screenshots/side_sphere_cage.png` / `side_ruler.png` (REF left, GAME right — trust hand type if labels confuse).
- `screenshots/game_*.png` mid-flight stills.
