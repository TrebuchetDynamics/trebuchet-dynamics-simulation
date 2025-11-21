Full Extensive Godot Documentation: 2D Physics for RigidBody2D GamesGodot Engine's stable 4.x documentation (as of latest) provides comprehensive 2D physics via GodotPhysics (default) at fixed 60 Hz ticks (Project Settings > Physics > Common > Physics Ticks per Second). For RigidBody2D games (e.g., physics-based puzzles, destructible objects, launchers), prioritize _physics_process(delta) and _integrate_forces(state) for frame-independent, stable simulation. 

docs.godotengine.org +1

2D Physics Bodies Overview (from Physics Introduction)All extend CollisionObject2D; require child CollisionShape2D/CollisionPolygon2D with Shape2D (no node scaling—adjust shape properties). 

docs.godotengine.org +1

Body Type
Traits
Vs. RigidBody2D
Use in RigidBody2D Games
StaticBody2D
Immovable; constant velocity for platforms (constant_linear_velocity, constant_angular_velocity).
Static environment RigidBody2D collides against.
Walls, floors, moving platforms. 

docs.godotengine.org

RigidBody2D
Full sim: forces/impulses → engine movement/rotation/bounce. Sleeps when idle (can_sleep).
Core for dynamic objects.
Projectiles, crates, falling enemies. 

docs.godotengine.org

CharacterBody2D
Kinematic: code-controlled velocity + move_and_slide()/move_and_collide(). No auto-forces.
Precise player pushing RigidBody2D stacks.
Platformer players interacting with RigidBodies. 

docs.godotengine.org

Area2D
Overlap signals (body_entered/exited); physics overrides (gravity/damp).
Detect RigidBody2D enters (e.g., pickups).
Triggers, hazards. 

docs.godotengine.org

PhysicsMaterial (per-body override): friction, bounce, absorb, rough. Collision Layers/Masks (32-bit bitmasks): collision_layer (what I am), collision_mask (what I detect). Set via set_collision_layer_value(layer, true) or @export_flags_2d_physics. 

docs.godotengine.org

Physics Process: _physics_process(delta) (~1/60s); multiply forces by delta for consistency.Collision Shapes 2D (Full Details)Primitives preferred for RigidBody2D (reliable/perf): CircleShape2D (radius), RectangleShape2D (extents), CapsuleShape2D, etc. Avoid scaling nodes—adjust shape props. Multiple per body (no self-collision). 

docs.godotengine.org

Primitives: Best for dynamic RigidBody2D/CharacterBody2D.
ConvexPolygonShape2D: No editor tool; manual points for convex approx (multiple for concave).
ConcavePolygonShape2D (Trimesh): Any shape; StaticBody2D only for RigidBody2D mode=Static. Editor: Sprite2D > Create CollisionPolygon2D Sibling (Simplify/Shrink/Grow). Build Mode: Solids (filled)/Segments (edges).

Runtime Creation Example (not verbatim in docs, derived):gdscript

var shape = RectangleShape2D.new()
shape.extents = Vector2(32, 32)
$CollisionShape2D.shape = shape

Best Practices for RigidBody2D: Primitives > complex; thicken thin shapes; no transforms on CollisionShape2D; limit count. 

docs.godotengine.org

Perf: Primitives fastest; concave slowest (accurate for levels). Simplify sprites for gen.RigidBody2D Deep Dive (Expanded from Physics Intro)Key Props: mass, gravity_scale, linear_damp/angular_damp (mode: add/replace), freeze/freeze_mode (STATIC/KINEMATIC), lock_rotation, continuous_cd (DISABLED/CAST_RAY/CAST_SHAPE), custom_integrator (forces _integrate_forces()), contact_monitor/max_contacts_reported (signals/queries). 

docs.godotengine.org

Control: _integrate_forces(state: PhysicsDirectBodyState2D): state.apply_central_force(), state.apply_torque(), state.linear_velocity=, state.get_contact_count()/get_contact_collider().Full Asteroids Ship Example (verbat):gdscript

extends RigidBody2D
var thrust = Vector2(0, -250)
var torque = 20000
func _integrate_forces(state):
    if Input.is_action_pressed("ui_up"):
        state.apply_force(thrust.rotated(rotation))
    else:
        state.apply_force(Vector2())
    var rotation_dir = Input.get_axis("ui_left", "ui_right")
    state.apply_torque(rotation_dir * torque)

Sleep skips callback; wake_up() or can_sleep=false. 

docs.godotengine.org

Contacts: Enable monitor; signals body_entered/exited; query in _integrate_forces().Using CharacterBody2D (Full Tutorial Integration)Kinematic alt: Precise control, manual gravity/response. Use with RigidBody2D for players pushing stacks.Movement:move_and_collide(vel * delta) → KinematicCollision2D: Stop on hit; manual response (e.g., vel = vel.bounce(normal)).
move_and_slide(): Auto-slide/floor/wall/ceiling detect (is_on_floor(), up_direction=Vector2.UP, floor_max_angle=45°, wall_min_slide_angle=15°).

Full Platformer Example (verbat):gdscript

extends CharacterBody2D
var speed = 300.0
var jump_speed = -400.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")
func _physics_process(delta):
    velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_speed
    var dir = Input.get_axis("ui_left", "ui_right")
    velocity.x = dir * speed
    move_and_slide()

Bullet Bounce (verbat):gdscript

extends CharacterBody2D  # Or RigidBody2D alt
var speed = 750
func _physics_process(delta):
    var col = move_and_collide(velocity * delta)
    if col:
        velocity = velocity.bounce(col.get_normal())

move_and_slide() loops up to 5x for smooth; queries get_slide_collision(i). 

docs.godotengine.org

Troubleshooting Physics Issues (Full Fixes for RigidBody2D)Issue
Causes
2D/RigidBody2D Fixes
Tunneling
High speed > tick dist.
continuous_cd=CAST_SHAPE; thicken shapes; ↑ ticks (120-240); dynamic shape scale by speed. 

docs.godotengine.org

Stack Instability/Wobble
Force amp in stacks.
↑ ticks (120+); primitives/thicken; Jolt (3D-only).
Thin Objects Wobbly
Thin floors/shapes.
Thicken StaticBody2D; ↑ ticks.
Scaling Wrong
Node scale.
Shape extents only; shape.duplicate().
Tilemap Bumps
Tile edges.
TileMapLayer composites (↑ Physics Quadrant Size).
Perf Drops
Complex shapes/many bodies.
Primitives; simplify; profile Physics; cap ticks.
Spiral of Death
Too many sims.
↑ Max Physics Steps/Frame; optimize bodies.

Dyn Scale Code (verbat adapt):gdscript

$CollisionShape2D.shape = $CollisionShape2D.shape.duplicate()
$CollisionShape2D.shape.extents *= (1 + linear_velocity.length() / 1000)
``` [](grok_render_citation_card_json={"cardIds":["89d707"]})

## Using Jolt Physics (3D-Only; No 2D Support)

**Enable**: Project Settings > Physics > 3D > Physics Engine = Jolt (restart). **No 2D backend**—GodotPhysics only for 2D RigidBody2D. [](grok_render_citation_card_json={"cardIds":["87e1bd"]})

**3D Benefits** (not for 2D): Better stacking (Baumgarte position-only, no overshoot); margins (`collision_margin_fraction`); ghost collision mitigation. Experimental; joints/margins differ. **Not for 2D RigidBody2D games**—stick to GodotPhysics + ↑ ticks/primitives.

## Full Workflow & Dodge the Creeps Integration
1. Scene: RigidBody2D + Sprite2D + CollisionShape2D (primitive, thickened).
2. Layers/Materials; ↑ ticks if unstable.
3. `_integrate_forces()` + impulses.
4. Areas for detection; CharacterBody2D player.
5. Test: Remote Inspector, profiler.

**Refs**: [RigidBody2D Class](https://docs.godotengine.org/en/stable/classes/class_rigidbody2d.html). Download project starters (e.g., character_body_2d_starter.zip).

## Trebuchet Physics Implementation
The trebuchet simulation has been upgraded from a spring-based approximation to a fully rigid body simulation for maximum realism and stability.

### Rigid Sling System
Instead of a `DampedSpringJoint2D` (which caused elasticity and bouncing), the sling is now modeled as a physical chain:
`Arm` -> `PinJoint2D` -> `RigidBody2D (Sling Rod)` -> `PinJoint2D` -> `Projectile`

This "Rigid Rod" approach ensures:
1.  **Zero Stretching**: The distance between the arm tip and projectile is mathematically constrained.
2.  **No Bouncing**: The projectile cannot oscillate like it's on a rubber band.
3.  **Realistic Whip**: The sling body has mass and inertia, contributing to the whip-like action of a real trebuchet.

### Inverse Kinematics (IK) Cocking
To prevent physics explosions at the start of a simulation, a custom IK solver (`_cock_trebuchet`) calculates the precise initial state:
1.  **Arm Angle**: Sets the main arm to the desired draw angle.
2.  **Counterweight**: Positions the counterweight hanging vertically from the short arm.
3.  **Sling & Projectile**:
    *   Calculates where the projectile *should* be based on gravity and the ground plane.
    *   If the sling would dangle through the floor, the system solves the Circle-Line intersection to place the projectile correctly on the ground, maintaining the exact sling length.
    *   The sling body is then instantiated and rotated to perfectly connect the arm tip and the projectile.

### Tuning & Physics
*   **Mass Ratios**: The most critical factor. A counterweight:projectile ratio of roughly 40:1 to 100:1 yields best results.
*   **Release Angle**: The projectile is released when the sling angle relative to the arm velocity vector crosses a threshold (`RELEASE_TOLERANCE_DEG`).
*   **Time Step**: The simulation runs on Godot's standard physics tick. For extreme high-speed simulations, increasing `physics_ticks_per_second` in Project Settings may improve precision, though the current setup is stable at 60Hz.
