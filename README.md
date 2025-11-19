# Trebuchet Dynamics Simulator

Trebuchet Dynamics Limited is building a compact Godot 4.x demo that shows off UI-driven physics tuning, a live trajectory predictor, persistent scoring, and rapid deployment. The current repository already ships a playable vertical slice built entirely with GDScript and simple shapes so that you can iterate quickly before swapping in full art/physics assets.

## What Ships Today
- **Scene:** `res://scenes/Trebuchet.tscn` contains a `Node2D` root with a simulation group (ground, castle stack, projectile + trail) and a `CanvasLayer` for UI.
- **Script:** `res://scripts/Trebuchet.gd` procedurally builds the control panel and runs a simplified trebuchet launch sim (no rigid bodies yet).
- **Sliders:** Counterweight, projectile mass, arm length, draw angle, and wind sliders update a deterministic model and redraw the dotted range preview.
- **Launch Loop:** Press **FIRE!** to spawn the projectile, integrate flight using the slider values, leave a trail, award distance + brick destruction points, and auto reset.
- **Scoring:** Scores persist via `user://scores.cfg`, giving a “high score challenge” hook for demos.

## Controls & Gameplay Loop
1. Tweak any slider and watch the `TrajectoryLine` preview update instantly.
2. Hit **FIRE!** – the script computes release velocity by estimating counterweight energy and sling efficiency, then integrates motion with wind + gravity.
3. Projectile travels until it hits the ground plane at `y = 520 px` while checking AABB collisions against faux bricks.
4. Every brick destroyed adds 5 points; the final horizontal distance (converted to meters) adds to the score as the projectile lands.
5. After a short delay the castle resets, sliders remain as set, and you can iterate again.

| Slider | Default | Purpose |
| --- | --- | --- |
| Counterweight Mass (kg) | 800 | Controls stored potential energy. |
| Projectile Mass (kg) | 20 | Heavier payload dampens tip speed. |
| Arm Length (m) | 8 | Adjusts short/long arm ratio, sling gain. |
| Draw Angle (deg) | 90 | Sets preload height and release angle. |
| Wind Force (m/s) | 0 | Adds horizontal acceleration throughout flight. |

## Files & Structure
```
res://
├── project.godot              # Declares Trebuchet.tscn as main scene
├── scenes/
│   └── Trebuchet.tscn         # Node hierarchy skeleton (simulation + UI containers)
└── scripts/
	└── Trebuchet.gd           # Slider UI, trajectory sim, scoring, castle builder
```
Everything inside the scene besides `Trebuchet.gd` is intentionally primitive (Polygon2D rectangles) to keep iteration fast. Replace nodes with actual sprites, RigidBody2D setups, particles, and audio once you are ready to polish.

## Running the Project
1. Install Godot 4.3+.
2. `Project > Import…` and pick `project.godot` (root of this folder).
3. Select the imported project and click **Edit**.
4. Press **F5** (or the play icon). The UI panel spawns on the right, the castle renders on the left, and you can immediately tune + fire.

## Implementation Highlights (`scripts/Trebuchet.gd`)
- `_setup_ui()` programmatically creates the panel, ensuring consistent layout even before creating scenes in the editor.
- `SLIDER_META` drives slider creation (labels, min/max/format strings); `_on_slider_changed()` keeps `slider_state` fresh and reruns `_update_trajectory()`.
- `_estimate_release_velocity_vector()` approximates energy transfer based on counter mass, arm ratio, sling gain, and draw angle. Results feed both the preview and actual launch.
- `_update_trajectory()` performs 220 Euler steps (`TRAJECTORY_DT = 0.03`) in screen space, writing points into `TrajectoryLine` and updating the estimated range label.
- `_build_castle()` spawns a configurable grid of bricks (Polygon2D) so you can tweak rows/columns/padding without editing the scene file by hand.
- `_check_castle_hits()` uses expanded `Rect2` checks rather than full physics so the demo remains deterministic regardless of platform.
- `_save_high_score()` writes to `user://scores.cfg`; delete this file to reset the leaderboard between demo sessions.

## Extending the Demo
1. **Swap in RigidBody2D Trebuchet:** Replace the scripted projectile with a physics-based arm + joints as described in `notes.md`. The slider plumbing already matches the design.
2. **Add VFX/SFX:** Connect launch/impact to `AudioStreamPlayer2D` nodes and GPUParticles2D emitters to mirror the README feature list.
3. **Mobile polish:** Anchor the `PanelContainer` to left/right edges or add a toggle so smaller screens can slide the controls in/out.
4. **Deployment:** Use Godot’s Export presets for Web/Android; no additional dependencies are required since assets are generated procedurally.

## Support & License
- Contact: `info@trebuchetdynamics.com`
- License: **MIT** – fork, remix, and deploy commercially.

Keep iterating from this solid base; once the actual trebuchet rig is in place you already have UI, scoring, and previews wired up.
