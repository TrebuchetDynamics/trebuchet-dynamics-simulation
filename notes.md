# Dev Notes — Trebuchet Dynamics 2D

This file tracks the implementation details and next milestones for the Godot 4.x trebuchet demo. The playable slice now mirrors most of the README promises: a slider-driven UI, manual trajectory prediction, scoring, and a scripted castle. Use this as a checklist as you evolve it into a full rigid-body trebuchet.

## Current Implementation Summary
- **Scene:** `scenes/Trebuchet.tscn` is intentionally minimal. The script instantiates almost everything (UI, ground, castle) at runtime, so edits happen in code.
- **Script:** `scripts/Trebuchet.gd` handles UI creation, slider state, projectile integration, trajectory preview, castle generation, scoring, and high-score persistence.
- **Simulation model:** No physical `RigidBody2D` nodes yet. Launch math estimates sling velocity using counterweight energy and arm ratios, then integrates motion manually with gravity + wind.
- **Castle:** Built as a configurable grid of `Polygon2D` blocks. Each destroyed block awards points; entire castle resets on a timer after a shot.

### Key Constants (tune as needed)
| Const | Default | Effect |
| --- | --- | --- |
| `PIXELS_PER_METER` | 6 | Converts physics math to screen coordinates. Increase for tighter scene. |
| `GROUND_Y` | 520 | Y position for collision floor. Move up/down for different horizons. |
| `SIM_STEPS` | 220 | Number of Euler steps used for trajectory preview. |
| `SCORE_FILE` | `user://scores.cfg` | High score persistence path. |
| `BRICK_COLUMNS / ROWS` | 4 × 3 | Castle grid dimensions. |

## Code Walkthrough
1. `_setup_ui()` clears the editor-authored `Control`, adds a `PanelContainer`, and generates sliders using `SLIDER_META`. Keep metadata in sync when adding sliders.
2. `_update_trajectory()` is shared by the preview and “real” launch. Any physics tuning (wind, gravity scale, release angle logic) must stay identical to avoid mismatch between preview and actual shot.
3. `_fire()` freezes slider inputs and seeds projectile state. `_append_trail_point()` adds breathing room between points to keep the trail lightweight.
4. `_check_castle_hits()` grows each `Rect2` to approximate projectile radius. Replace with real collision logic once bricks become `RigidBody2D` nodes.
5. `_reset_after_delay()` uses `await` to pause 1.2 seconds before rebuilding the castle and resetting the projectile, preserving slider values for fast iteration.

## Immediate TODOs
- [ ] Swap the placeholder `Polygon2D` projectile for a `RigidBody2D` with a `CircleShape2D`, hook it to an actual trebuchet arm, and copy slider values into rigid body/Joint properties. The README already documents the desired scene hierarchy.
- [ ] Move UI construction into the scene tree to make it easier for designers to restyle. Keep `SLIDER_META` for logic but let art iterate visually in the editor.
- [ ] Add audio/visual polish (launch, wind whoosh, impact dust). The script already has hooks where these signals would fire (`_fire`, `_destroy_brick`, `_finalize_shot`).
- [ ] Transition castle bricks to physics nodes and award score via signals rather than bounding-box checks. This makes destruction more satisfying and aligns with marketing copy.
- [ ] Provide export presets (Web, Android) and document any special settings (e.g., disable threads for Web) directly in this file for quick deployment.

## Future Ideas
1. **Leaderboard:** Integrate with a lightweight backend or itch.io scores to make the “high score challenge” global.
2. **Challenges:** Add scenario presets (e.g., wind storms, heavier castles) and surface them as quick buttons.
3. **Educational overlay:** Display the computed energy, release speed, and estimated landing distance per shot to underline the “physics transparency” promise.
4. **Accessibility:** Provide keyboard/gamepad mappings so you can present the build without touching the mouse/trackpad.

Keep this document up to date as you iterate—treat it as a living playbook for anyone contributing to the project.
