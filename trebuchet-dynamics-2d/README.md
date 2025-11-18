# Trebuchet Dynamics Simulator

Built by **Trebuchet Dynamics Limited**, this project is a polished Godot 4.x showcase for real-time 2D physics, responsive UI, and seamless deployment to web and mobile. It is intentionally scoped so that a single developer can stand up the full experience in about an hour and then ship it directly to itch.io, Netlify, or Google Play.

## Why It Impresses
- Real-time Jolt/Bullet physics: hinged arm, PinJoint sling, impulses, collisions.
- Live trajectory prediction: manual Euler integration renders the dotted landing forecast.
- Polished UX: mobile-friendly sliders, local high score persistence, slick VFX/SFX.
- Cross-platform: HTML5 build in one click, Android APK in minutes.
- Educational angle: sliders expose transparent physics math for recruiters/clients.

## Feature Overview
| Control | Range | Notes |
| --- | --- | --- |
| Counterweight Mass | 50 – 2000 kg | Heavier counter → more energy. Primary slider. |
| Projectile Mass | 1 – 100 kg | Lighter payload keeps arm velocity high. |
| Arm Length | 4 – 12 m | Automatically keeps 20% short arm ratio for best transfer. |
| Draw Angle | 30° – 120° | Sets preload height via hinge limits. |
| Wind Force | -20 – +20 m/s | Horizontal force applied while projectile is airborne. |

Additional gameplay polish:
- Destructible castle made of RigidBody2D bricks; each hit increments score.
- TrajectoryLine renders a 100-step prediction in screen space.
- GPUParticles2D for dust/trails, launch and impact audio cues, camera tween-on-launch.
- Scoreboard UI: Distance + castle hits; stores a local high score via `user://` config.

## Physics Cheat Sheet
```
E = m_cw * g * h, where h = short_len * (1 - cos(theta))
v_tip ≈ sqrt(2E / I) * long_len
Range ≈ (v^2 * sin(2 * phi)) / g  (phi ≈ 45° ideal)
```
Key takeaways:
- Heavier counterweights boost range roughly with √m.
- Keep projectile mass low unless you want satisfying impacts.
- Arm ratio of 1:4–1:6 and a ~20° release point deliver the best transfer.
- Moderate wind offsets the shot for difficulty.

| Parameter | Effect | Sweet Spot |
| --- | --- | --- |
| Counterweight Mass ↑ | Range scales with √m | 500 – 1000 kg |
| Projectile Mass ↓ | Less energy loss | 10 – 50 kg |
| Arm Ratio 1:4–1:6 | Matches real trebuchets | Short arm = 20% total |
| Release ≈ 20° | Produces ~45° projectile arc | Auto-tuned |
| Wind | Adds lateral drift | ±10 m/s for challenge |

## Gameplay Loop
1. Adjust sliders and watch `TrajectoryLine` update instantly via `_update_trajectory()`.
2. Press **FIRE!** to release the hinge limits; the arm swings under gravity.
3. Projectile auto-detaches when angular velocity peaks; impact destroys castle bricks.
4. Score updates (distance + bricks). High score persists between sessions.
5. System auto-resets for the next shot.

## Quick Start (Godot 4.3+)
1. Download Godot 4.3 or newer.
2. `Project > Import` and select `project.godot` from this repo.
3. Open `Trebuchet.tscn` (Node2D root with `Trebuchet.gd`).
4. Press **F5** to run.
5. Export using built-in presets when ready (see below).

## Scene Layout
```
Trebuchet (Node2D, script=Trebuchet.gd)
├─ ParallaxBackground → ParallaxLayer (sky + ground textures)
├─ Ground (StaticBody2D + SegmentShape2D from -10,0 to 60,0)
├─ Frame (StaticBody2D, rectangular ColorRect shell)
├─ ArmPivot (Node2D at 0,3)
├─ Arm (RigidBody2D, RectShape2D 8.4x0.3)
│  ├─ CounterAttach (Node2D at -short_len)
│  ├─ SlingAttach (Node2D at long_len)
│  └─ Trail (Line2D for projectile path)
├─ Hinge (HingeJoint2D tying Frame + Arm)
├─ Counterweight (RigidBody2D + PinJoint2D)
├─ Projectile (RigidBody2D + PinJoint2D, dust particles child)
├─ Castle (instance of `Castle.tscn`, bricks with `body_entered` signal)
├─ Camera2D (script follows projectile on launch)
└─ CanvasLayer (UI: sliders, labels, Fire button, trajectory preview, particles, audio)
```
`Castle.tscn` contains ~10 stacked bricks (RigidBody2D) with brown ColorRects. Collisions increment the score and optionally `queue_free` bricks for dramatic crumble.

## Core Script Highlights (`Trebuchet.gd`)
- `_ready()` wires slider `value_changed`, Fire button, impact signals, and loads the saved high score.
- `_update_params()` keeps masses, arm length, draw angle, and wind force synchronized with the UI, then refreshes the live trajectory preview.
- `_update_trajectory()` performs a 200-step Euler integration using the arm rotation + estimated release velocity, writing points into `TrajectoryLine` and `range_label`.
- `_fire()` unlocks hinge limits, plays launch audio, and sets a camera tween toward the projectile.
- `_release()` detaches `PinJoint2D`, applies sling boost impulse, and begins tracking for impact VFX/SFX.
- `_on_impact()` tallies score, spawns impact particles, updates labels, and triggers `_reset()` after a short delay while preserving `high_score` via `ConfigFile`.

### Sample Snippet
```gdscript
func _update_trajectory():
    trajectory.clear_points()
    var start_pos = $Arm/SlingAttach.global_position
    var est_vel = _estimate_release_vel().rotated(arm.rotation)
    var pos = start_pos
    var vel = est_vel
    for i in SIM_STEPS:
        pos += vel * DT
        vel.y += GRAVITY * DT
        trajectory.add_point(camera.to_local(pos))
        if pos.y > 1000:
            break
    range_label.text = "Est. Range: %.1fm" % (pos.x / 100)
```

## Deployment
**Web (5 min)**
1. `Project > Export` → add **Web** preset.
2. Disable threads for maximum compatibility.
3. Export to a folder, upload `index.html` bundle to itch.io/Netlify, or embed via `<iframe src="game.html"></iframe>`.

**Android (≈15 min)**
1. Install Android SDK + Commandline Tools.
2. Configure keystore under `Project Settings > Android`.
3. Export APK; sideload via USB or submit to Google Play. App needs no permissions.

## Mobile Tweaks
- Anchor UI to full rect; sliders/buttons should scale for touch.
- Keep particles modest on low-end devices and prefer GPUParticles2D for efficiency.
- Jolt physics holds 60 FPS even on modest phones if `SIM_STEPS` is capped around 100 for previews.

## Tuning & Debug
| Issue | Fix |
| --- | --- |
| Arm jitter | Increase joint bias to 0.5 and solver iterations to 10. |
| Launch feels weak | Raise sling boost impulse or lower projectile mass. |
| Trajectory preview off | Tune `_estimate_release_vel()` scalar or reduce `SIM_STEPS`. |
| Web build slow | Cut preview steps to 100, disable multithreading. |
| Need visibility while debugging | Enable `Visible Collision Shapes` in `Project Settings > Debug`. |

## Credits & License
- Engine: Godot 4.3+
- Art: Kenney sprites (wood/rock) + OpenGameArt particles. Placeholder ColorRects included.
- Audio: Freesound (launch/impact samples).
- Contact: info@trebuchetdynamics.com

Released under the **MIT License**—fork, remix, and ship commercially. Have fun flinging castles!
