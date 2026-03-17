# Phase 1: Core Polish (v1.1)

Polishes the existing v1 core and adds foundational modules that Phase 2+ depends on. No new complex patterns -- just making the foundation rock-solid.

## Tasks

### 1.1 DnD.Animation -- Spring Physics & Transitions
**Priority: Critical** (Phase 2 modules depend on this)

The animation module that gives canopy/dnd the "feel" of react-beautiful-dnd. Without spring physics, drag-and-drop feels lifeless.

**Deliverables:**
- [ ] `SpringConfig` type with stiffness, damping, mass
- [ ] Presets: `gentle`, `wobbly`, `stiff`, `snappy`
- [ ] `springPosition` -- compute spring state at time T (for rAF-driven animation)
- [ ] `DropAnimation` config -- spring from release point to final position
- [ ] `DisplacementAnimation` -- CSS transition curves for items moving out of the way
- [ ] `rbd` curve -- the specific cubic-bezier from react-beautiful-dnd (warm-up, fast, long tail)
- [ ] `LiftEffect` -- subtle scale-up + shadow on pickup
- [ ] `liftStyles` -- CSS for the lift effect
- [ ] `transitionString` -- generate CSS `transition` property value
- [ ] CSS `linear()` timing function generation from spring config (approximate spring as CSS)

**Implementation notes:**
- Spring math is pure: `springPosition` takes `{from, to, velocity, time}` and returns `{position, velocity, isSettled}`
- Use the damped harmonic oscillator equation: `x(t) = A * e^(-γt) * cos(ωt + φ)`
- For CSS-only springs, approximate with `linear()` timing function (sample spring at ~20 points, generate CSS)
- `will-change: transform` applied automatically during drag, removed after drop animation settles
- Drop animation: use rAF subscription, emit `DropAnimationComplete` msg when settled

**Tests:**
- [ ] Spring reaches target value within tolerance
- [ ] Spring with high damping doesn't overshoot
- [ ] Spring with low damping oscillates
- [ ] `transitionString` produces valid CSS
- [ ] `rbd` curve matches expected cubic-bezier values
- [ ] Presets have sensible defaults (no infinite oscillation)
- [ ] `liftStyles` produces correct CSS transform + box-shadow

**Lines: ~300**

---

### 1.2 DnD.Handle -- Drag Handles
**Priority: High** (common UX pattern, simple to implement)

Separates the drag activation zone (a grip icon) from the draggable container (the whole card). The handle gets pointer listeners, the container gets transform styles.

**Deliverables:**
- [ ] `handle` -- returns `Attributes msg` for the grip sub-element (listeners + ARIA)
- [ ] `container` -- returns styles + attrs for the movable container (no listeners)
- [ ] Keyboard support: handle is focusable, Space/Enter to grab

**Implementation notes:**
- `handle` is essentially `Draggable.draggable` but applied to a child element
- `container` is essentially `Draggable.dragStyles` applied to the parent
- The connection between handle and container is the shared `id`
- ARIA: handle gets `role="button"`, `aria-roledescription="drag handle"`, `aria-describedby` pointing to instructions

**Tests:**
- [ ] Handle attributes include pointer event listeners
- [ ] Container attributes do NOT include pointer event listeners
- [ ] Container styles include transform when dragging
- [ ] Handle is focusable (tabindex="0")

**Lines: ~80**

---

### 1.3 DnD.Hitbox -- Edge Proximity Detection
**Priority: Critical** (Tree and Kanban depend on this)

Detect which edge/zone of a drop target the cursor is nearest to. Essential for sortable lists (before vs after) and trees (before/after/inside).

**Deliverables:**
- [ ] `Edge` type: `Top | Bottom | Left | Right`
- [ ] `Zone` type: `TopQuarter | BottomQuarter | Center`
- [ ] `closestEdge` -- given Point + Rect, return nearest Edge
- [ ] `closestEdgeFiltered` -- same but only consider specified edges
- [ ] `zone` -- divide rect into top 25% / middle 50% / bottom 25%
- [ ] `zoneWithThresholds` -- custom zone thresholds
- [ ] `attachClosestEdge` -- encode edge as key-value pair for droppable data
- [ ] `extractClosestEdge` -- decode edge from droppable data dict

**Implementation notes:**
- Pure geometry: distance from point to each edge of rect
- For `zone`: `(point.y - rect.y) / rect.height` gives the relative position, threshold at 0.25 and 0.75
- `attachClosestEdge` stores `("dnd-closest-edge", "top")` in the data dict

**Tests:**
- [ ] Point at top of rect -> Top edge
- [ ] Point at bottom of rect -> Bottom edge
- [ ] Point at left -> Left, right -> Right
- [ ] Point at exact center -> behavior is deterministic
- [ ] Filtered edges: vertical-only returns only Top/Bottom
- [ ] Zone: top 25% -> TopQuarter, bottom 25% -> BottomQuarter, middle -> Center
- [ ] Custom thresholds work correctly
- [ ] Attach/extract roundtrips correctly

**Lines: ~200**

---

### 1.4 Sortable Keyed Nodes
**Priority: Medium**

`DnD.Sortable.view` should use `Html.Keyed.node` automatically so the DOM stays stable during reorder animations. Without keyed nodes, the browser may reuse wrong DOM elements during drag, causing visual glitches.

**Deliverables:**
- [ ] `Sortable.view` internally uses `Html.Keyed.node` with keys from `toId`
- [ ] Verify animation stability with keyed vs unkeyed (manual testing)

**Implementation notes:**
- Each item rendered by `viewItem` is wrapped in a keyed container
- The key is `toId item`
- This is a change to existing code, not a new module

**Lines: ~20 (modification to existing Sortable.can)**

---

### 1.5 Draggable & Droppable Test Coverage
**Priority: Medium**

Currently tested indirectly through integration tests. Add dedicated unit tests.

**Deliverables:**
- [ ] `Test.DnD.Draggable` -- test attribute generation, ARIA attrs, drag styles, data attachment
- [ ] `Test.DnD.Droppable` -- test attribute generation, isOver logic, active styles, data attachment

**Tests (Draggable):**
- [ ] `draggableAttrs` includes `tabindex`, `role`, `aria-roledescription`
- [ ] `draggableAttrs` includes pointer event listeners
- [ ] `dragStyles` returns transform when item is being dragged
- [ ] `dragStyles` returns empty when item is not being dragged
- [ ] `withData` attaches custom data

**Tests (Droppable):**
- [ ] `droppableAttrs` includes `aria-dropeffect`
- [ ] `isOver` returns True when item hovers this target
- [ ] `isOver` returns False otherwise
- [ ] `activeStyles` change when hovered
- [ ] `withData` attaches custom data

**Lines: ~150 (test code)**

---

---

### 1.6 Custom Drag Overlay Portal
**Priority: High** (CSS transform approach clips in `overflow: hidden` containers)

Body-level overlay that renders the drag preview outside any stacking context. Avoids clipping, z-index issues, and overflow hidden problems. Every major library (dnd-kit, react-dnd, Angular CDK) provides this.

**Deliverables:**
- [ ] `viewOverlay : State id -> (DragItem id -> Delta -> Html msg) -> Html msg` -- renders at body level via portal
- [ ] `DragSource` type: `TransformInPlace | HideOriginal | DimOriginal Float`
- [ ] When `HideOriginal`: original element gets `opacity: 0` during drag, overlay follows cursor
- [ ] When `DimOriginal 0.4`: original at 40% opacity, overlay follows cursor
- [ ] Overlay uses `position: fixed` with pointer-derived coordinates

**Tests:**
- [ ] Overlay renders when drag is active
- [ ] Overlay position matches pointer + delta
- [ ] Overlay does not render when no drag
- [ ] Original element style changes based on DragSource config

**Lines: ~100**

---

### 1.7 FLIP Reorder Animation
**Priority: High** (items teleport without it -- the #1 visual quality issue)

Animate displaced items using the FLIP technique (First, Last, Invert, Play). Measure positions before reorder, apply reorder, use CSS transforms to animate from old to new positions.

**Deliverables:**
- [ ] `capturePositions` -- measure and cache current rects for a list of elements
- [ ] `animateFlip` -- after DOM update, apply inverse transforms then transition to zero
- [ ] Integration with `DnD.Sortable.view` -- FLIP happens automatically during drag
- [ ] Configurable with `DnD.Animation.DisplacementAnimation` (spring or bezier curve)
- [ ] `flipDurationMs : Int` config option (default: 200ms, like svelte-dnd-action)

**FFI additions:**
- [ ] `captureElementRects(ids)` -> Dict of id -> Rect

**Tests:**
- [ ] Captured positions match getBoundingClientRect
- [ ] Inverse transform calculation is correct
- [ ] Animation completes and cleans up transform

**Lines: ~120**

---

### 1.8 Consider/Finalize Events
**Priority: Medium** (live preview of where drop would land)

Two-event pattern from svelte-dnd-action. `consider` fires as items shift to preview the drop position. `finalize` fires when the user actually drops. Users can show a live-updating list during drag without committing.

**Deliverables:**
- [ ] `onConsider : List id -> msg` in Sortable.Config -- fires during drag, shows preview order
- [ ] `onFinalize : List id -> msg` in Sortable.Config -- fires on drop, commits the reorder
- [ ] Backward compatible: if only `onReorder` is provided (existing API), it acts as finalize

**Tests:**
- [ ] consider fires on every drag-over position change
- [ ] finalize fires only on drop
- [ ] consider does not fire after finalize
- [ ] Legacy onReorder still works

**Lines: ~50**

---

### 1.9 Nested Droppables Resolution Strategy
**Priority: Medium** (needed when droppables are nested)

Configurable strategy for resolving which droppable wins when they overlap (parent vs child).

**Deliverables:**
- [ ] `NestingStrategy` type: `InnermostWins | OutermostWins | TypePriority (List String) | BubbleUp`
- [ ] `withNestingStrategy : NestingStrategy -> CollisionDetection id -> CollisionDetection id`
- [ ] `BubbleUp`: try innermost first, if `canDrop` rejects, try parent
- [ ] Default: `InnermostWins` (matches dnd-kit, Pragmatic DnD behavior)

**Tests:**
- [ ] InnermostWins picks deepest nested target
- [ ] OutermostWins picks shallowest
- [ ] BubbleUp falls back to parent when inner rejects
- [ ] TypePriority resolves by type order

**Lines: ~80**

---

### 1.10 Announcements i18n
**Priority: Medium**

Structured announcement templates for internationalization.

**Deliverables:**
- [ ] `AnnouncementStrings` record with string-producing functions
- [ ] `fromStrings : AnnouncementStrings -> (id -> String) -> Announcements id`
- [ ] Default English implementation unchanged
- [ ] Users provide translated strings for their locale

**Lines: ~40**

---

### 1.11 Inertia / Momentum Modifier
**Priority: Low** (nice-to-have for canvas interactions)

Element continues moving with decaying velocity after release. Configurable deceleration.

**Deliverables:**
- [ ] `InertiaConfig` with `resistance`, `minSpeed`, `endOnly`
- [ ] `inertia : InertiaConfig -> Modifier id`
- [ ] Track velocity during drag (delta / time between frames)
- [ ] On release, apply decaying velocity via rAF subscription

**Lines: ~80**

---

### 1.12 Haptic Feedback
**Priority: Low** (mobile polish)

Vibrate on drag pickup. Uses Web Vibration API.

**Deliverables:**
- [ ] `hapticFeedback : { duration : Int } -> Cmd msg`
- [ ] Feature detection: no-op on unsupported browsers (Safari)
- [ ] Integrate with pointer sensor: optional vibrate on drag start

**FFI:** `navigator.vibrate(duration)` with `typeof navigator.vibrate === 'function'` guard.

**Lines: ~20**

---

## Summary

| Task | Lines | Priority | Dependencies |
|------|-------|----------|-------------|
| 1.1 Animation | 300 | Critical | None |
| 1.2 Handle | 80 | High | Draggable |
| 1.3 Hitbox | 200 | Critical | Core types |
| 1.4 Sortable keyed | 20 | Medium | Sortable |
| 1.5 Test coverage | 150 | Medium | Draggable, Droppable |
| 1.6 Overlay portal | 100 | High | Draggable |
| 1.7 FLIP animation | 120 | High | Animation, FFI |
| 1.8 Consider/finalize | 50 | Medium | Sortable |
| 1.9 Nested droppables | 80 | Medium | Collision |
| 1.10 Announcements i18n | 40 | Medium | Announcements |
| 1.11 Inertia | 80 | Low | Modifier |
| 1.12 Haptic feedback | 20 | Low | FFI |
| **Total** | **~1240** | | |

## Done Criteria

- All new modules compile without warnings
- All tests pass
- Animation presets produce visually correct spring curves (manual verification)
- Handle example works with keyboard navigation
- Hitbox edge detection is correct for all quadrants
- Sortable list animations are stable with keyed nodes
- Drag overlay works inside `overflow: hidden` containers
- FLIP animations produce smooth displacement during drag
- Consider/finalize events give live preview of reorder
- Nested droppables resolve correctly in all strategies
- Announcements work with custom i18n strings
