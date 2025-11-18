# Trebuchet 2D Godot Dossier — Single Slider Edition

A minimal-yet-complete Godot 4.x prototype that focuses on a single UI control: **Counterweight Mass (50–2000 kg)**. Adjust it, fire, watch the projectile arc, and repeat. This setup is ideal for a lightning-fast pitch (15–30 minutes to build) because it uses only colored rects/circles, Godot physics, and auto-reset logic.

## Play Loop & Goals
1. Move the counterweight slider and observe how range estimates change immediately.
2. Press **FIRE** to drop the counterweight; the arm swings through the preload limit.
3. Projectile detaches around 20° past vertical, smashes into a simple destructible stack, and scoring increments per collision.
4. Scene auto-resets after the projectile lands so you can iterate instantly.

Targets use just a stack of RigidBody2D bricks positioned ahead of the trebuchet. No external assets are required, making this perfect for workshops or interviews.

## Physics Principles
A trebuchet converts counterweight potential energy into projectile kinetic energy via arm rotation. The only tuning surface you expose is counterweight mass, yet the math remains transparent.

```
E_p = m_cw * g * h
h = short_len * (1 - cos(theta))
τ = m_cw * short_len * g * sin(theta)
Range ≈ (v^2 * sin(2φ)) / g  (φ ≈ 45° ideal)
```
- Godot gravity is 9.81 m/s² by default; leave it unless you want exaggerated arcs.
- `h` is the drop height of the counterweight; with a 90° draw, `h ≈ short_len`.
- Sling release occurs around 20–40° past vertical; tune the exact value to hit a 45° projectile trajectory.
- Momentum conservation comes for free via Godot physics. Doubling the counterweight roughly increases range by √2.

### Parameter Quick Reference
| Parameter | Default | Effect on Range |
| --- | --- | --- |
| Counterweight Mass | 500 kg | Linear energy source (UI slider). |
| Short : Long Ratio | 1 : 4 | Mimics real machines; favors heavy counters. |
| Draw Angle | 90° | Higher angle → more stored potential energy. |
| Release Angle | ~20° | Maximizes projectile speed for ≈45° arc. |

Test examples: 100 kg barely clears the frame; 1500 kg obliterates the target stack.

## Scene Recipe (`Trebuchet.tscn`)
1. Create a `Node2D` root named **Trebuchet** and attach `Trebuchet.gd`.
2. Add world pieces:
   - `Ground` (`StaticBody2D`) with `SegmentShape2D` from (-10, 0) to (50, 0).
   - `Frame` (`StaticBody2D`) built from a brown `ColorRect` + `RectangleShape2D` sized roughly 4×6 meters.
   - `Arm` (`RigidBody2D`) positioned at `(0,3)` with a `RectangleShape2D` sized `Vector2(8.4, 0.3)` and a matching `Sprite2D`/`ColorRect`.
3. Add joint helpers:
   - `ArmPivot` (`Node2D`) at `(0,3)`.
   - `HingeJoint2D` connecting `Frame` (node_a) and `Arm` (node_b); enable angular limits with lower `-135°` and upper `92°` to preload.
   - `CounterAttach`/`SlingAttach` nodes on the arm at `-1.6` and `6.8` meters respectively.
4. Create masses:
   - `Counterweight` (`RigidBody2D`) with `CircleShape2D` (radius 0.8 m) and a gray `Sprite2D`. Pin it via `PinJoint2D` to `CounterAttach`.
   - `Projectile` (`RigidBody2D`, sleeping=true) with `CircleShape2D` radius 0.4 m, black `Sprite2D`, dust `GPUParticles2D`, and `PinJoint2D` to `SlingAttach`.
5. UI Layer:
   - `CanvasLayer` → `Control` (anchors full).
   - Inside a top-right `VBoxContainer` place `Label` ("Counterweight Mass (kg): 500"), `HSlider` (`min=50`, `max=2000`, `step=50`), and `Button` ("FIRE!"). Rename nodes to `MassLabel`, `MassSlider`, `FireBtn` to match the script.
6. Target stack: add three `RigidBody2D` boxes at `x=30`. Connect their `body_entered` signal to the projectile for scoring.

## Script Outline (`Trebuchet.gd`)
```gdscript
extends Node2D

@onready var arm          = $Arm
@onready var counter_rb   = $Counterweight
@onready var proj_rb      = $Projectile
@onready var sling_attach = $Arm/SlingAttach
@onready var mass_label   = $CanvasLayer/UI/VBoxContainer/MassLabel
@onready var mass_slider  = $CanvasLayer/UI/VBoxContainer/MassSlider
@onready var fire_btn     = $CanvasLayer/UI/VBoxContainer/FireBtn

const SHORT_LEN := 1.6
const LONG_LEN  := 6.8
const DRAW_ANGLE_DEG := 92.0
const ARM_MASS := 200.0
const PROJ_MASS := 20.0
var is_firing := false
```
Implementation notes:
- `_ready()` hooks slider and button signals, sets slider defaults, and calls `_reset()`.
- `_on_mass_changed()` updates `counter_rb.mass`, refreshes the label with formatted kilograms, and re-arms the trebuchet.
- `_reset()` freezes bodies, rotates the arm to the draw angle, restores hinge limits to ±2°, reattaches the projectile, and unfreezes bodies (keeping them sleeping until fired).
- `_fire()` unlocks hinge limits (e.g., lower `=-140°`, upper `=-50°`), clears sleeping flags, and lets gravity do the work.
- `_physics_process()` watches for `arm.rotation_degrees < 25` with sufficient angular velocity before calling `_release_projectile()`.
- `_release_projectile()` detaches the sling (`pin_sling.node_b = null`), applies a small impulse for sling boost, and ensures the projectile stays awake.

## Debug & Polishing Tips
- Set joint bias to ~0.3–0.5 for snappier response. Increase solver iterations if the arm jitters with high masses.
- Tweak the boost impulse vector `(Vector2(250 * cos(proj.rotation), -100))` to mimic sling behavior.
- Enable **Visible Collision Shapes** while tuning and disable before exporting.
- For range comparison, log `proj_rb.global_position.x` upon landing to correlate slider positions to performance.

This dossier keeps the experience approachable: one slider, visible physics, and immediate feedback. Expand from here if you need the full multi-slider simulator described in the README.
