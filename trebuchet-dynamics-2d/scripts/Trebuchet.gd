extends Node2D

const PIXELS_PER_METER := 6.0
const GROUND_Y := 520.0
const GRAVITY := 9.81
const WIND_FORCE_SCALE := 3.2
const SIM_STEPS := 220
const TRAJECTORY_DT := 0.03
const TRAIL_POINT_DISTANCE := 6.0
const BRICK_COLUMNS := 4
const BRICK_ROWS := 3
const BRICK_SIZE := Vector2(48, 24)
const BRICK_PADDING := Vector2(8, 6)
const SCORE_FILE := "user://scores.cfg"

var slider_state := {
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
    "wind": {"title": "Wind Force (m/s)", "min": -20.0, "max": 20.0, "step": 1.0, "format": "Wind: %.0f m/s"},
}

var slider_refs := {}
var range_label: Label
var score_label: Label
var fire_button: Button

var projectile_position := Vector2.ZERO
var projectile_velocity := Vector2.ZERO
var projectile_start := Vector2.ZERO
var is_projectile_active := false
var last_trail_point := Vector2.ZERO
var score := 0
var high_score := 0

var castle_bricks: Array = []

@onready var ground_root: Node2D = $Simulation/GroundRoot
@onready var castle_root: Node2D = $Simulation/CastleRoot
@onready var projectile_node: Node2D = $Simulation/Projectile
@onready var projectile_trail: Line2D = $Simulation/ProjectileTrail
@onready var trajectory_line: Line2D = $Simulation/TrajectoryLine
@onready var ui_root: Control = $CanvasLayer/UI

func _ready() -> void:
    _build_ground()
    _build_castle()
    _setup_ui()
    _load_high_score()
    _reset_projectile()
    _update_score_label()
    _update_trajectory()

func _physics_process(delta: float) -> void:
    if is_projectile_active:
        projectile_velocity.y += (GRAVITY * PIXELS_PER_METER) * delta
        projectile_velocity.x += slider_state.wind * WIND_FORCE_SCALE * delta
        projectile_position += projectile_velocity * delta
        if projectile_position.y >= GROUND_Y:
            projectile_position.y = GROUND_Y
            _finalize_shot()
        _append_trail_point()
        _check_castle_hits()
        _update_projectile_node()
    else:
        projectile_position = _projectile_start_pos()
        _update_projectile_node()

func _setup_ui() -> void:
    for child in ui_root.get_children():
        child.queue_free()
    var panel := PanelContainer.new()
    panel.name = "UIPanel"
    panel.anchor_left = 1.0
    panel.anchor_right = 1.0
    panel.anchor_top = 0.0
    panel.anchor_bottom = 0.0
    panel.offset_left = -360.0
    panel.offset_right = -20.0
    panel.offset_top = 24.0
    panel.offset_bottom = 0.0
    var vbox := VBoxContainer.new()
    vbox.name = "VBox"
    vbox.custom_minimum_size = Vector2(320, 0)
    vbox.alignment = BoxContainer.ALIGNMENT_BEGIN
    panel.add_child(vbox)
    ui_root.add_child(panel)

    var title := Label.new()
    title.text = "Trebuchet Controls"
    title.add_theme_font_size_override("font_size", 22)
    vbox.add_child(title)
    vbox.add_child(_make_separator())

    for key in ["counter", "projectile", "arm", "draw", "wind"]:
        _create_slider(vbox, key)

    vbox.add_child(_make_separator())

    range_label = Label.new()
    range_label.name = "RangeLabel"
    range_label.text = "Est. Range: 0 m"
    vbox.add_child(range_label)

    fire_button = Button.new()
    fire_button.text = "FIRE!"
    fire_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    fire_button.pressed.connect(_fire)
    vbox.add_child(fire_button)

    score_label = Label.new()
    score_label.name = "ScoreLabel"
    score_label.text = "Score: 0 | High: 0"
    vbox.add_child(score_label)

    var hint := Label.new()
    hint.text = "Adjust sliders, watch preview, then launch."
    hint.add_theme_font_size_override("font_size", 12)
    hint.modulate = Color(0.8, 0.8, 0.8, 0.8)
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
        _reset_projectile()
    _update_trajectory()

func _fire() -> void:
    if is_projectile_active:
        return
    is_projectile_active = true
    projectile_start = _projectile_start_pos()
    projectile_position = projectile_start
    projectile_velocity = _estimate_release_velocity_vector()
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
    var base := Vector2(140.0, GROUND_Y - 30.0)
    base.x += (slider_state.arm - 8.0) * 8.0
    base.y -= (slider_state.draw - 90.0) * 0.3
    return base

func _estimate_release_velocity_vector() -> Vector2:
    var total_len := slider_state.arm
    var short_len := max(total_len * 0.2, 0.5)
    var draw_rad := deg_to_rad(slider_state.draw)
    var drop_height := short_len * (1.0 - cos(draw_rad))
    var energy := slider_state.counter * GRAVITY * drop_height
    var effective_mass := slider_state.projectile + (total_len * 5.0)
    var efficiency := 0.65 + clamp((total_len - 8.0) * 0.02, -0.1, 0.2)
    var tip_speed := sqrt(max(2.0 * energy * efficiency / max(effective_mass, 0.1), 0.0))
    var sling_gain := (total_len - short_len) / total_len
    var release_angle := deg_to_rad(clamp(slider_state.draw * 0.45, 15.0, 75.0))
    var px_speed := tip_speed * sling_gain * PIXELS_PER_METER
    return Vector2(cos(release_angle) * px_speed, -sin(release_angle) * px_speed)

func _update_projectile_node() -> void:
    projectile_node.position = projectile_position

func _update_trajectory() -> void:
    var start := _projectile_start_pos()
    var vel := _estimate_release_velocity_vector()
    var pos := start
    var points := PackedVector2Array()
    points.append(start)
    var final_x := start.x
    for i in SIM_STEPS:
        vel.y += (GRAVITY * PIXELS_PER_METER) * TRAJECTORY_DT
        vel.x += slider_state.wind * WIND_FORCE_SCALE * TRAJECTORY_DT
        pos += vel * TRAJECTORY_DT
        if pos.y >= GROUND_Y:
            pos.y = GROUND_Y
            points.append(pos)
            final_x = pos.x
            break
        points.append(pos)
        final_x = pos.x
    trajectory_line.points = points
    var meters := max((final_x - start.x) / PIXELS_PER_METER, 0.0)
    if range_label:
        range_label.text = "Est. Range: %.1f m" % meters

func _build_ground() -> void:
    for child in ground_root.get_children():
        child.queue_free()
    var sky := Polygon2D.new()
    sky.color = Color(0.18, 0.28, 0.42)
    sky.polygon = _rect_polygon(Vector2(1920, 960))
    sky.position = Vector2(960, 360)
    ground_root.add_child(sky)

    var ground := Polygon2D.new()
    ground.color = Color(0.32, 0.26, 0.2)
    ground.polygon = _rect_polygon(Vector2(1920, 120))
    ground.position = Vector2(960, GROUND_Y + 40)
    ground_root.add_child(ground)

func _build_castle() -> void:
    for child in castle_root.get_children():
        child.queue_free()
    castle_bricks.clear()
    var base := Vector2(560.0, GROUND_Y - BRICK_SIZE.y * 0.5 - 4.0)
    for row in range(BRICK_ROWS):
        for col in range(BRICK_COLUMNS):
            var brick := Polygon2D.new()
            var color := Color(0.55 - row * 0.03, 0.34, 0.23)
            brick.color = color
            brick.polygon = _rect_polygon(BRICK_SIZE)
            var offset_x := (col - (BRICK_COLUMNS - 1) / 2.0) * (BRICK_SIZE.x + BRICK_PADDING.x)
            var pos := base - Vector2(-offset_x, row * (BRICK_SIZE.y + BRICK_PADDING.y))
            brick.position = pos
            castle_root.add_child(brick)
            castle_bricks.append({
                "node": brick,
                "size": BRICK_SIZE,
                "color": color,
                "destroyed": false,
            })

func _rect_polygon(size: Vector2) -> PackedVector2Array:
    var half := size * 0.5
    var polygon := PackedVector2Array()
    polygon.append(Vector2(-half.x, -half.y))
    polygon.append(Vector2(half.x, -half.y))
    polygon.append(Vector2(half.x, half.y))
    polygon.append(Vector2(-half.x, half.y))
    return polygon

func _reset_projectile() -> void:
    projectile_start = _projectile_start_pos()
    projectile_position = projectile_start
    projectile_velocity = Vector2.ZERO
    is_projectile_active = false
    projectile_trail.clear_points()
    _update_projectile_node()

func _check_castle_hits() -> void:
    var radius := 12.0
    for brick in castle_bricks:
        if brick["destroyed"]:
            continue
        var node: Polygon2D = brick["node"]
        var half := brick["size"] * 0.5
        var rect := Rect2(node.global_position - half, brick["size"])
        if rect.grow(radius).has_point(projectile_position):
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
    var distance_m := max((projectile_position.x - projectile_start.x) / PIXELS_PER_METER, 0.0)
    score += int(distance_m)
    _update_score_label()
    if score > high_score:
        high_score = score
        _save_high_score()
    fire_button.disabled = false
    _reset_after_delay()

func _reset_after_delay() -> void:
    await get_tree().create_timer(1.2).timeout
    _reset_castle()
    score = 0
    _update_score_label()
    _reset_projectile()
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
