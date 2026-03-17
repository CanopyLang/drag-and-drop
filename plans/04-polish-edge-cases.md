# Phase 4: Polish & Edge Cases (v2.2)

Cross-cutting concerns that touch every module. RTL, zoom, nested scroll, performance benchmarks, and a full accessibility audit. This phase turns a good library into a bulletproof one.

**Depends on:** Phase 3 (all modules exist, now we harden them)

## Tasks

### 4.1 RTL (Right-to-Left) Support
**Priority: High** (Arabic, Hebrew, Persian, Urdu -- billions of users)

Most DnD libraries treat RTL as an afterthought. Horizontal calculations assume left-to-right. We bake it in across every module.

**Deliverables:**
- [ ] `Direction` type: `LTR | RTL`
- [ ] Add `direction : Direction` to top-level `DnD.Config`
- [ ] Modifier: `restrictToHorizontalAxis` flips in RTL
- [ ] Collision: `closestCenter` and `closestCorners` account for RTL coordinate space
- [ ] Hitbox: `Left`/`Right` edges swap meaning in RTL
- [ ] Sortable: `Horizontal` layout reverses insert logic in RTL
- [ ] Kanban: column order and card insertion respect RTL
- [ ] Tree: indent is on the right side in RTL
- [ ] Grid: x-axis positions mirror in RTL
- [ ] Keyboard sensor: ArrowLeft/ArrowRight swap behavior in RTL
- [ ] Auto-scroll: horizontal scroll direction reverses in RTL
- [ ] Announcements: "moved left" / "moved right" text swaps in RTL (or use "moved forward"/"moved backward")

**Implementation notes:**
- Detect direction from `dir` attribute or pass explicitly in config
- Internally, normalize all coordinates to a direction-agnostic space, then convert at the boundary (view layer)
- For CSS: `transform: translateX()` sign flips in RTL
- Key swap: when `direction == RTL`, ArrowLeft behaves like ArrowRight and vice versa

**Tests:**
- [ ] Horizontal sortable in RTL inserts correctly
- [ ] Keyboard arrows are swapped in RTL
- [ ] Hitbox Left/Right swap in RTL
- [ ] Grid items mirror on x-axis in RTL
- [ ] Tree indentation is on the right in RTL
- [ ] Auto-scroll horizontal direction reverses in RTL

**Lines: ~100 (spread across all modules)**

---

### 4.2 Nested Scroll Containers
**Priority: High** (extremely common in real apps)

Real apps have nested scrollable containers: a scrollable page containing a scrollable kanban column containing a scrollable card list. Auto-scroll must work at every level.

**Deliverables:**
- [ ] `AutoScroll` detects the nearest scrollable ancestor of the current drop target
- [ ] Multiple scroll containers can scroll simultaneously (e.g., both the column and the page)
- [ ] Scroll speed is proportional to distance from edge, per container independently
- [ ] Scroll containers are detected via FFI (`getComputedStyle` → `overflow: auto|scroll`)

**Implementation notes:**
- Walk up the DOM from the pointer position, find all elements with `overflow: auto|scroll` and scrollable content
- For each scrollable container, independently calculate if the pointer is within the threshold of its edges
- Apply scroll to each container that meets the threshold
- Use `Element.scrollBy()` per container

**FFI additions:**
- [ ] `findScrollableAncestors(element)` -> list of scrollable parent elements
- [ ] `getElementOverflow(element)` -> { overflowX, overflowY, scrollWidth, scrollHeight, clientWidth, clientHeight }

**Tests:**
- [ ] Scroll triggers at edge of inner container
- [ ] Scroll triggers at edge of outer container
- [ ] Both containers can scroll simultaneously
- [ ] Scroll stops when pointer moves away from edge
- [ ] Non-scrollable containers are skipped

**Lines: ~150 (AutoScroll extension + FFI)**

---

### 4.3 Zoom Level Compensation
**Priority: Medium** (design tools, maps, pinch-zoom on mobile)

Browser zoom (`Ctrl+/Ctrl-`) and CSS `transform: scale()` on ancestor elements both break coordinate calculations. Pointer positions don't match element positions when scale != 1.

**Deliverables:**
- [ ] Detect browser zoom level via `window.visualViewport.scale`
- [ ] Detect CSS scale transforms on ancestor elements via `getComputedStyle`
- [ ] Compensate pointer coordinates before collision detection
- [ ] Compensate drag delta before applying transform

**Implementation notes:**
- Browser zoom: `window.visualViewport.scale` gives the zoom factor. Divide pointer coordinates by this.
- CSS scale: walk up ancestor elements looking for `transform` that includes `scale()`. Accumulate the scale factor.
- Apply compensation in the Sensor layer before coordinates reach collision detection
- This is mostly an FFI concern + a modifier that auto-applies the compensation

**FFI additions:**
- [ ] `getViewportScale()` -> Float
- [ ] `getAccumulatedScale(element)` -> Float (product of all ancestor scale transforms)

**Tests:**
- [ ] Pointer coordinates compensated for 2x browser zoom
- [ ] Pointer coordinates compensated for CSS scale(0.5) ancestor
- [ ] Nested scale transforms accumulate correctly
- [ ] Scale of 1.0 is no-op

**Lines: ~100 (FFI + modifier)**

---

### 4.4 Performance Benchmarks
**Priority: High** (prove our claims)

We claim 60fps with 1000+ items. Prove it with benchmarks. Target numbers that exceed dnd-kit and Pragmatic DnD.

**Deliverables:**
- [ ] Benchmark: Sortable list with 100 / 500 / 1000 / 5000 items -- measure frame time during drag
- [ ] Benchmark: Virtualized sortable with 10,000 items -- measure frame time during drag
- [ ] Benchmark: Tree with 500 nodes, 5 levels deep -- measure frame time during drag
- [ ] Benchmark: Kanban with 5 columns x 100 cards -- measure frame time during cross-column drag
- [ ] Benchmark: Grid with 50 tiles -- measure frame time during drag + resize
- [ ] Benchmark: MultiSelect with 50 selected items in 1000-item list -- measure frame time
- [ ] Document results in benchmark report

**Target frame times:**
- All operations: < 16.67ms per frame (60fps)
- Sortable 1000 items: < 8ms per frame (headroom for app code)
- Virtualized 10,000 items: < 8ms per frame
- Tree 500 nodes: < 10ms per frame
- Kanban 500 cards: < 10ms per frame

**Implementation notes:**
- Use `performance.now()` around update cycles
- Measure in both Chrome and Firefox (different rendering engines)
- Run on a mid-range device, not a developer workstation
- Profile with Chrome DevTools to identify bottlenecks
- Key optimizations if needed:
  - Reduce collision detection candidates (spatial hashing)
  - Memoize rect calculations
  - Reduce view re-renders (only items that changed)

**Lines: ~200 (benchmark harness + scripts)**

---

### 4.5 Accessibility Audit (WCAG 2.2)
**Priority: Critical** (not optional -- accessibility is a core principle)

Full audit of all modules against WCAG 2.2 AA, with specific focus on drag-and-drop interaction patterns.

**Deliverables:**
- [ ] Audit every module for keyboard operability (WCAG 2.1.1 -- no keyboard traps)
- [ ] Audit screen reader announcements in NVDA, VoiceOver, JAWS
- [ ] Audit focus management during drag (focus must be visible and logical)
- [ ] Audit color contrast of drop indicators (WCAG 1.4.3 -- 4.5:1 ratio)
- [ ] Audit touch target sizes (WCAG 2.5.8 -- 24x24px minimum)
- [ ] Verify `aria-roledescription`, `aria-describedby`, `aria-dropeffect` are correct
- [ ] Verify live region announcements are timely and clear
- [ ] Provide **alternative interaction patterns** for every DnD operation:
  - Sortable: up/down buttons as fallback
  - Kanban: "Move to column" dropdown as fallback
  - Tree: context menu with "Move before/after/into" options
  - Grid: position/size inputs as fallback
- [ ] Document all keyboard shortcuts per module
- [ ] Test with Dragon NaturallySpeaking (voice control)
- [ ] Test with Switch Access (mobility impairment)

**Accessibility alternative patterns:**
```canopy
-- Every DnD module provides a non-drag alternative
-- Example: Sortable with move buttons

type alias AccessibleConfig id msg =
    { moveUp : id -> msg
    , moveDown : id -> msg
    , moveToTop : id -> msg
    , moveToBottom : id -> msg
    }

-- Render accessible move controls (visible or screen-reader-only)
viewMoveControls : AccessibleConfig id msg -> id -> Html msg
```

**Lines: ~200 (alternative controls + fixes)**

---

---

### 4.6 DnD.Alternatives -- Non-Drag Interaction Patterns
**Priority: High** (critical for users who cannot drag at all)

Salesforce documents 4 accessible DnD patterns. We provide button-based alternatives for every DnD module so users who cannot perform drag gestures (motor impairments, switch access, voice control) can still reorder and move items.

**Deliverables:**
- [ ] `DnD.Alternatives.viewSortControls` -- up/down/top/bottom buttons per sortable item
- [ ] `DnD.Alternatives.viewMoveToColumn` -- "Move to column" dropdown for kanban cards
- [ ] `DnD.Alternatives.viewTreeMoveMenu` -- context menu with before/after/into options for tree nodes
- [ ] `DnD.Alternatives.viewGridPositionInputs` -- x/y/width/height inputs for grid items
- [ ] Controls can be always-visible or screen-reader-only (class toggle)
- [ ] All controls are fully keyboard navigable

```canopy
module DnD.Alternatives exposing (..)

-- Sortable: reorder buttons
viewSortControls :
    { moveUp : id -> msg
    , moveDown : id -> msg
    , moveToTop : id -> msg
    , moveToBottom : id -> msg
    , isFirst : Bool
    , isLast : Bool
    }
    -> id
    -> Html msg

-- Kanban: move-to-column dropdown
viewMoveToColumn :
    { columns : List ( columnId, String )
    , currentColumn : columnId
    , onMove : columnId -> msg
    }
    -> Html msg

-- Tree: move menu
viewTreeMoveMenu :
    { siblings : List ( id, String )
    , parent : Maybe ( id, String )
    , onMoveBefore : id -> msg
    , onMoveAfter : id -> msg
    , onMoveInto : id -> msg
    }
    -> Html msg

-- Grid: position/size inputs
viewGridControls :
    { x : Int, y : Int, width : Int, height : Int
    , onChangePosition : { x : Int, y : Int } -> msg
    , onChangeSize : { width : Int, height : Int } -> msg
    , maxColumns : Int
    }
    -> Html msg
```

**Tests:**
- [ ] Sort buttons emit correct messages
- [ ] First item has disabled "move up" button
- [ ] Last item has disabled "move down" button
- [ ] Move-to-column dropdown lists all columns except current
- [ ] Tree move menu shows valid targets
- [ ] Grid inputs clamp to valid ranges

**Lines: ~250**

---

## Summary

| Task | Lines | Priority | Dependencies |
|------|-------|----------|-------------|
| 4.1 RTL | 100 | High | All modules |
| 4.2 Nested Scroll | 150 | High | AutoScroll |
| 4.3 Zoom | 100 | Medium | Sensor, Modifier |
| 4.4 Benchmarks | 200 | High | All modules |
| 4.5 A11y Audit | 200 | Critical | All modules |
| 4.6 Alternatives | 250 | High | All view modules |
| **Total** | **1000** | | |

## Implementation Order

1. **A11y Audit** first -- may reveal structural issues in any module
2. **RTL** next -- touches every module, easier to do all at once than piecemeal
3. **Nested Scroll** and **Zoom** can be parallel
4. **Benchmarks** last -- need all features stable before measuring

## Done Criteria

- RTL: Arabic demo works correctly for all modules (sortable, kanban, tree, grid)
- Nested scroll: auto-scroll works in page > sidebar > list hierarchy
- Zoom: drag works correctly at 50%, 100%, 150%, 200% browser zoom
- Benchmarks: all targets met on mid-range hardware
- A11y: WCAG 2.2 AA compliance verified with NVDA + VoiceOver
- Alternative interaction patterns available for every DnD module
- Zero known accessibility issues in issue tracker
