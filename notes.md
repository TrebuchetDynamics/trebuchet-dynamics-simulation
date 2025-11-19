Trebuchet focus only. 🏹

# Trebuchet Implementation Notes

The repo now runs a single rigid-body trebuchet directly inside `Trebuchet.tscn`. These notes describe how the scene is wired and how `Trebuchet.gd` steers it so you can re-tune or extend the rig without spelunking through code first.

## Scene Layout (under `Simulation/TrebuchetRig`)

```text
TrebuchetRig (Node2D)
├─ Frame (StaticBody2D) + CollisionShape2D   # purely visual collider
├─ Pivot (StaticBody2D) + CollisionShape2D   # anchor for the arm joint
├─ Arm (RigidBody2D) + CollisionShape2D      # rectangular beam, pivoted at center
├─ Counterweight (RigidBody2D)               # hinged to the short arm
├─ Projectile (RigidBody2D)                  # also used by scoring/trail logic
├─ JointPivot (PinJoint2D)                   # Pivot ↔ Arm
├─ JointCounterweight (PinJoint2D)           # Arm ↔ Counterweight
├─ JointSling (DistanceJoint2D)              # Arm ↔ Projectile (recreated after each shot)
└─ SlingLine (Line2D)                        # rope visualization
```

There is also a `GroundCollider` (StaticBody2D) that gives the projectile somewhere to land, while the UI, castle stack, and dotted trajectory are unchanged.

## Slider → Rig Mapping

- `Arm Length (m)` drives `arm_short_length_px`, `arm_long_length_px`, and `sling_length_px`. Values remain in meters for the UI but get scaled by `PIXELS_PER_METER * RIG_SCALE` (currently 6 × 3) so the Godot rig stays readable.
- `Counterweight Mass` and `Projectile Mass` wire directly into their respective `RigidBody2D.mass` values each time `_configure_rig_from_sliders()` runs.
- `Draw Angle` sets the cocked rotation (`-deg`), clamped to `[40°, 120°]` so the counterweight always starts above the pivot.
- `Wind` still feeds the analytic preview but also applies a horizontal force in `_physics_process()` once the sling is released.

## Cock → Fire → Release

1. `_cock_trebuchet()` freezes the rigid bodies, sets the arm rotation, parks the counterweight and projectile along the local long/short arm offsets, and (re)creates the sling joint via `_ensure_sling_joint()`.
2. `_fire()` unfreezes everything, clears the trail, records the starting position, and leaves the rest to Godot’s rigid-body solver; there is no more manual projectile integration.
3. Each physics frame `_check_release_condition()` compares the arm-tip vector vs `Vector2.UP`. When the angle is within `release_angle_tolerance_deg` (default 12°), `_release_projectile()` queues the `DistanceJoint2D`, marking the stone free-flying.
4. `_finalize_shot()` watches for the projectile touching the ground plane (`projectile_position.y >= GROUND_Y`), totals the distance + bricks, freezes the rig again, and schedules a reset.

## Geometry + Mass Details

- The arm collision shape is resized every time through `_update_arm_shape()` so the pivot stays centered while the long/short halves match the chosen arm ratio.
- Counterweight hinge: `local_anchor_a = (0, -arm_short_length_px)` so the joint stays glued to the short arm. The counterweight body is positioned a small `COUNTER_HINGE_DROP` below that anchor to mimic a strap rather than a hard bolt.
- Sling joint: `local_anchor_a = (0, arm_long_length_px)` on the arm, `local_anchor_b = Vector2.ZERO` on the projectile, with `length = sling_length_px`. The line visual simply draws anchor → projectile each frame.
- Freezing is handled via `_set_bodies_frozen(flag)` which toggles `RigidBody2D.freeze` and sleep states; this prevents the arm from sagging when sliders change while the sim is idle.

## Analytic Preview vs Actual Physics

`_estimate_release_velocity_vector()` still computes a deterministic release velocity and feeds `_update_trajectory()` so the dotted preview line survives intact. Because the real rig now runs in physics space, you can compare the preview line against actual shots to validate the energy-transfer math and adjust efficiency constants.

## Tuning Workflow

1. Change any slider → `_configure_rig_from_sliders()` recalculates lengths/masses, `_reset_projectile_state()` re-cocks, and the preview updates immediately.
2. Hit **FIRE!** → the rigid bodies wake up, counterweight falls, the sling auto-releases, and motion continues under Godot’s solver (plus the wind force if enabled).
3. Adjust `RELEASE_TOLERANCE_DEG`, `RIG_SCALE`, or `COUNTER_HINGE_DROP` constants in `Trebuchet.gd` to match specific trebuchet dimensions or photographic references.

Future improvements (drop them straight into the rig):

- Add a latch joint (PinJoint2D → ground) for a hard mechanical catch if you want to animate a trigger.
- Split the sling into two `RigidBody2D` segments for a whip-like effect, or simply feed a `Curve2D` into `Line2D` if visuals are all you need.
- Drive per-shot restitution/friction by reading actual collision data from `projectile_body` instead of the current Rect2 hit check.

With the scene + script now in sync, you can tweak real-world dimensions or compare logs against your analytical diagrams without touching the Godot editor every time.
