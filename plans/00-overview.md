# canopy/dnd -- Implementation Plan Overview

## Architecture

canopy/dnd is split into 4 implementation phases. Each phase builds on the previous one. The v1 core is already implemented (9 modules, 127+ tests).

## Phases

| Phase | Focus | Modules | Status |
|-------|-------|---------|--------|
| 0 | [v1 Patches](./06-v1-patches.md) | Type-based accept, canDrop predicates, aria-describedby, touch sensor, rAF throttle | planned |
| 1 | [Core Polish](./01-core-polish.md) | Animation (+ FLIP + inertia), Handle, Hitbox, Overlay portal, Consider/Finalize, i18n, nested droppable strategy, haptic feedback | planned |
| 2 | [Complex Patterns](./02-complex-patterns.md) | Tree (+ depth-dependent targeting), Kanban, MultiSelect (+ lasso), Snap/Alignment guides, Resize, Monitor, Operation | planned |
| 3 | [Scale & Integration](./03-scale-integration.md) | Grid, Virtualized, FileDrop, History, Testing | planned |
| 4 | [Polish & Edge Cases](./04-polish-edge-cases.md) | RTL, nested scroll, zoom, perf benchmarks, a11y audit, non-drag alternatives | planned |

See also: [Gap Analysis](./05-gap-analysis.md) -- comprehensive competitive research findings.

## Dependency Graph

```
Phase 0 (patches to shipped v1 code)
  Type accept ── DnD, Collision, Draggable, Droppable
  canDrop ────── DnD, Collision, Droppable
  aria-describedby  Announcements, Draggable, Droppable
  Touch sensor ── Sensor
  rAF throttle ── FFI (dnd.js)

Phase 1 (polishes v1 core, adds foundations)
  Animation ──── no deps (pure math + CSS) + FLIP + inertia
  Handle ─────── depends on Draggable
  Hitbox ─────── depends on core types (Point, Rect)
  Overlay portal  depends on Draggable
  Consider/Finalize  depends on Sortable
  Nested droppable   depends on Collision
  i18n ────────── depends on Announcements
  Haptic ─────── FFI only

Phase 2 (depends on Phase 1)
  Tree ─────────  depends on Hitbox, Animation, Handle + depth-dependent targeting
  Kanban ──────── depends on Sortable, Animation, Hitbox
  MultiSelect ─── depends on Draggable, Sortable + lasso/marquee
  Snap/Guides ─── depends on core types, Modifier
  Resize ──────── depends on Sensor, Modifier
  Monitor ──────  depends on core State
  Operation ────  depends on core Config

Phase 3 (depends on Phase 2)
  Grid ─────────  depends on Modifier, Animation, Hitbox, Resize
  Virtualized ──  depends on Sortable, AutoScroll
  FileDrop ─────  independent (different API surface)
  History ──────  independent (pure state management)
  Testing ──────  depends on all core modules

Phase 4 (cross-cutting, touches everything)
  RTL ──────────  modifier + collision + hitbox + tree + kanban
  Scroll ───────  AutoScroll + Virtualized
  Zoom ─────────  Sensor + Collision (coordinate transform)
  Perf ─────────  benchmarks for Sortable, Tree, Grid, Virtualized
  A11y ─────────  Announcements + all view modules
  Alternatives ── non-drag interaction patterns for all modules
```

## Module Count

- v1 (implemented): 9 modules + 1 FFI file
- v1 patches: changes to 5 existing modules + FFI
- v2 (planned): 16 new modules + FFI additions (original 13 + Snap, Resize, Alternatives)
- Total: 25 modules, ~6,000+ lines

## Files

- [v1 Patches](./06-v1-patches.md) -- critical fixes to shipped code
- [Phase 1: Core Polish](./01-core-polish.md) -- animation, handles, hitbox, overlay, FLIP
- [Phase 2: Complex Patterns](./02-complex-patterns.md) -- tree, kanban, multi-select, snap, resize
- [Phase 3: Scale & Integration](./03-scale-integration.md) -- grid, virtualized, file drop, history, testing
- [Phase 4: Polish & Edge Cases](./04-polish-edge-cases.md) -- RTL, scroll, zoom, benchmarks, a11y
- [Gap Analysis](./05-gap-analysis.md) -- competitive research findings
- [Main plan (full API reference)](../drag-and-drop.md)
