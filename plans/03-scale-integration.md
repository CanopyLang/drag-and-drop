# Phase 3: Scale & Integration (v2.1)

Modules for real-world scale (thousands of items), external integrations (OS file drops), developer experience (testing, undo/redo), and advanced layout patterns (dashboard grids).

**Depends on:** Phase 2 (Tree, Kanban, MultiSelect patterns inform these designs)

## Tasks

### 3.1 DnD.Grid -- Dashboard Grid Layout
**Priority: Critical** (dashboards, page builders, admin panels)

Drag-and-resize tiles on a grid. Think Gridstack.js or react-grid-layout, but TEA-native and accessible. No functional/declarative library provides this -- it's always imperative DOM-mutating JavaScript.

**Deliverables:**
- [ ] `GridItem id` type -- position (x, y), size (width, height), min/max constraints, isStatic flag
- [ ] `Config id msg` -- columns, rowHeight, gap, compactMode, resizable, draggable, bounds
- [ ] `CompactMode`: `CompactVertical | CompactHorizontal | CompactNone`
- [ ] `GridBounds`: `Unbounded | BoundedRows Int | BoundedToContainer`
- [ ] `GridItemState` -- isDragging, isResizing, isPlaceholder, isStatic
- [ ] `ResizeHandle` type -- 8 positions (corners + edges)
- [ ] `State id` / `init` / `view` / `subscriptions`
- [ ] `compact` -- apply compaction algorithm (items float up/left to fill gaps)
- [ ] `hasCollision` -- check if a grid item overlaps others
- [ ] `resolveCollisions` -- push overlapping items down
- [ ] `ResponsiveConfig` -- breakpoint-based layouts
- [ ] Placeholder ghost during drag/resize showing final position
- [ ] Static items: can't move/resize, others flow around them

**Implementation notes:**
- Grid is CSS Grid under the hood: `grid-template-columns: repeat(columns, 1fr)`
- Items are absolutely positioned within the grid container using `grid-column` and `grid-row`
- Drag: snap to grid cells. During drag, show placeholder at target position, resolve collisions by pushing items down.
- Resize: drag handle on edges/corners. Clamp to min/max constraints. During resize, show preview outline, resolve collisions.
- Compaction: after any change, run compaction algorithm:
  - `CompactVertical`: for each item top-to-bottom, move up until collision or top edge
  - `CompactHorizontal`: same but left-to-right
  - `CompactNone`: items stay where placed
- Collision resolution: when item A is placed and overlaps item B, move B down. If B now overlaps C, move C down. Recurse until settled.
- Responsive: on window resize, look up layout for current breakpoint. If no layout defined, scale down column positions proportionally.

**Edge cases:**
- Resize to minimum size (1x1)
- Resize that would push items off the grid (bounded mode)
- Drag a 3-wide item in a 4-column grid -- only one valid column position
- Two items resolving collisions creating a cascade that pushes items very far down
- Responsive breakpoint change during drag (cancel the drag)
- Static item blocking compaction

**Keyboard interaction:**
- Tab to focus a grid item
- Space/Enter to grab
- Arrow keys to move by one grid cell
- Shift+Arrow to resize by one grid cell
- Escape to cancel

**Tests:**
- [ ] Grid items render at correct positions
- [ ] Drag snaps to grid cells
- [ ] Resize respects min/max constraints
- [ ] hasCollision detects overlapping items
- [ ] resolveCollisions pushes items down correctly
- [ ] CompactVertical moves items up
- [ ] CompactHorizontal moves items left
- [ ] CompactNone leaves items in place
- [ ] Static items can't be moved or resized
- [ ] Static items block compaction correctly
- [ ] Responsive: correct layout selected per breakpoint
- [ ] Placeholder shows at correct position during drag
- [ ] Cascade resolution terminates (no infinite loops)

**Lines: ~500**

---

### 3.2 DnD.Virtualized -- Virtualized List Support
**Priority: High** (any list with 100+ items)

Drag-and-drop in windowed/virtualized lists where only visible items are in the DOM. The fundamental challenge: you can't measure or interact with items that aren't rendered. This module bridges that gap.

**Deliverables:**
- [ ] `Config id msg` -- items, heights, overscan, containerHeight
- [ ] `ItemHeight id`: `FixedHeight Float | VariableHeight (id -> Float) | MeasuredHeight`
- [ ] `State id` / `init` -- includes scroll position, rendered range, height cache
- [ ] `view` -- renders only visible items + overscan, with correct scroll offset
- [ ] `onScroll` -- updates visible range on scroll
- [ ] `visibleRange` -- get currently rendered item indices
- [ ] `scrollToItem` -- scroll to reveal a specific item (for keyboard DnD)
- [ ] `dragOverscan` -- increased overscan during drag (default: 10 vs normal 5)

**Implementation notes:**
- Standard virtual scroll: container has a spacer div with total height, inner div is translated to scroll offset, only `overscan * 2 + visible` items rendered
- During drag, increase overscan to prevent items from disappearing near viewport edges
- Height cache: for `MeasuredHeight`, measure on first render using `getBoundingClientRect`, store in a Dict
- For `FixedHeight`, all calculations are arithmetic (O(1) scroll-to-index)
- For `VariableHeight`, maintain a prefix-sum array for O(log n) scroll-to-index
- Drop position calculation: even for items not in DOM, use cached heights to compute where they would be
- Auto-scroll: integrate with virtual scroll position. Auto-scroll updates the virtual scroll offset, which triggers re-render of new items entering the viewport.

**Edge cases:**
- Dragging from visible area to far-off position (auto-scroll through hundreds of items)
- Variable height items where some haven't been measured yet (estimate)
- Resize of container during drag (recalculate visible range)
- Dropping on an item that just left the viewport during auto-scroll

**Tests:**
- [ ] Fixed height: correct items rendered for scroll position
- [ ] Variable height: correct items rendered
- [ ] Overscan renders extra items above/below
- [ ] Drag increases overscan
- [ ] scrollToItem scrolls to correct position
- [ ] visibleRange returns correct indices
- [ ] Total container height is correct (sum of all item heights)
- [ ] Items not in DOM still have correct drop positions

**Lines: ~300**

---

### 3.3 DnD.FileDrop -- OS File Drop Zones
**Priority: Medium** (file upload areas, image galleries)

Handle files dragged from the OS file manager into the browser. This uses the HTML5 `dragenter`/`dragover`/`drop` events with `DataTransfer`, separate from pointer-based DnD but sharing visual language.

**Deliverables:**
- [ ] `Config msg` -- onDrop, onDragEnter, onDragLeave, accept (MIME types), maxFiles, maxFileSize, disabled
- [ ] `File` type -- name, size, mimeType, lastModified
- [ ] `State` / `init` / `isActive`
- [ ] `dropZone` -- attributes + styles for the drop zone element
- [ ] `validate` -- validate files against config constraints, return accepted + rejected with reasons
- [ ] `RejectionReason`: `InvalidMimeType | FileTooLarge | TooManyFiles`
- [ ] `readAsText` / `readAsDataUrl` / `readAsBytes` -- Cmd-based file reading
- [ ] `SortableDropZoneConfig` -- combine with Sortable for image galleries where you can reorder existing AND drop new files

**Implementation notes:**
- Uses `dragenter`/`dragleave`/`dragover`/`drop` events (NOT pointer events)
- `dragover` must call `preventDefault()` for drop to work
- `DataTransfer.items` provides file metadata during `dragover`, actual `File` objects only on `drop`
- `accept` filter: match MIME types with wildcard support (`image/*` matches `image/png`, `image/jpeg`)
- File reading uses `FileReader` API via FFI ports
- Browser security: can only read `DataTransfer.types` during drag, not file contents or names

**Edge cases:**
- Dragging non-file data from OS (text, URLs) -- filter based on DataTransfer types
- Multiple files when maxFiles=1 -- reject excess files
- Zero-byte files
- Very large files -- validate before reading
- Browser differences in DataTransfer item availability during dragover

**FFI additions:**
- [ ] `readFileAsText(file)` -> Promise<String>
- [ ] `readFileAsDataUrl(file)` -> Promise<String>
- [ ] `readFileAsArrayBuffer(file)` -> Promise<ArrayBuffer>

**Tests:**
- [ ] validate accepts matching MIME types
- [ ] validate rejects non-matching MIME types
- [ ] validate rejects files exceeding maxFileSize
- [ ] validate rejects excess files when maxFiles is set
- [ ] Wildcard MIME matching (image/* matches image/png)
- [ ] isActive is True during dragenter, False after dragleave
- [ ] dropZone includes correct event listeners

**Lines: ~250**

---

### 3.4 DnD.History -- Undo/Redo
**Priority: Medium** (page builders, design tools, any tool where mistakes matter)

Every drag operation is recorded and reversible. No DnD library provides this.

**Deliverables:**
- [ ] `State snapshot` -- parameterized by the model type to snapshot
- [ ] `init` -- start with initial snapshot
- [ ] `push` -- record new state after drag
- [ ] `undo` / `redo` -- step backward/forward
- [ ] `canUndo` / `canRedo` -- for enabling UI buttons
- [ ] `undoCount` / `redoCount`
- [ ] `clear` -- reset history
- [ ] `withMaxSize` -- limit history depth (drop oldest)
- [ ] `pushBatch` -- multiple operations as one undo step (multi-select drag = 1 undo)

**Implementation notes:**
- Classic zipper pattern: `{ past : List snapshot, present : snapshot, future : List snapshot }`
- `push` adds present to past, sets new present, clears future
- `undo` moves present to future, pops from past to present
- `redo` moves present to past, pops from future to present
- `withMaxSize` truncates `past` when it exceeds max length
- `pushBatch` is just `push` -- the caller decides what constitutes a single snapshot (before/after the entire multi-drag)

**Tests:**
- [ ] push adds to history
- [ ] undo returns previous state
- [ ] redo returns next state
- [ ] undo when no past returns Nothing
- [ ] redo when no future returns Nothing
- [ ] push clears future (no redo after new action)
- [ ] canUndo/canRedo return correct booleans
- [ ] withMaxSize drops oldest entries
- [ ] clear resets to single snapshot
- [ ] undoCount/redoCount are correct

**Lines: ~200**

---

### 3.5 DnD.Testing -- Test Utilities
**Priority: High** (DX -- users need to test their DnD code)

First-class test helpers for simulating drag interactions. Simulating DnD in tests is notoriously difficult across all frameworks. We solve this.

**Deliverables:**
- [ ] `simulateDrag` -- complete drag-and-drop from source to target, returns messages + final state
- [ ] `simulateDragPath` -- drag through intermediate hover targets
- [ ] `simulateDragCancel` -- pickup then cancel
- [ ] `simulateKeyboardDrag` -- keyboard-driven drag with arrow key moves
- [ ] `KeyboardMove`: `ArrowUp | ArrowDown | ArrowLeft | ArrowRight | Drop | Cancel`
- [ ] `mockState` -- create a DnD.State for testing views without a real drag
- [ ] `expectOrder` -- assertion helper for list reordering

**Implementation notes:**
- `simulateDrag` produces the sequence of messages that a real drag would: StartDrag → MoveDrag → DragOverTarget → EndDrag
- Requires mock Rect values for items (no real DOM in tests) -- include a `rects : Dict id Rect` parameter
- `mockState` creates a State with specific fields set, for rendering tests where you want to test "what does the view look like mid-drag?"
- `expectOrder` is a convenience: `expectOrder expected actual = expect actual (equal expected)`

**Tests:**
- [ ] simulateDrag produces correct message sequence
- [ ] simulateDragPath produces DragOver for each intermediate target
- [ ] simulateDragCancel produces CancelDrag
- [ ] simulateKeyboardDrag produces correct moves
- [ ] mockState creates usable state for view testing

**Lines: ~250**

---

## Summary

| Task | Lines | Priority | Dependencies |
|------|-------|----------|-------------|
| 3.1 Grid | 500 | Critical | Modifier, Animation, Hitbox |
| 3.2 Virtualized | 300 | High | Sortable, AutoScroll |
| 3.3 FileDrop | 250 | Medium | Independent (different API) |
| 3.4 History | 200 | Medium | Independent (pure state) |
| 3.5 Testing | 250 | High | All core modules |
| **Total** | **1500** | | |

## Implementation Order

1. **History** and **FileDrop** are fully independent -- start anytime
2. **Testing** benefits from having all Phase 2 modules done but can start with Phase 1 coverage
3. **Grid** and **Virtualized** are the heavy lifters -- do these with full focus
4. **Grid** and **Virtualized** can be developed in parallel

## Done Criteria

- Grid: dashboard example with drag, resize, compaction, responsive breakpoints
- Virtualized: 1000-item sortable list at 60fps
- FileDrop: image gallery with reorder + OS file drop
- History: Ctrl+Z/Ctrl+Y works for all drag operations
- Testing: users can write `simulateDrag` in their test suites
- All modules accessible via keyboard with screen reader announcements
