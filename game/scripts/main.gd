extends Node2D

const ACTIONS := ["00", "01", "02", "03", "05"]

@onready var swordsman: LegacySpritePlayer = $Swordsman
@onready var wizard: LegacySpritePlayer = $Wizard
@onready var status_label: Label = $HUD/Status

var _action_index := 0
var _action_elapsed := 0.0

func _ready() -> void:
    var map_path := "res://generated/maps/map-0000.png"
    if ResourceLoader.exists(map_path):
        $Map.texture = load(map_path)
        $Map.centered = false
        status_label.text = "对练场 / B100 + B109 diagnostic · action 00 · timing 未经 M2 验证"
    else:
        status_label.text = "缺少 game/generated。先运行 tools/prepare_prototype.py 生成私有派生资源。"

func _process(delta: float) -> void:
    # Visual diagnostic only: rotate through raw action slots so idle/walk/
    # attack/hit/special conversion can be inspected without claiming original
    # gameplay timing or state transitions.
    _action_elapsed += delta
    if _action_elapsed >= 3.0:
        _action_elapsed = 0.0
        _action_index = (_action_index + 1) % ACTIONS.size()
        var slot := ACTIONS[_action_index]
        swordsman.load_action(slot)
        wizard.load_action(slot)
        status_label.text = "对练场 / B100 + B109 diagnostic · action %s · timing 未经 M2 验证" % slot
