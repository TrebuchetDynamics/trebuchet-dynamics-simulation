extends Node2D

const EFFECTIVE_PPM := 18.0 # Unified pixels-per-meter after rig scaling
const RIG_SCALE := 1.0
const GROUND_Y := 520.0
const PROJ_RADIUS := 12.0
const GROUND_CHECK_Y := GROUND_Y + PROJ_RADIUS
const GRAVITY := 9.81
const WIND_FORCE_SCALE := 32.0
const SLING_SEGMENT_WIDTH := 4.0


const SIM_STEPS := 220
const TRAJECTORY_DT := 0.03
const TRAIL_POINT_DISTANCE := 6.0
const BRICK_COLUMNS := 4
const BRICK_ROWS := 3
const BRICK_SIZE := Vector2(48, 24)
const BRICK_PADDING := Vector2(8, 6)
const RELEASE_TOLERANCE_DEG := 12.0
const MIN_SHORT_METERS := 1.2
const COUNTER_HINGE_DROP := 24.0
const SCORE_FILE := "user://scores.cfg"

var slider_state: Dictionary = {
	"counter": 800.0,
	"projectile": 20.0,
	"arm": 8.0,
	"draw": 90.0,
	"wind": 0.0,
}

const SLIDER_META := {
	"counter": {"title": "Counterweight Mass (kg)", "min": 50.0, "max": 2000.0, "step": 10.0, "format": "Counterweight Mass: %.0f kg"},
	"projectile": {"title": "Projectile Mass (kg)", "min": 1.0, "max": 100.0, "step": 1.0, "format": "Projectile Mass: %.0f kg"},
	"arm": {"title": "Arm Length (m)", "min": 4.0, "max": 12.0, "step": 0.1, "format": "Arm Length: %.1f m"},
	"draw": {"title": "Draw Angle (deg)", "min": 30.0, "max": 120.0, "step": 1.0, "format": "Draw Angle: %.0f°"},
	"wind": {"title": "Wind Force (m/s)", "min": - 20.0, "max": 20.0, "step": 1.0, "format": "Wind: %.0f m/s"},
}

var slider_refs: Dictionary = {}
var range_label: Label
var score_label: Label
var fire_button: Button
var reset_button: Button

var projectile_position: Vector2 = Vector2.ZERO
var projectile_velocity: Vector2 = Vector2.ZERO
var projectile_start: Vector2 = Vector2.ZERO
var is_projectile_active: bool = false
var last_trail_point: Vector2 = Vector2.ZERO
var score: int = 0
var high_score: int = 0

var castle_bricks: Array = []

var simulation_root: Node2D
var ground_root: Node2D
var castle_root: Node2D
var projectile_trail: Line2D
var trajectory_line: Line2D
var ui_root: Control
var trebuchet_rig: Node2D
var arm_body: RigidBody2D
var arm_shape: CollisionShape2D
var counterweight_body: RigidBody2D
var projectile_body: RigidBody2D
var joint_pivot: PinJoint2D
var joint_counterweight: PinJoint2D
var joint_arm_sling: PinJoint2D
var joint_sling_proj: PinJoint2D
var sling_body: RigidBody2D
var sling_line: Line2D


var arm_short_length_px: float = 60.0
var arm_long_length_px: float = 160.0
var sling_length_px: float = 120.0
var release_angle_tolerance_deg: float = RELEASE_TOLERANCE_DEG
var armed: bool = false
var released: bool = false
var sling_attached: bool = true

var physics_gravity: float
var grav_scale: float
var effective_px_scale: float

func _ready() -> void:
	physics_gravity = ProjectSettings.get_setting("physics/2d/default_gravity") as float
	effective_px_scale = EFFECTIVE_PPM
	grav_scale = (GRAVITY * EFFECTIVE_PPM) / physics_gravity
	_cache_scene_refs()
	_build_ground()
	_build_castle()
	_setup_ui()
	_load_high_score()
	_configure_rig_from_sliders()
	_reset_projectile_state()
	_update_score_label()
	_update_trajectory()

func _cache_scene_refs() -> void:
	simulation_root = get_node("Simulation") as Node2D
	ground_root = simulation_root.get_node("GroundRoot") as Node2D
	castle_root = simulation_root.get_node("CastleRoot") as Node2D
	projectile_trail = simulation_root.get_node("ProjectileTrail") as Line2D
	trajectory_line = simulation_root.get_node("TrajectoryLine") as Line2D
	trebuchet_rig = simulation_root.get_node("TrebuchetRig") as Node2D
	arm_body = trebuchet_rig.get_node("Arm") as RigidBody2D
	arm_shape = arm_body.get_node("CollisionShape2D") as CollisionShape2D
	counterweight_body = trebuchet_rig.get_node("Counterweight") as RigidBody2D
	projectile_body = trebuchet_rig.get_node("Projectile") as RigidBody2D
	joint_pivot = trebuchet_rig.get_node("JointPivot") as PinJoint2D
	joint_counterweight = trebuchet_rig.get_node("JointCounterweight") as PinJoint2D


	sling_line = trebuchet_rig.get_node("SlingLine") as Line2D
	ui_root = _get_or_create_ui_root()
	projectile_body.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
	arm_body.can_sleep = false
	counterweight_body.can_sleep = false
	projectile_body.can_sleep = false
	if joint_pivot:
		joint_pivot.disable_collision = true
		joint_pivot.softness = 0.0
	if joint_counterweight:
		joint_counterweight.softness = 0.0
		joint_counterweight.disable_collision = true
	arm_body.gravity_scale = grav_scale
	counterweight_body.gravity_scale = grav_scale
	projectile_body.gravity_scale = grav_scale

func _physics_process(_delta: float) -> void:
	if not projectile_body:
		return
	var global_pos: Vector2 = projectile_body.global_position
	projectile_position = _to_simulation(global_pos)
	projectile_velocity = projectile_body.linear_velocity
	if is_projectile_active:
		_check_release_condition()
		_append_trail_point()
		_check_castle_hits()
		if released:
			projectile_body.apply_central_force(Vector2(slider_state["wind"] * WIND_FORCE_SCALE, 0.0))
		if projectile_position.y >= GROUND_CHECK_Y:
			_finalize_shot()
	else:
		projectile_position = _projectile_start_pos()
	_update_sling_line()

func _get_or_create_ui_root() -> Control:
	var canvas_layer := get_node_or_null("CanvasLayer") as CanvasLayer
	if not canvas_layer:
		canvas_layer = CanvasLayer.new()
		canvas_layer.name = "CanvasLayer"
		add_child(canvas_layer)
	var ui := canvas_layer.get_node_or_null("UI") as Control
	if not ui:
		ui = Control.new()
		ui.name = "UI"
		canvas_layer.add_child(ui)
	ui.anchor_left = 0.0
	ui.anchor_top = 0.0
	ui.anchor_right = 1.0
	ui.anchor_bottom = 1.0
	ui.offset_left = 0.0
	ui.offset_top = 0.0
	ui.offset_right = 0.0
	ui.offset_bottom = 0.0
	ui.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ui.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return ui

func _setup_ui() -> void:
	for child in ui_root.get_children():
		child.queue_free()
	var panel := PanelContainer.new()
	panel.name = "UIPanel"
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_top = 0.0
	panel.anchor_bottom = 1.0
	panel.offset_left = -340.0
	panel.offset_right = -10.0
	panel.offset_top = 10.0
	panel.offset_bottom = -10.0

	var scroll := ScrollContainer.new()
	scroll.name = "ScrollContainer"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)

	var vbox := VBoxContainer.new()
	vbox.name = "VBox"
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.alignment = BoxContainer.ALIGNMENT_BEGIN
	scroll.add_child(vbox)
	ui_root.add_child(panel)

	var title := Label.new()
	title.text = "Trebuchet Controls"
	title.add_theme_font_size_override("font_size", 20)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)
	vbox.add_child(_make_separator())

	for key in ["counter", "projectile", "arm", "draw", "wind"]:
		_create_slider(vbox, key)

	vbox.add_child(_make_separator())

	range_label = Label.new()
	range_label.name = "RangeLabel"
	range_label.text = "Est. Range: 0 m"
	vbox.add_child(range_label)

	var button_container := HBoxContainer.new()
	button_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_child(button_container)

	fire_button = Button.new()
	fire_button.text = "FIRE!"
	fire_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fire_button.pressed.connect(_fire)
	button_container.add_child(fire_button)

	reset_button = Button.new()
	reset_button.text = "RESET"
	reset_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	reset_button.pressed.connect(_manual_reset)
	button_container.add_child(reset_button)

	score_label = Label.new()
	score_label.name = "ScoreLabel"
	score_label.text = "Score: 0 | High: 0"
	vbox.add_child(score_label)

	var hint := Label.new()
	hint.text = "Adjust sliders, watch preview, then launch."
	hint.add_theme_font_size_override("font_size", 11)
	hint.modulate = Color(0.8, 0.8, 0.8, 0.8)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(hint)

func _create_slider(vbox: VBoxContainer, key: String) -> void:
	var meta: Dictionary = SLIDER_META[key]
	var label := Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	vbox.add_child(label)

	var slider := HSlider.new()
	slider.min_value = meta["min"]
	slider.max_value = meta["max"]
	slider.step = meta["step"]
	slider.value = slider_state[key]
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.value_changed.connect(func(value: float) -> void:
		_on_slider_changed(key, value)
	)

	slider_refs[key] = {"label": label, "slider": slider, "format": meta["format"]}
	_update_slider_label(key, slider_state[key])

	vbox.add_child(slider)

func _make_separator() -> HSeparator:
	var sep := HSeparator.new()
	sep.custom_minimum_size = Vector2(0, 8)
	return sep

func _update_slider_label(key: String, value: float) -> void:
	var entry: Dictionary = slider_refs.get(key, {})
	if entry.has("label") and entry.has("format"):
		var lbl: Label = entry["label"]
		var fmt: String = entry["format"]
		if lbl:
			lbl.text = fmt % value

func _on_slider_changed(key: String, value: float) -> void:
	slider_state[key] = value
	_update_slider_label(key, value)
	if not is_projectile_active:
		_configure_rig_from_sliders()
		_reset_projectile_state()
	_update_trajectory()

func _fire() -> void:
	if is_projectile_active:
		return
	_configure_rig_from_sliders()
	_cock_trebuchet()
	_set_bodies_frozen(false)
	for body in [arm_body, counterweight_body, projectile_body]:
		if body:
			body.sleeping = false
	is_projectile_active = true
	armed = true
	released = false
	projectile_start = _projectile_start_pos()
	projectile_position = projectile_start
	projectile_trail.clear_points()
	projectile_trail.add_point(projectile_position)
	last_trail_point = projectile_position
	score = 0
	_update_score_label()
	fire_button.disabled = true

func _append_trail_point() -> void:
	if projectile_trail.get_point_count() == 0:
		projectile_trail.add_point(projectile_position)
		last_trail_point = projectile_position
		return
	if projectile_position.distance_to(last_trail_point) >= TRAIL_POINT_DISTANCE:
		projectile_trail.add_point(projectile_position)
		last_trail_point = projectile_position
		if projectile_trail.get_point_count() > 120:
			projectile_trail.remove_point(0)

func _projectile_start_pos() -> Vector2:
	if not arm_body:
		return Vector2.ZERO
	var global_pos: Vector2 = arm_body.to_global(Vector2(0, arm_long_length_px + sling_length_px))
	return _to_simulation(global_pos)

func _estimate_release_velocity_vector() -> Vector2:
	var total_len: float = float(slider_state["arm"])
	var draw_deg: float = float(slider_state["draw"])
	var short_len: float = max(total_len * 0.2, 0.5)
	var draw_rad: float = deg_to_rad(draw_deg)
	var drop_height: float = short_len * (1.0 - cos(draw_rad))
	var energy: float = float(slider_state["counter"]) * GRAVITY * drop_height
	var effective_mass: float = float(slider_state["projectile"]) + (total_len * 5.0)
	var efficiency: float = 0.65 + clamp((total_len - 8.0) * 0.02, -0.1, 0.2)
	var tip_speed: float = sqrt(max(2.0 * energy * efficiency / max(effective_mass, 0.1), 0.0))
	var sling_gain: float = (total_len - short_len) / total_len
	var release_angle: float = deg_to_rad(clamp(draw_deg * 0.45, 15.0, 75.0))
	var px_speed: float = tip_speed * sling_gain * EFFECTIVE_PPM
	return Vector2(cos(release_angle) * px_speed, -sin(release_angle) * px_speed)

func _update_trajectory() -> void:
	var start := _projectile_start_pos()
	var vel := _estimate_release_velocity_vector()
	var pos := start
	var points := PackedVector2Array([start])
	var final_x: float = start.x
	var proj_mass: float = float(slider_state["projectile"])
	var wind_force: float = float(slider_state["wind"]) * WIND_FORCE_SCALE
	var wind_accel: float = wind_force / proj_mass if proj_mass > 0 else 0.0
	for _i in range(SIM_STEPS):
		vel.y += (GRAVITY * EFFECTIVE_PPM) * TRAJECTORY_DT
		vel.x += wind_accel * TRAJECTORY_DT
		pos += vel * TRAJECTORY_DT
		if pos.y >= GROUND_CHECK_Y:
			pos.y = GROUND_CHECK_Y
			points.append(pos)
			final_x = pos.x
			break
		points.append(pos)
		final_x = pos.x
	trajectory_line.points = points
	var meters: float = max((final_x - start.x) / EFFECTIVE_PPM, 0.0)
	if range_label:
		range_label.text = "Est. Range: %.1f m" % meters

func _build_ground() -> void:
	if not ground_root:
		return
	for child in ground_root.get_children():
		child.queue_free()
	ground_root.z_index = -10
	var sky := Polygon2D.new()
	sky.z_index = -20
	sky.color = Color(0.18, 0.28, 0.42)
	sky.polygon = _rect_polygon(Vector2(1920, 960))
	sky.position = Vector2(960, 360)
	ground_root.add_child(sky)

	var ground := Polygon2D.new()
	ground.z_index = -15
	ground.color = Color(0.32, 0.26, 0.2)
	ground.polygon = _rect_polygon(Vector2(1920, 120))
	ground.position = Vector2(960, GROUND_Y + 40)
	ground_root.add_child(ground)

func _build_castle() -> void:
	if not castle_root:
		return
	for child in castle_root.get_children():
		child.queue_free()
	castle_bricks.clear()
	var base: Vector2 = Vector2(560.0, GROUND_Y - BRICK_SIZE.y * 0.5 - 4.0)
	for row in range(BRICK_ROWS):
		for col in range(BRICK_COLUMNS):
			var brick: Polygon2D = Polygon2D.new()
			var color: Color = Color(0.55 - row * 0.03, 0.34, 0.23)
			brick.color = color
			brick.polygon = _rect_polygon(BRICK_SIZE)
			var offset_x: float = (col - (BRICK_COLUMNS - 1) / 2.0) * (BRICK_SIZE.x + BRICK_PADDING.x)
			var pos: Vector2 = base + Vector2(offset_x, -row * (BRICK_SIZE.y + BRICK_PADDING.y))
			brick.position = pos
			castle_root.add_child(brick)
			castle_bricks.append({
				"node": brick,
				"size": BRICK_SIZE,
				"color": color,
				"destroyed": false,
			})

func _rect_polygon(size: Vector2) -> PackedVector2Array:
	var half: Vector2 = size * 0.5
	var polygon := PackedVector2Array()
	polygon.append(Vector2(-half.x, -half.y))
	polygon.append(Vector2(half.x, -half.y))
	polygon.append(Vector2(half.x, half.y))
	polygon.append(Vector2(-half.x, half.y))
	return polygon

func _configure_rig_from_sliders() -> void:
	var arm_total_m: float = float(slider_state["arm"])
	var short_m: float = float(clamp(arm_total_m * 0.28, MIN_SHORT_METERS, max(arm_total_m - 0.5, MIN_SHORT_METERS)))
	var long_m: float = float(max(arm_total_m - short_m, 1.5))
	var px_scale: float = effective_px_scale
	arm_short_length_px = short_m * px_scale
	arm_long_length_px = long_m * px_scale
	sling_length_px = clamp(long_m * 0.9 * px_scale, 60.0, 280.0)
	release_angle_tolerance_deg = RELEASE_TOLERANCE_DEG
	if counterweight_body:
		counterweight_body.mass = slider_state["counter"]
	if projectile_body:
		projectile_body.mass = slider_state["projectile"]
	if arm_body:
		arm_body.mass = clamp(arm_total_m * 4.0, 8.0, 200.0)
	_update_arm_shape()
	_update_joint_targets()
	arm_body.gravity_scale = grav_scale
	counterweight_body.gravity_scale = grav_scale
	projectile_body.gravity_scale = grav_scale

func _update_arm_shape() -> void:
	if not arm_shape:
		return
	var rect := arm_shape.shape as RectangleShape2D
	if rect:
		rect.size = Vector2(rect.size.x, arm_short_length_px + arm_long_length_px)
	arm_shape.position.y = (arm_long_length_px - arm_short_length_px) * 0.5

func _update_joint_targets() -> void:
	if joint_counterweight and arm_body and trebuchet_rig:
		var hinge_global := arm_body.to_global(Vector2(0, -arm_short_length_px))
		joint_counterweight.position = trebuchet_rig.to_local(hinge_global)
		joint_counterweight.disable_collision = true


func _cock_trebuchet() -> void:
	if not arm_body or not projectile_body:
		return
	
	# 1. Set Arm Angle
	var cock_angle: float = - float(clamp(slider_state["draw"], 40.0, 120.0))
	_set_bodies_frozen(true)
	arm_body.rotation_degrees = cock_angle
	arm_body.linear_velocity = Vector2.ZERO
	arm_body.angular_velocity = 0.0
	
	# 2. Position Counterweight
	var counter_anchor_global := arm_body.to_global(Vector2(0, -arm_short_length_px))
	var counter_local := trebuchet_rig.to_local(counter_anchor_global + Vector2(0, -COUNTER_HINGE_DROP))
	counterweight_body.position = counter_local
	counterweight_body.linear_velocity = Vector2.ZERO
	counterweight_body.angular_velocity = 0.0
	
	# 3. Calculate Projectile & Sling Position (IK)
	var tip_global := _arm_tip_global()
	var ground_y_local := trebuchet_rig.to_local(Vector2(0, GROUND_CHECK_Y - PROJ_RADIUS)).y
	var tip_local := trebuchet_rig.to_local(tip_global)
	
	# Default: Hanging straight down
	var proj_local := tip_local + Vector2(0, sling_length_px)
	
	# Ground collision check (Circle-Line intersection)
	if proj_local.y > ground_y_local:
		var dy := ground_y_local - tip_local.y
		# If arm tip is below ground (unlikely but possible), clamp
		if dy < 0:
			proj_local = Vector2(tip_local.x, ground_y_local)
		elif dy < sling_length_px:
			# Calculate horizontal offset to maintain sling length
			var dx := sqrt(sling_length_px * sling_length_px - dy * dy)
			# Place projectile "behind" the swing direction (to the right if arm is cocked left/up)
			# Arm is cocked negative degrees (left/up). Swing goes right.
			# Projectile usually drags behind.
			proj_local = Vector2(tip_local.x + dx, ground_y_local)
	
	projectile_body.position = proj_local
	projectile_body.rotation = 0.0
	projectile_body.linear_velocity = Vector2.ZERO
	projectile_body.angular_velocity = 0.0
	
	# 4. Rebuild Sling Rig
	_rebuild_sling_rig(tip_local, proj_local)
	
	_update_joint_targets()
	sling_attached = true
	released = false
	armed = false


func _set_bodies_frozen(flag: bool) -> void:
	for body in [arm_body, counterweight_body, projectile_body]:
		if body:
			body.freeze = flag
			if flag:
				body.sleeping = true
	if sling_body and is_instance_valid(sling_body):
		sling_body.freeze = flag
		if flag:
			sling_body.sleeping = true


func _rebuild_sling_rig(tip_local: Vector2, proj_local: Vector2) -> void:
	# Cleanup old rig
	if sling_body and is_instance_valid(sling_body):
		sling_body.queue_free()
	if joint_arm_sling and is_instance_valid(joint_arm_sling):
		joint_arm_sling.queue_free()
	if joint_sling_proj and is_instance_valid(joint_sling_proj):
		joint_sling_proj.queue_free()
	
	sling_body = null
	joint_arm_sling = null
	joint_sling_proj = null
	
	# Create single rigid sling body
	var sling_vec := proj_local - tip_local
	var sling_len := sling_vec.length()
	var angle := sling_vec.angle()
	
	sling_body = RigidBody2D.new()
	sling_body.name = "SlingBody"
	sling_body.mass = 0.5 # Light but not massless
	sling_body.gravity_scale = grav_scale
	sling_body.linear_damp = 0.05
	sling_body.angular_damp = 0.05
	sling_body.collision_layer = 0
	sling_body.collision_mask = 0
	
	# Position at midpoint
	var midpoint := (tip_local + proj_local) * 0.5
	sling_body.position = midpoint
	sling_body.rotation = angle + PI / 2
	
	# Shape for mass distribution
	var shape := RectangleShape2D.new()
	shape.size = Vector2(SLING_SEGMENT_WIDTH, sling_len)
	var coll := CollisionShape2D.new()
	coll.shape = shape
	sling_body.add_child(coll)
	
	trebuchet_rig.add_child(sling_body)
	
	# Pin joint: Arm -> Sling (at arm tip)
	joint_arm_sling = PinJoint2D.new()
	joint_arm_sling.name = "JointArmSling"
	joint_arm_sling.node_a = arm_body.get_path()
	joint_arm_sling.node_b = sling_body.get_path()
	joint_arm_sling.position = tip_local
	joint_arm_sling.disable_collision = true
	joint_arm_sling.softness = 0.0
	trebuchet_rig.add_child(joint_arm_sling)
	
	# Pin joint: Sling -> Projectile (at projectile)
	joint_sling_proj = PinJoint2D.new()
	joint_sling_proj.name = "JointSlingProj"
	joint_sling_proj.node_a = sling_body.get_path()
	joint_sling_proj.node_b = projectile_body.get_path()
	joint_sling_proj.position = proj_local
	joint_sling_proj.disable_collision = true
	joint_sling_proj.softness = 0.0
	trebuchet_rig.add_child(joint_sling_proj)


func _release_projectile() -> void:
	released = true
	sling_attached = false
	if joint_sling_proj and is_instance_valid(joint_sling_proj):
		joint_sling_proj.queue_free()
		joint_sling_proj = null


func _check_release_condition() -> void:
	if released or not armed:
		return
	# Release when arm is perpendicular to ground (pointing straight up)
	# This is when the arm's rotation is approximately 90 degrees (PI/2 radians)
	var arm_angle_deg: float = rad_to_deg(arm_body.rotation)
	# Normalize to -180 to 180 range
	while arm_angle_deg > 180.0:
		arm_angle_deg -= 360.0
	while arm_angle_deg < -180.0:
		arm_angle_deg += 360.0
	
	# Release when arm is vertical (90 degrees ± tolerance)
	# Since arm starts at negative angle and swings up, we check for 90 degrees
	if abs(arm_angle_deg - 90.0) <= release_angle_tolerance_deg:
		_release_projectile()


func _update_sling_line() -> void:
	if not sling_line or not arm_body:
		return
	var points := PackedVector2Array()
	points.append(trebuchet_rig.to_local(_arm_tip_global()))
	
	if sling_attached and sling_body and is_instance_valid(sling_body):
		points.append(trebuchet_rig.to_local(projectile_body.global_position))
	else:
		points.append(trebuchet_rig.to_local(_arm_tip_global()))
	
	sling_line.points = points


func _arm_tip_global() -> Vector2:
	return arm_body.to_global(Vector2(0, arm_long_length_px))

func _to_simulation(global_pos: Vector2) -> Vector2:
	return simulation_root.to_local(global_pos)

func _reset_projectile_state() -> void:
	is_projectile_active = false
	armed = false
	released = false
	projectile_trail.clear_points()
	_cock_trebuchet()
	projectile_position = _projectile_start_pos()
	projectile_start = projectile_position
	last_trail_point = projectile_position

func _check_castle_hits() -> void:
	var proj_global := projectile_body.global_position
	for brick in castle_bricks:
		if brick["destroyed"]:
			continue
		var node: Polygon2D = brick["node"]
		var brick_size: Vector2 = brick["size"]
		var half: Vector2 = brick_size * 0.5
		var rect := Rect2(node.global_position - half, brick_size)
		if rect.grow(PROJ_RADIUS).has_point(proj_global):
			_destroy_brick(brick)

func _destroy_brick(brick: Dictionary) -> void:
	brick["destroyed"] = true
	var node: Polygon2D = brick["node"]
	node.color = (brick["color"] as Color).darkened(0.4)
	score += 5
	_update_score_label()

func _finalize_shot() -> void:
	if not is_projectile_active:
		return
	is_projectile_active = false
	armed = false
	fire_button.disabled = false
	reset_button.disabled = false
	_set_bodies_frozen(true)
	projectile_body.sleeping = true
	arm_body.can_sleep = true
	counterweight_body.can_sleep = true
	projectile_body.can_sleep = true
	var distance_m: float = max((projectile_position.x - projectile_start.x) / EFFECTIVE_PPM, 0.0)
	score += int(distance_m)
	_update_score_label()
	if score > high_score:
		high_score = score
		_save_high_score()
	_reset_after_delay()

func _reset_after_delay() -> void:
	await get_tree().create_timer(1.2).timeout
	_reset_castle()
	score = 0
	_update_score_label()
	_reset_projectile_state()
	_update_trajectory()

func _reset_castle() -> void:
	for brick in castle_bricks:
		brick["destroyed"] = false
		var node: Polygon2D = brick["node"]
		node.color = brick["color"]

func _update_score_label() -> void:
	if score_label:
		score_label.text = "Score: %d | High: %d" % [score, high_score]

func _load_high_score() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SCORE_FILE)
	if err == OK:
		high_score = cfg.get_value("scores", "high", 0)
	else:
		high_score = 0

func _save_high_score() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("scores", "high", high_score)
	cfg.save(SCORE_FILE)

func _manual_reset() -> void:
	if is_projectile_active:
		is_projectile_active = false
		_set_bodies_frozen(true)
	_reset_castle()
	score = 0
	_update_score_label()
	_reset_projectile_state()
	_update_trajectory()
	fire_button.disabled = false
	reset_button.disabled = false
