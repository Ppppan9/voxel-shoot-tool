# Side-by-side vs reference — remaining differences (v1.2.0)

Compared by personally Reading `screenshots/side_*.png` + REF frames (`detail_02s` / `f_0001` for sphere; `detail_22s` ice cream; etc.).

## v1.2.0 hybrid (fixed vs rejected v1.1.0)
- **Layout bands**: title → 3D target (upper) → flat 5-slot bar → flat 4×4/3×3 inventory (measured sphere extent ~125–759 vs REF ~90–737)
- **Flat UI**: slots + inventory are 2D face-on toy blocks with large white numerals (not receding 3D stack)
- **Sphere**: thin-shell multicolor globe + white lat/lon ribs; camera framed so target stays above slots
- **Opening ammo**: sphere L/R slots show 69 / 48; inventory 2-digit counts
- **White ribs**: hittable by any color
- **Hand**: shown on inventory for stills

## Tiny leftovers (not blockers)
1. Sphere color-patch boundaries ≠ ad’s exact Rubik partitions (procedural sectors).
2. Cannons are flat dual-nub toy blocks, not full 3D tank meshes (intentional for flat-UI match).
3. Ice cream / house / cat / melon silhouettes recognizable; voxel art not frame-traced.
4. Static stills use `fireRate=0` so no projectile streaks in side_* (live play has balls+debris).
5. Inventory ammo values solved for solvability; not identical to every ad frame.
6. Hand = toolkit default mahjong finger (required), not ad white glove.
7. `detail_08s` is still a sphere mid-fight; diamond preset is a styled variant, not a 1:1 mesh copy of that frame.
