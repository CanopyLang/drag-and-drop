# canopy/drag-and-drop — TODO

## Status: Production Ready (v1.0.0)

Comprehensive drag-and-drop. Pointer events, collision detection, sortable lists, modifiers, auto-scroll, ARIA announcements.

---

## Test Coverage Gaps

- [ ] Add dedicated tests for `DnD.Draggable` module (currently tested indirectly)
- [ ] Add dedicated tests for `DnD.Droppable` module (currently tested indirectly)

---

## Features to Add

- [ ] HTML5 native Drag and Drop API integration (for file drops from desktop)
- [ ] Multi-item drag — select and drag multiple items
- [ ] Drag preview customization — custom drag ghost element
- [ ] Drop animation — animate item to final position
- [ ] Touch-specific optimizations (long-press to start drag)
- [ ] Nested sortable containers (drag between nested lists)
- [ ] Tree drag-and-drop (reorder tree nodes)
- [ ] `DnD.FileDrop` — File drag-and-drop from desktop

---

## Test Improvements

- [ ] Good coverage (7 test files for 9 modules) — fill gaps for Draggable and Droppable
