Trebuchet focus only. 🏹

# Trebuchet Implementation Notes

The goal is a single, believable trebuchet inside Godot 4 that mirrors your analytical model (lengths L1–L4, masses m_b/m_c/m_p) while staying easy to tune. Everything below is scoped to the trebuchet itself—scene layout, rigid bodies, joints, and the release script.

## Objectives

- Build the trebuchet completely out of 2D rigid bodies + joints so Godot handles forces/torque.
- Make cock → fire → automatic release a deterministic sequence.
- Keep parameters (lengths, masses, gravity) close to the math diagrams so measured data can plug in.

## Scene tree (single trebuchet)

```text
TrebuchetRig (Node2D)
├─ Frame (StaticBody2D)
│   └─ CollisionShape2D   # uprights/ground hitbox
├─ Pivot (StaticBody2D)
├─ Arm (RigidBody2D)
│   └─ CollisionShape2D   # center on pivot for clean inertia
├─ Counterweight (RigidBody2D)
│   └─ CollisionShape2D
├─ Projectile (RigidBody2D)
│   └─ CollisionShape2D (Circle)
├─ JointPivot (PinJoint2D)            # Pivot ↔ Arm
├─ JointCounterweight (PinJoint2D)    # Arm short-end ↔ Counterweight
├─ JointSling (DistanceJoint2D)       # Arm long-end ↔ Projectile (removed at release)
└─ Ground (StaticBody2D)              # floor collider if needed
```

Everything lives under one Node2D so transforming or duplicating the entire rig stays trivial.

## Component details

### Frame + Pivot
- `Frame` is only there for visuals/collisions.
- `Pivot` is a `StaticBody2D` positioned at the rotation point; `JointPivot` references it and the arm.

### Arm
- `RigidBody2D` with `mode = Rigid` and `gravity_scale = 1`.
- `CollisionShape2D` centered on the pivot gives symmetric inertia so you can reason about θ easily.
- Mass should track beam mass `m_b`; offset the collision shape if you need an off-center CoM.

### Counterweight
- Separate `RigidBody2D` jointed to the short arm end with `PinJoint2D` for a free-swinging hinged weight.
- Use `mass = m_c` (or scaled) so gravity torque matches expectation.
- If you want a boxed weight rigidly fixed to the arm, skip the joint and fake mass by shifting the arm’s shape.

### Sling + Projectile
- Quick version: `DistanceJoint2D` connecting arm tip to projectile with `length = L3 * pixels_per_meter`.
- Projectile is a `RigidBody2D` sphere (`CircleShape2D`), `mass = m_p`.
- Draw rope visually using a `Line2D` between the sling anchor and projectile for readability.

## Simulation flow

1. **Cock / hold:** Rotate the arm into the armed angle (e.g., -120°). Either set `sleeping = true` on every body or add a temporary “LatchJoint” from arm tip to ground.
2. **Fire trigger:** Wake the bodies, restore `gravity_scale = 1`, remove any latch, and mark the rig `armed = true`.
3. **Automatic release:** While `armed`, monitor the arm rotation; once it crosses the release angle, delete `JointSling`.

### Reference logic

```gdscript
const RELEASE_ANGLE_DEG := 90.0
var armed := false
var released := false

func fire() -> void:
    armed = true
    released = false
    for body in [arm, counterweight, projectile]:
        body.sleeping = false
        body.gravity_scale = 1.0

func _physics_process(_delta: float) -> void:
    if armed and not released and rad2deg(arm.rotation) >= -RELEASE_ANGLE_DEG:
        released = true
        if is_instance_valid(joint_sling):
            joint_sling.queue_free()
```

Tune the comparison to match your coordinate system (arm might rotate the opposite direction depending on sprite orientation).

## Parameter mapping to math model

- Decide `PIXELS_PER_METER` once. Use it to convert L1–L4 lengths directly into collision shapes and joint distances.
- Apply mass ratios (`m_b`, `m_c`, `m_p`) straight to `RigidBody2D.mass`; you can multiply all three by a constant if Godot prefers different scales, but keep the proportions identical.
- Make sure project gravity matches whatever units you assume (default 98 px/s² ≈ 1 m/s² if 1 px = 1 cm). Override in Project Settings for cleaner conversions.

## Debug + iteration ideas

- Print or draw the arm angle in degrees so you can confirm the release threshold visually.
- Keep your analytic `_update_trajectory()` routine as an overlay: feed it the current θ, sling length, etc., draw a predicted dotted arc, and compare to the rigid-body shot for calibration.
- When duplicate trebuchets are needed, instance this rig and override only the numeric parameters (length, mass, release angle) per copy.

That’s the entire trebuchet story—frame, arm, counterweight, sling, and release—ready to drop straight into the Godot scene.
