# Trebuchet Simulation - Fixes Applied

## Latest Adjustments
- Unified scaling with `EFFECTIVE_PPM = 18` and gravity scaling so trajectory preview matches in-game motion.
- Sling anchors to the arm tip, collision is disabled on the joint, and length is clamped each physics tick to prevent stretching/jitter.
- Removed the invalid PinJoint `bias` property; joints now rely on script-set softness and stay aligned to the moving pivots.
- Projectile collider radius set to 12 px to match the ground/castle hit checks.
- Castle build is enabled again; reset stays available while firing; wind force and trajectory use per-mass acceleration.

## Issues Found and Fixed

### 1. **Missing Camera**
- **Problem**: No camera was defined, so the viewport wasn't showing the trebuchet
- **Fix**: Added Camera2D at position (960, 360) with zoom 0.8 to show the full action

### 2. **Missing Visual Representations**
- **Problem**: Arm, Counterweight, Frame, and Pivot only had CollisionShape2D (invisible)
- **Fix**: Added Polygon2D visual elements:
  - **ArmVisual**: Brown wooden beam
  - **CounterweightVisual**: Gray box
  - **FrameVisual**: Dark brown support frame
  - **PivotVisual**: Dark gray pivot point

### 3. **Incorrect Joint Node Paths**
- **Problem**: Joints used `NodePath("../NodeName")` which references parent's parent
- **Fix**: Changed to `NodePath("NodeName")` for proper sibling references:
  - JointPivot: Connects Pivot ↔ Arm
  - JointCounterweight: Connects Arm ↔ Counterweight
  - JointSling: Connects Arm ↔ Projectile

### 4. **Incorrect Joint Positioning**
- **Problem**: JointPivot had no position set (defaulted to 0,0)
- **Fix**: Set JointPivot position to (0, -120) to match Pivot and Arm positions

### 5. **Positioning for Better Visibility**
- **Problem**: TrebuchetRig was at x=180 (too far left)
- **Fix**: Moved to x=300 for better visibility while leaving room for projectile flight

### 6. **Trajectory Loop Crash**
- **Problem**: `_update_trajectory()` used `for i in SIM_STEPS:` which is invalid in GDScript and prevents the project from running.
- **Fix**: Switched to `for _i in range(SIM_STEPS):` so the preview loop executes correctly.

### 7. **Missing Projectile Collider Radius**
- **Problem**: `CircleShape2D` on the projectile had no radius set, leaving it effectively without a collision shape.
- **Fix**: Set the projectile collider radius to 12 px to match the hit checks and enable proper physics contacts.

### 8. **Detached Rigid Bodies (Broken Joint Paths)**
- **Problem**: Pin/DampedSpring joints referenced child paths (`"Pivot"`, `"Arm"`, etc.) instead of sibling paths, so the physics constraint bodies were never found and everything fell apart.
- **Fix**: Pointed joint `node_a/node_b` paths to siblings (`"../Pivot"`, `"../Arm"`, `"../Counterweight"`, `"../Projectile"`) and mirrored that in the scripted sling creation so all rigid bodies stay connected.

### 9. **Arm Aiming Left (Static Joint Anchors)**
- **Problem**: Joint anchors stayed fixed in rig space, so after cocking the arm the hinge locations were still vertical, letting the counterweight pull the arm around the wrong side.
- **Fix**: Anchor positions now follow the arm's rotation (`to_global` → `to_local`), keeping the counterweight and sling on the intended sides so the trebuchet faces and throws right.

### 10. **Reset Button Disabled During Flight**
- **Problem**: Reset was disabled as soon as you fired, so you couldn’t abort mid-flight or re-cock after a bad shot.
- **Fix**: Leave reset enabled in `_fire()`; pressing it now immediately re-cocks the rig and clears the trail/score even while the projectile is active.

### 11. **Sling Not Anchored / Stretching + Arm Jitter**
- **Problem**: The sling joint was too soft and wasn’t following the arm tip, so the rope stretched and the arm jittered.
- **Fix**: The sling now anchors to the arm tip every reset and its length is clamped during physics to stay attached and taut while keeping collisions disabled on the joint.

### 12. **Arm Binding at the Fulcrum**
- **Problem**: The arm’s collider was bumping into the pivot collider, so it couldn’t rotate freely around the fulcrum.
- **Fix**: Disabled collisions on the pivot itself and turned on `disable_collision` for the pivot/counterweight pin joints so constraints hold without any physical blocking.

### 13. **Sling Still Stretching**
- **Problem**: The soft spring sling was elongating under load, so the rope length wasn’t preserved and the projectile lagged behind the arm tip.
- **Fix**: Enforced the sling length each physics tick (instead of relying solely on stiffness) so the rope stays fixed-length without introducing instability.

### 14. **Frame Collider Blocking Shots**
- **Problem**: The vertical frame column still had an active collider, so the projectile could hit it even though it’s just a visual.
- **Fix**: Set the frame’s collision layer/mask to 0 so it is purely visual and no longer interacts with physics.

## Scene Structure (After Fixes)

```
Trebuchet
├─ Simulation
│  ├─ Camera2D (960, 360) [NEW]
│  ├─ TrebuchetRig (300, 400)
│  │  ├─ Frame (0, 0)
│  │  │  ├─ FrameVisual [NEW]
│  │  │  └─ CollisionShape2D
│  │  ├─ Pivot (0, -120)
│  │  │  ├─ PivotVisual [NEW]
│  │  │  └─ CollisionShape2D
│  │  ├─ Arm (0, -120)
│  │  │  ├─ ArmVisual [NEW]
│  │  │  └─ CollisionShape2D
│  │  ├─ Counterweight (0, -220)
│  │  │  ├─ CounterweightVisual [NEW]
│  │  │  └─ CollisionShape2D
│  │  ├─ Projectile (0, 40)
│  │  ├─ JointPivot (0, -120) [FIXED]
│  │  ├─ JointCounterweight (0, -200)
│  │  ├─ JointSling (0, -20)
│  │  └─ SlingLine (Line2D)
│  ├─ GroundRoot
│  ├─ CastleRoot
│  ├─ TrajectoryLine (yellow preview)
│  ├─ ProjectileTrail (white trail)
│  └─ GroundCollider
└─ CanvasLayer/UI
```

## How It Works Now

1. **At Start**: Arm is cocked at draw angle, counterweight raised, projectile in sling
2. **Fire Button**: Unfreezes rigid bodies, physics simulation begins
3. **Counterweight Falls**: Pulls short arm down via PinJoint2D
4. **Arm Rotates**: Around the pivot point at (300, 280)
5. **Long Arm Swings Up**: Projectile accelerates in the sling
6. **Auto-Release**: When arm tip reaches ~vertical (within 12° tolerance)
7. **Projectile Flies**: Follows ballistic trajectory with wind effects
8. **Landing**: Scores based on distance + castle brick hits

## Visual Elements

- **Brown Frame**: Vertical support beam
- **Dark Gray Pivot**: Pin joint at top of frame
- **Brown Arm**: Pivoting beam (dynamic length based on slider)
- **Gray Counterweight**: Heavy mass on short arm
- **Dark Gray Projectile**: Stone/ball to be launched
- **Tan Sling Line**: Rope connecting arm to projectile
- **Yellow Dotted Line**: Analytical trajectory preview
- **White Trail**: Actual projectile path

All components are now visible and properly connected!
