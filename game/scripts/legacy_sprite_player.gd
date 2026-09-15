extends Node2D
class_name LegacySpritePlayer

# Diagnostic-only player for converted ANI/SPR resources.
# Playback speed is intentionally not claimed to match the original client;
# M2 must verify ANI raw_timing units before gameplay timing is frozen.

@export var class_id: int = 100
@export var action_slot: String = "00"
@export_range(0, 7, 1) var direction_slot: int = 0
@export var diagnostic_frame_seconds: float = 0.12

var _sprite := Sprite2D.new()
var _animation: Dictionary = {}
var _frame_cursor := 0
var _elapsed := 0.0

func _ready() -> void:
    add_child(_sprite)
    _sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    load_action(action_slot)

func load_action(slot: String) -> void:
    action_slot = slot
    var base := "res://generated/characters/B%03d/%s" % [class_id, action_slot]
    var file := FileAccess.open(base + "/animation.json", FileAccess.READ)
    if file == null:
        push_warning("Missing generated animation: %s" % base)
        _animation = {}
        _sprite.texture = null
        return
    var parsed = JSON.parse_string(file.get_as_text())
    if typeof(parsed) != TYPE_DICTIONARY:
        push_error("Invalid animation JSON: %s" % base)
        return
    _animation = parsed
    _frame_cursor = 0
    _elapsed = 0.0
    _apply_frame()

func set_direction(slot: int) -> void:
    direction_slot = clampi(slot, 0, 7)
    _frame_cursor = 0
    _apply_frame()

func _process(delta: float) -> void:
    if _animation.is_empty():
        return
    var directions: Array = _animation.get("directions", [])
    if direction_slot >= directions.size():
        return
    var frames: Array = directions[direction_slot]
    if frames.is_empty():
        return
    _elapsed += delta
    if _elapsed >= diagnostic_frame_seconds:
        _elapsed = fmod(_elapsed, diagnostic_frame_seconds)
        _frame_cursor = (_frame_cursor + 1) % frames.size()
        _apply_frame()

func _apply_frame() -> void:
    if _animation.is_empty():
        return
    var directions: Array = _animation.get("directions", [])
    if direction_slot >= directions.size():
        return
    var frames: Array = directions[direction_slot]
    if frames.is_empty():
        return
    _frame_cursor %= frames.size()
    var frame_index: int = int(frames[_frame_cursor])
    var path := "res://generated/characters/B%03d/%s/frames/frame-%03d.png" % [class_id, action_slot, frame_index]
    if not ResourceLoader.exists(path):
        push_warning("Missing converted frame: %s" % path)
        return
    _sprite.texture = load(path)

    # SPR bounds are relative to the actor anchor. The exported PNG is cropped
    # to those bounds, so place its center at the center of the original bounds.
    var bounds: Array = _animation.get("frame_bounds", [])
    if frame_index < bounds.size():
        var b: Dictionary = bounds[frame_index]
        _sprite.position = Vector2(
            (float(b["left"]) + float(b["right"])) * 0.5,
            (float(b["top"]) + float(b["bottom"])) * 0.5
        )
