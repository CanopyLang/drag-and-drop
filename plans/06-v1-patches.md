# v1 Patches: Critical Fixes to Shipped Code

These are fixes to the already-implemented v1 modules. They address fundamental design gaps discovered during competitive research. Should be done before any Phase 1 work.

## Tasks

### P.1 Type-Based Accept System
**Priority: Critical**

Every DnD library has this. Draggables declare a type, droppables declare which types they accept. Without this, a kanban card can be dropped on a tree node zone, a file drop zone, or any other droppable.

**Changes:**
- [ ] Add `itemType : String` field to `DragItem id` record
- [ ] Add `accept : Maybe (List String)` to droppable configuration (`Nothing` = accept all)
- [ ] `DnD.Collision.detect` filters out targets that don't accept the active item's type before running collision algorithm
- [ ] `DnD.Droppable.droppable` takes optional accept list
- [ ] `DnD.Draggable.draggable` takes optional type string (default: `"default"`)
- [ ] `DnD.Draggable.withType : String -> Attributes msg -> Attributes msg`

**Tests:**
- [ ] Droppable with `accept = Just ["card"]` rejects items of type `"column"`
- [ ] Droppable with `accept = Nothing` accepts everything
- [ ] Collision detection skips non-matching targets
- [ ] Default type is `"default"` when unspecified

---

### P.2 Drop Predicates (`canDrop`)
**Priority: Critical**

Business logic validation for drops. WIP limits, permission checks, type constraints beyond string matching.

**Changes:**
- [ ] Add `canDrop : DragItem id -> DropTarget id -> Bool` to `DnD.Config`
- [ ] Default: `\_ _ -> True` (accept all)
- [ ] Collision detection filters out targets where `canDrop` returns `False`
- [ ] `DnD.Droppable.isRejected : id -> State id -> Bool` -- check if item is over this target but rejected
- [ ] Rejected targets get visual feedback (different from active/inactive)

**Tests:**
- [ ] canDrop returning False prevents drop on that target
- [ ] canDrop returning True allows drop
- [ ] isRejected is True when hovering a rejecting target
- [ ] Collision detection skips rejected targets

---

### P.3 Accessibility: `aria-describedby` Instructions
**Priority: Critical**

The most impactful accessibility improvement. Hidden instruction text linked to each draggable.

**Changes:**
- [ ] `DnD.Announcements.viewDragInstructions : String -> Html msg` -- renders a visually-hidden element with instruction text and a stable id
- [ ] `DnD.Announcements.defaultInstructionText : String` -- "Press Space bar to reorder. Use arrow keys to move. Press Space bar to drop. Press Escape to cancel."
- [ ] `DnD.Draggable.draggableAttrs` adds `aria-describedby` pointing to the instruction element's id
- [ ] Remove `aria-dropeffect` from `DnD.Droppable` (deprecated in ARIA 1.1, never implemented by assistive tech)

**Tests:**
- [ ] Draggable has `aria-describedby` attribute
- [ ] Instruction element has matching id
- [ ] Instruction element is visually hidden but screen-reader accessible
- [ ] Droppable no longer has `aria-dropeffect`

---

### P.4 Touch-Specific Sensor Configuration
**Priority: High**

Touch input needs higher activation distance and long-press delay.

**Changes:**
- [ ] Split `PointerConfig.activationDistance` into `mouseActivationDistance` (5px) and `touchActivationDistance` (10px)
- [ ] Add `touchActivationDelay` (250ms) -- long-press before drag activates on touch
- [ ] Sensor detects input type from `pointerType` field of PointerEvent (`"mouse"`, `"touch"`, `"pen"`)
- [ ] Apply appropriate config based on detected input type

**Tests:**
- [ ] Mouse drag starts after 5px movement
- [ ] Touch drag starts after 10px movement AND 250ms delay
- [ ] Pen drag starts after 5px movement
- [ ] Quick tap on touch device does NOT start drag

---

### P.5 `requestAnimationFrame` Throttling
**Priority: High**

Prevent wasted computation from high-frequency pointermove events.

**Changes:**
- [ ] In FFI: pointermove handler sets a dirty flag + caches latest event
- [ ] rAF callback reads the cached event and dispatches to Canopy only once per frame
- [ ] Ensures max 60 updates/second regardless of pointer event frequency

**FFI changes to `dnd.js`:**
```javascript
let pendingMove = null;
let rafId = null;

function onPointerMove(event) {
    pendingMove = event;
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            rafId = null;
            if (pendingMove) {
                dispatchToCanopy(pendingMove);
                pendingMove = null;
            }
        });
    }
}
```

---

## Summary

| Task | Priority | Scope |
|------|----------|-------|
| P.1 Type-based accept | Critical | DnD, Collision, Draggable, Droppable |
| P.2 Drop predicates | Critical | DnD, Collision, Droppable |
| P.3 aria-describedby | Critical | Announcements, Draggable, Droppable |
| P.4 Touch sensor config | High | Sensor |
| P.5 rAF throttling | High | FFI (dnd.js) |

**Total estimated changes: ~200 lines across existing modules + FFI**

These patches are backward-compatible additions (new optional fields with defaults). Existing user code continues to work unchanged.
