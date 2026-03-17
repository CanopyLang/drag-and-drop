# Gap Analysis: Features Missing from canopy/dnd

Deep research across React (react-dnd, react-grid-layout, react-mosaic, react-arborist, react-complex-tree, Puck, Craft.js, GrapesJS, Plate/Slate, @hello-pangea/dnd, framer-motion), Vue (VueFlow, vue-grid-layout), Svelte (svelte-dnd-action, neodrag), Angular CDK, and vanilla JS (Muuri, interact.js, Moveable, Dragula, Split.js, Golden Layout) revealed the following gaps in our current plan.

Items marked **(NEW)** are not in any existing plan file. Items marked **(UPGRADE)** are planned but need design improvements based on research.

---

## Critical Gaps (must address)

### 1. (NEW) Type-Based Accept System
**Every reviewed library has this. We don't.**

Draggables declare a `type` string. Droppables declare which types they `accept`. A kanban card can't be dropped on a tree node zone. Currently our collision detection has no concept of types -- anything can drop anywhere.

**Where it goes:** Core `DnD` module (v1 patch)

```canopy
type alias DragItem id =
    { id : id
    , rect : Rect
    , data : Dict String String
    , itemType : String              -- NEW: "card", "column", "tree-node", etc.
    }

-- Droppable config gets an accept filter
droppable : Config id msg -> State id -> id -> { accept : List String } -> Attributes msg

-- Collision detection skips targets that don't accept the active item's type
```

**Prior art:** react-dnd `accept` prop, svelte-dnd-action `type`, SortableJS `group.pull`/`group.put`, Angular CDK `cdkDropListEnterPredicate`

---

### 2. (NEW) Drop Predicates (`canDrop`)
**No way to validate drops beyond collision geometry.**

A droppable should be able to reject a drop based on business logic (WIP limits, permission checks, type validation). Currently the only filtering is collision detection.

**Where it goes:** Core `DnD.Droppable` module (v1 patch)

```canopy
-- Predicate: can this drag item be dropped on this target?
type alias DropPredicate id =
    DragItem id -> DropTarget id -> Bool

-- Extended droppable with predicate
droppableWithPredicate : Config id msg -> State id -> id -> DropPredicate id -> Attributes msg

-- Visual feedback: target shows "rejected" style when predicate returns False
```

**Prior art:** react-dnd `canDrop`, Angular CDK `cdkDropListEnterPredicate` + `cdkDropListSortPredicate`, react-complex-tree `canDropAt`

---

### 3. (UPGRADE) Accessibility: `aria-describedby` Instructions
**The single most impactful a11y improvement missing.**

We use `aria-roledescription="draggable"` but don't provide hidden instruction text ("Press Space bar to reorder") linked via `aria-describedby`. This is the primary way screen readers convey drag instructions. JAWS, NVDA, VoiceOver all support it.

Also: `aria-grabbed` and `aria-dropeffect` are **deprecated** in ARIA 1.1. No assistive technology ever implemented them. We should stop using `aria-dropeffect` in `DnD.Droppable`.

**Where it goes:** `DnD.Draggable` + `DnD.Announcements` (v1 patch)

```canopy
-- Render a visually-hidden instruction element (place once near root)
viewDragInstructions : { id : String, text : String } -> Html msg

-- Default instruction text
defaultInstructions : String
-- "Press Space bar to reorder. Use arrow keys to move. Press Space bar to drop. Press Escape to cancel."

-- Each draggable gets aria-describedby pointing to the instruction element's id
```

**Prior art:** Salesforce SLDS, react-beautiful-dnd, @hello-pangea/dnd, dnd-kit

---

### 4. (NEW) Custom Drag Preview / Overlay Portal
**Our in-place CSS transform is clipped by `overflow: hidden` ancestors.**

We apply `transform: translate()` to the original element. This breaks when the element is inside an `overflow: hidden` container (the dragged item gets clipped). Every major library solves this with a body-level overlay portal.

**Where it goes:** `DnD.Draggable` enhancement (Phase 1)

```canopy
-- Render a drag overlay at the body level, not subject to overflow clipping
-- The original element can be hidden or dimmed during drag
viewOverlay : State id -> (DragItem id -> Delta -> Html msg) -> Html msg

-- Configuration for what happens to the original element during drag
type DragSource
    = TransformInPlace       -- Current behavior (CSS transform, fast, but clips)
    | HideOriginal           -- Hide original, show overlay (like dnd-kit DragOverlay)
    | DimOriginal Float      -- Reduce opacity of original, show overlay
```

**Prior art:** dnd-kit `DragOverlay`, react-dnd `useDragLayer`, Angular CDK `*cdkDragPreview`

---

### 5. (NEW) FLIP Reorder Animation
**Items teleport to new positions instead of animating.**

When items shift to make room for the dragged element, they should animate (FLIP technique). Measure position before change, apply change, calculate delta, animate with `transform: translate()`. This is what makes react-beautiful-dnd and framer-motion feel polished.

**Where it goes:** `DnD.Animation` (Phase 1, extend existing plan)

```canopy
-- FLIP animation for list reorder
-- Call before and after a reorder to animate displaced items
type alias FlipState =
    Dict String Rect  -- id -> rect before change

-- Capture current positions of all items
capturePositions : List id -> (id -> String) -> Cmd (FlipState)

-- After DOM update, animate from old positions to new
animateFlip : FlipState -> SpringConfig -> Cmd msg
```

**Prior art:** framer-motion `layout` prop, svelte-dnd-action `flipDurationMs`, GSAP Flip plugin

---

### 6. (NEW) Consider/Finalize Event Separation
**No preview of where the drop would land.**

svelte-dnd-action's brilliant two-event pattern: `consider` fires when items need to shift to make room (preview), `finalize` fires on actual drop (commit). This lets you show a live preview of the reordered list without committing the change.

**Where it goes:** `DnD.Sortable` enhancement (Phase 1)

```canopy
type alias Config id msg =
    { items : List id
    , onConsider : List id -> msg    -- Preview: items shifted to show where drop would go
    , onFinalize : List id -> msg    -- Commit: user released, apply the reorder
    , ...
    }
```

**Prior art:** svelte-dnd-action `consider`/`finalize`

---

### 7. (NEW) Snap to Elements / Alignment Guides
**We have `snapToGrid` but no dynamic alignment snapping.**

Design tools (Figma, Sketch) show guidelines when dragging an element aligns with another element's edge or center. No DnD library provides this, but Moveable and Konva.js have implementations. This is an opportunity to be unique.

**Where it goes:** New `DnD.Snap` module (Phase 2 or 3)

```canopy
-- Snap configuration
type alias SnapConfig id =
    { targets : List (SnapTarget id)   -- Elements to snap against
    , threshold : Float                -- Snap distance in px (default: 5)
    , showGuides : Bool                -- Render alignment guide lines
    , endOnly : Bool                   -- Only snap at drag end (interact.js pattern)
    }

type SnapTarget id
    = SnapToElement id                 -- Snap to another element's edges/center
    | SnapToGrid { x : Float, y : Float }
    | SnapToCoordinates (List Float) (List Float)  -- Custom x/y snap lines

-- Guide lines visible during drag
type alias GuideLine =
    { orientation : Orientation        -- Horizontal | Vertical
    , position : Float                 -- px offset
    }

-- Detect snapping during drag, return adjusted delta + active guides
detectSnap : SnapConfig id -> DragItem id -> List (DropTarget id) -> Delta -> { delta : Delta, guides : List GuideLine }

-- Render visible alignment guides
viewGuides : List GuideLine -> Html msg
```

**Prior art:** Moveable snappable, Konva.js guides example, Figma alignment

---

### 8. (UPGRADE) Announcements i18n
**Announcements are English-only.**

Our `Announcements.defaults` produces English strings. No mechanism for other languages. @hello-pangea/dnd has full i18n support.

**Where it goes:** `DnD.Announcements` enhancement (Phase 1)

Already partially handled by `Announcements.custom` but we should provide a clearer i18n pattern:

```canopy
-- i18n-ready announcement template
type alias AnnouncementStrings =
    { pickedUp : { item : String, position : Int, total : Int } -> String
    , moved : { item : String, position : Int, total : Int } -> String
    , dropped : { item : String, position : Int, total : Int } -> String
    , cancelled : { item : String, position : Int, total : Int } -> String
    }

-- Construct announcements from translated strings
fromStrings : AnnouncementStrings -> (id -> String) -> Announcements id
```

---

### 9. (NEW) Nested Droppables Resolution Strategy
**No configurable strategy for nested droppable conflicts.**

When droppables are nested (e.g., a card inside a column inside a board), which one "wins"? Currently our collision detection returns whichever matches first with no nesting awareness.

**Where it goes:** `DnD.Collision` enhancement (Phase 1)

```canopy
-- Strategy for resolving nested droppable conflicts
type NestingStrategy
    = InnermostWins       -- Deepest nested droppable wins (most common)
    | OutermostWins       -- Shallowest wins
    | TypePriority (List String)  -- Specific type order wins
    | BubbleUp            -- Try innermost first; if it rejects (canDrop=False), try parent

-- Add to collision detection config
withNestingStrategy : NestingStrategy -> CollisionDetection id -> CollisionDetection id
```

---

### 10. (NEW) Inertia / Momentum After Release
**No inertial throwing.**

interact.js provides momentum after drag release -- the element continues moving with decaying velocity. Useful for free-form canvas interactions and swipe-to-dismiss patterns.

**Where it goes:** `DnD.Animation` or `DnD.Modifier` (Phase 1)

```canopy
-- Inertia configuration
type alias InertiaConfig =
    { resistance : Float     -- Deceleration factor (default: 10)
    , minSpeed : Float       -- Stop when speed drops below this (default: 50 px/s)
    , endOnly : Bool         -- Only apply inertia at drag end (default: True)
    }

-- Modifier that tracks velocity during drag and applies inertia on release
inertia : InertiaConfig -> Modifier id
```

**Prior art:** interact.js inertia, iOS native scroll momentum

---

## High-Impact Gaps

### 11. (NEW) Resize Handles as First-Class Operation
**No concept of resize during drag.**

Grid layouts and page builders need resize. interact.js and Moveable treat resize as a drag variant with different handles. Our `DnD.Grid` plan mentions resize but doesn't design it as a reusable primitive.

**Where it goes:** New `DnD.Resize` module (Phase 2)

```canopy
type ResizeHandle
    = N | S | E | W | NE | NW | SE | SW

type alias ResizeConfig id msg =
    { onResizeStart : ResizeStart id -> msg
    , onResize : ResizeEvent id -> msg
    , onResizeEnd : ResizeEnd id -> msg
    , handles : List ResizeHandle    -- Which handles to show
    , minSize : { width : Float, height : Float }
    , maxSize : { width : Float, height : Float }
    , aspectRatio : Maybe Float      -- Lock aspect ratio
    , snap : Maybe { x : Float, y : Float }  -- Grid snap for resize
    }

type alias ResizeEvent id =
    { id : id
    , handle : ResizeHandle
    , delta : { width : Float, height : Float }
    , rect : Rect                    -- New dimensions
    }

-- Attributes for an element with resize handles
resizable : ResizeConfig id msg -> State id -> id -> { element : Attributes msg, handles : List ( ResizeHandle, Attributes msg ) }
```

**Prior art:** interact.js resize, Moveable resizable, react-grid-layout resize handles, Angular CDK (no resize)

---

### 12. (NEW) Depth-Dependent Tree Drop Targeting
**Unique pattern from react-complex-tree that no other library has.**

When dropping at the end of a subtree, the horizontal position of the cursor determines the nesting depth. Move cursor left = shallower (sibling of parent), move cursor right = deeper (child of last item). This is brilliant UX.

**Where it goes:** `DnD.Tree` enhancement (Phase 2)

```canopy
-- In tree config, add:
type alias Config id msg =
    { ...
    , depthFromCursor : Bool              -- Enable depth-dependent targeting (default: True)
    , renderDepthOffset : Float           -- px per depth level for detection (default: 24, same as indentWidth)
    }

-- When dropping after the last visible child of a subtree:
-- cursor_x relative to the item determines depth level
-- Further right = deeper nesting, further left = shallower
```

**Prior art:** react-complex-tree (only library with this feature)

---

### 13. (NEW) Touch-Specific Sensor Configuration
**Same activation distance for mouse and touch is wrong.**

Touch input is less precise. Default activation distance should be ~10px for touch vs ~5px for mouse. Also: long-press delay for touch (250-300ms) should be the default on touch devices.

**Where it goes:** `DnD.Sensor` patch (v1)

```canopy
type alias PointerConfig =
    { mouseActivationDistance : Float     -- Default: 5px
    , touchActivationDistance : Float     -- Default: 10px
    , touchActivationDelay : Int          -- Default: 250ms (long press)
    , penActivationDistance : Float       -- Default: 5px
    }
```

**Prior art:** dnd-kit separate mouse/touch/keyboard sensors, svelte-dnd-action `delayTouchStart`, SortableJS `touchStartThreshold`

---

### 14. (NEW) Haptic Feedback on Mobile
**No Vibration API integration.**

A brief vibration on drag pickup gives tactile confirmation. Supported on Android + most browsers except Safari.

**Where it goes:** `DnD.Sensor` or FFI (Phase 1)

```canopy
-- Trigger haptic feedback (vibration) on drag start
-- Falls back to no-op on unsupported browsers
hapticFeedback : { duration : Int } -> Cmd msg
```

**FFI:** `navigator.vibrate(duration)` with feature detection.

---

### 15. (NEW) Alternative Non-Drag Interaction Patterns
**Critical for users who cannot drag at all.**

Salesforce SLDS documents 4 patterns: listbox reorder (keyboard), dual listbox (buttons), move-to menu (dropdown), toolbar reorder. We should provide button-based alternatives for every DnD module.

**Where it goes:** Phase 4 a11y audit (already partially planned, needs explicit module)

```canopy
-- Button-based reorder controls (visible or screen-reader-only)
module DnD.Alternatives exposing (..)

-- Sortable: up/down/top/bottom buttons per item
viewSortControls : { moveUp : id -> msg, moveDown : id -> msg } -> id -> Html msg

-- Kanban: "Move to column" dropdown per card
viewMoveToColumn : { columns : List ( columnId, String ), onMove : columnId -> msg } -> Html msg

-- Tree: "Move before/after/into" context menu
viewTreeMoveMenu : { targets : List ( id, String ), onMove : id -> DropPosition -> msg } -> Html msg
```

**Prior art:** Salesforce SLDS, WAI-ARIA best practices

---

### 16. (NEW) Cross-Container Keyboard Navigation
**Can't transfer items between containers via keyboard.**

Currently keyboard DnD only works within a single container. Users should be able to Tab between containers during a keyboard drag to move items across.

**Where it goes:** `DnD.Sensor` keyboard sensor enhancement (Phase 2)

**Prior art:** svelte-dnd-action Tab-between-zones, react-beautiful-dnd cross-list keyboard

---

### 17. (NEW) `requestAnimationFrame` Throttling
**Pointermove fires faster than frame rate.**

Should batch pointermove events to one update per frame via rAF. Prevents wasted computation.

**Where it goes:** FFI / `DnD.Sensor` (v1 patch)

**Prior art:** Pragmatic DnD throttles `onDrag` to rAF, standard web performance pattern

---

## Nice-to-Have Gaps

### 18. (NEW) Binary Tree Layout (Split Panes)
**For tiling window managers.**

react-mosaic and Golden Layout use a binary tree where each split creates two children. Dragging a pane to an edge docks it there. This is a niche but powerful pattern for IDE-like layouts.

**Verdict:** Out of scope for v2. Could be a separate `canopy/layout` package.

---

### 19. (NEW) Drag-to-Create (Rubber Band)
**Draw a rectangle to create a new element.**

Common in design tools, whiteboard apps. Mousedown starts, mousemove draws preview, mouseup creates element. Related to DnD but different interaction model.

**Verdict:** Out of scope. Separate concern from drag-and-drop. Could be in `canopy/canvas`.

---

### 20. (NEW) Lasso/Marquee Selection
**Draw selection rectangle to select multiple items.**

Shift+drag draws a selection rectangle. Items inside (or intersecting) are selected. Three modes: contained, intersected, center-point.

**Verdict:** Belongs in `DnD.MultiSelect` as an additional selection mode. Add to Phase 2 plan.

---

### 21. (NEW) Controlled vs Uncontrolled Mode
**neodrag pattern.**

Uncontrolled: library moves the element, you respond to events. Controlled: you set position programmatically via `{ x, y }`, library only provides event data. Our TEA architecture naturally does "controlled" (state drives view), but explicitly documenting and supporting both patterns would help.

**Verdict:** Already naturally handled by TEA. Document it.

---

### 22. (NEW) `transformDraggedElement` Callback
**svelte-dnd-action: programmatically modify the dragged element's DOM during drag.**

Allows adding classes, changing styles, or modifying content of the dragged element in flight. In our TEA architecture, this is handled by the view function reacting to `isDragging` state. No additional API needed.

**Verdict:** Already covered by TEA's reactive view model.

---

## Summary: What to Add to Each Phase

### v1 Patch (immediate fixes to shipped code)
- Type-based accept system (gap #1)
- Drop predicates / `canDrop` (gap #2)
- `aria-describedby` instructions (gap #3)
- Touch-specific activation distance (gap #13)
- rAF throttling in sensor (gap #17)
- Remove deprecated `aria-dropeffect` (gap #3)

### Phase 1 Additions
- Custom drag preview / overlay portal (gap #4)
- FLIP reorder animation (gap #5)
- Consider/finalize events in Sortable (gap #6)
- Announcements i18n (gap #8)
- Nested droppables resolution (gap #9)
- Inertia/momentum (gap #10)
- Haptic feedback (gap #14)

### Phase 2 Additions
- Snap to elements / alignment guides (gap #7) -- new `DnD.Snap` module
- Resize handles (gap #11) -- new `DnD.Resize` module
- Depth-dependent tree drop targeting (gap #12) -- in `DnD.Tree`
- Cross-container keyboard navigation (gap #16) -- in `DnD.Sensor`
- Lasso/marquee selection (gap #20) -- in `DnD.MultiSelect`

### Phase 4 Additions
- Alternative non-drag patterns (gap #15) -- new `DnD.Alternatives` module

---

## Updated Competitive Position

With these gaps filled, the updated comparison:

| Feature | Pragmatic DnD | dnd-kit | svelte-dnd-action | interact.js | **canopy/dnd** |
|---------|:---:|:---:|:---:|:---:|:---:|
| Type-based accept | via data | no | yes | no | **yes** |
| Drop predicates | via data | via data | no | no | **yes** |
| FLIP animation | no | no | yes | no | **yes** |
| Consider/finalize | no | no | yes | no | **yes** |
| Snap to elements | no | no | no | yes | **yes** |
| Alignment guides | no | no | no | no | **yes (unique)** |
| Resize handles | no | no | no | yes | **yes** |
| Inertia/momentum | no | no | no | yes | **yes** |
| Depth-dependent tree | no | no | no | no | **yes (unique)** |
| Non-drag alternatives | no | no | no | no | **yes (unique)** |
| Haptic feedback | no | no | no | no | **yes (unique)** |
| i18n announcements | building blocks | custom | no | no | **yes** |
| Nested droppable strategy | innermost | innermost | innermost | no | **configurable** |
| Marquee selection | no | no | no | no | **yes** |

Features where canopy/dnd would be **the only library** to provide them:
- Visual alignment guides (Figma-style)
- Depth-dependent tree targeting
- Non-drag alternative interaction patterns as a built-in module
- Mobile haptic feedback integration
- Configurable nested droppable resolution strategy
