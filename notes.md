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
├─ SlingBody (RigidBody2D)                   # NEW: Rigid rod connecting arm to projectile
├─ Projectile (RigidBody2D)                  # also used by scoring/trail logic
├─ JointPivot (PinJoint2D)                   # Pivot ↔ Arm
├─ JointCounterweight (PinJoint2D)           # Arm ↔ Counterweight
├─ JointArmSling (PinJoint2D)                # Arm ↔ SlingBody
├─ JointSlingProj (PinJoint2D)               # SlingBody ↔ Projectile
└─ SlingLine (Line2D)                        # rope visualization
```

There is also a `GroundCollider` (StaticBody2D) that gives the projectile somewhere to land, while the UI, castle stack, and dotted trajectory are unchanged.

## Slider → Rig Mapping

- `Arm Length (m)` drives `arm_short_length_px`, `arm_long_length_px`, and `sling_length_px`. Values remain in meters for the UI but get scaled by `PIXELS_PER_METER * RIG_SCALE` (currently 6 × 3) so the Godot rig stays readable.
- `Counterweight Mass` and `Projectile Mass` wire directly into their respective `RigidBody2D.mass` values each time `_configure_rig_from_sliders()` runs.
- `Draw Angle` sets the cocked rotation (`-deg`), clamped to `[40°, 120°]` so the counterweight always starts above the pivot.
- `Wind` still feeds the analytic preview but also applies a horizontal force in `_physics_process()` once the sling is released.

## Cock → Fire → Release

1. `_cock_trebuchet()` freezes the rigid bodies and uses an **IK Solver** to position the arm, counterweight, and projectile. It calculates the correct ground placement for the projectile if the sling is too long to hang freely.
2. `_rebuild_sling_rig()` is called to instantiate the `SlingBody` and the two `PinJoint2D`s (`JointArmSling`, `JointSlingProj`) in the exact positions determined by the IK step.
3. `_fire()` unfreezes everything. The rigid chain dynamics take over immediately.
4. `_check_release_condition()` monitors the sling angle. When the release point is reached, `JointSlingProj` is freed, cleanly detaching the projectile from the sling.
5. `_finalize_shot()` handles scoring and resetting as before.

## Geometry + Mass Details

- The arm collision shape is resized every time through `_update_arm_shape()` so the pivot stays centered while the long/short halves match the chosen arm ratio.
- Counterweight hinge: `local_anchor_a = (0, -arm_short_length_px)` so the joint stays glued to the short arm. The counterweight body is positioned a small `COUNTER_HINGE_DROP` below that anchor to mimic a strap rather than a hard bolt.
- Sling joint: Replaced by a **Rigid Body Chain**. The `SlingBody` is a thin rigid body with mass `1.0` and no collision layer, acting as a physical rod.

- Freezing is handled via `_set_bodies_frozen(flag)` which toggles `RigidBody2D.freeze` and sleep states; this prevents the arm from sagging when sliders change while the sim is idle.

## Analytic Preview vs Actual Physics

`_estimate_release_velocity_vector()` still computes a deterministic release velocity and feeds `_update_trajectory()` so the dotted preview line survives intact. Because the real rig now runs in physics space, you can compare the preview line against actual shots to validate the energy-transfer math and adjust efficiency constants.

## Tuning Workflow

1. Change any slider → `_configure_rig_from_sliders()` recalculates lengths/masses, `_reset_projectile_state()` re-cocks, and the preview updates immediately.
2. Hit **FIRE!** → the rigid bodies wake up, counterweight falls, the sling auto-releases, and motion continues under Godot’s solver (plus the wind force if enabled).
3. Adjust `RELEASE_TOLERANCE_DEG`, `RIG_SCALE`, or `COUNTER_HINGE_DROP` constants in `Trebuchet.gd` to match specific trebuchet dimensions or photographic references.

Future improvements (drop them straight into the rig):
- Add a latch joint (PinJoint2D → ground) for a hard mechanical catch if you want to animate a trigger.
- The sling is now a rigid body, but you could chain *multiple* small rigid bodies to simulate a flexible rope (chain simulation) instead of a single rigid rod.
- Drive per-shot restitution/friction by reading actual collision data from `projectile_body` instead of the current Rect2 hit check.

With the scene + script now in sync, you can tweak real-world dimensions or compare logs against your analytical diagrams without touching the Godot editor every time.
