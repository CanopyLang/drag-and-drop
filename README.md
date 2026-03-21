# canopy/drag-and-drop

Accessible drag-and-drop for Canopy applications. Covers sortable lists, Kanban boards, tree reordering, multi-select drag, and file drop — all with keyboard accessibility and reduced-motion support built in.

## Features

- **Sortable lists**: Vertical and horizontal reordering with animated FLIP transitions
- **Kanban boards**: Cross-column card movement via `DnD.Kanban`
- **Tree drag**: Reorder and re-parent nodes in a tree structure via `DnD.Tree`
- **Multi-select drag**: Drag a selection of items as a group via `DnD.MultiSelect`
- **Grid drag**: Drag between fixed-grid cells via `DnD.Grid`
- **Keyboard accessibility**: Full keyboard operation with screen reader announcements
- **Auto-scroll**: Scroll containers automatically when dragging near edges
- **File drop**: Accept dropped files via `DnD.FileDrop`
- **Reduced motion**: Respects `prefers-reduced-motion` and disables animations automatically

## Installation

```
canopy install canopy/drag-and-drop
```

## Quick Start

```canopy
import DnD
import DnD.Draggable as Draggable
import DnD.Droppable as Droppable
import DnD.Subscriptions as Subscriptions


type alias Model =
    { items : List String
    , dnd : DnD.State
    }


type Msg
    = DndMsg DnD.Msg


init : Model
init =
    { items = [ "Alpha", "Beta", "Gamma", "Delta" ]
    , dnd = DnD.init
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        DndMsg dndMsg ->
            let
                ( newDnd, cmd ) =
                    DnD.update dndMsg model.dnd
            in
            ( { model | dnd = newDnd }, Cmd.map DndMsg cmd )


subscriptions : Model -> Sub Msg
subscriptions model =
    Subscriptions.subscriptions model.dnd
        |> Sub.map DndMsg


view : Model -> Html Msg
view model =
    Html.ul [] (List.indexedMap (viewItem model.dnd) model.items)
        |> Html.map DndMsg


viewItem : DnD.State -> Int -> String -> Html DnD.Msg
viewItem dnd index label =
    Html.li
        (Draggable.draggable (String.fromInt index)
            ++ Droppable.droppable (String.fromInt index)
        )
        [ Html.text label ]
```

For reordering, prefer `DnD.Sortable.sortable` — it handles list mutation, drop target highlighting, and drag preview automatically.

## Modules

### DnD

Root TEA integration. Holds drag state and coordinates all sub-modules.

```canopy
DnD.init : State
DnD.update : Msg -> State -> ( State, Cmd Msg )

-- Inspect current operation
DnD.isDragging : State -> Bool
DnD.dragId : State -> Maybe DragId
DnD.overId : State -> Maybe DropId
```

### DnD.Draggable

Produces the HTML attributes needed to make an element draggable.

```canopy
-- Basic draggable
Draggable.draggable : DragId -> List (Attribute msg)

-- Constrain drag axis
Draggable.draggableWith : DragConfig -> DragId -> List (Attribute msg)
```

### DnD.Droppable

Produces the HTML attributes needed to designate a drop target.

```canopy
Droppable.droppable : DropId -> List (Attribute msg)
Droppable.droppableWith : DropConfig -> DropId -> List (Attribute msg)
```

### DnD.Handle

Makes only a child element the drag handle, leaving the rest of the item non-draggable.

```canopy
Handle.handle : List (Attribute msg)
```

### DnD.Overlay

Renders a custom drag preview (the element that follows the cursor during drag). Without an overlay the browser's default ghost image is used.

```canopy
DnD.Overlay.view : State -> (DragId -> Html msg) -> Html msg
```

### DnD.Hitbox

Controls how the drop target's hit area is calculated. Useful for directional insertion (above/below vs. left/right of center).

```canopy
Hitbox.topBottom   -- Split into top-half and bottom-half drop zones
Hitbox.leftRight   -- Split into left-half and right-half drop zones
Hitbox.full        -- Entire element is one drop zone (default)
```

### DnD.Events

Decoders and event types for drag lifecycle events.

```canopy
type DragStart = DragStart { id : DragId, position : Point }
type DragOver  = DragOver  { id : DragId, overId : DropId, position : Point }
type DragEnd   = DragEnd   { id : DragId, overId : Maybe DropId, cancelled : Bool }
```

### DnD.Subscriptions

Wire browser pointer and keyboard events into the DnD state machine.

```canopy
Subscriptions.subscriptions : State -> Sub Msg
```

### DnD.Sortable

High-level sortable list. Handles reordering, drop highlighting, drag preview, and FLIP animation in one call.

```canopy
DnD.Sortable.sortable
    { toId = .id
    , onReorder = ItemsReordered
    , dnd = model.dnd
    , renderItem = viewCard
    }
    model.items
```

### DnD.Kanban

Sortable columns where items can be dragged between columns.

```canopy
DnD.Kanban.kanban
    { toItemId = .id
    , toColumnId = .columnId
    , onMove = CardMoved
    , dnd = model.dnd
    , renderCard = viewCard
    , renderColumn = viewColumn
    }
    model.columns
```

### DnD.Tree

Drag nodes to reorder siblings or re-parent under a new node. Drop targets highlight based on depth cues.

```canopy
DnD.Tree.tree
    { toId = .id
    , onMove = NodeMoved
    , dnd = model.dnd
    , renderNode = viewNode
    }
    model.root
```

### DnD.MultiSelect

Drag a set of selected items as a single group. The drag preview shows a count badge.

```canopy
DnD.MultiSelect.draggableSelected
    { selected = model.selectedIds
    , onDragSelected = DragSelected
    }
    item.id
```

### DnD.Grid

Drag items between cells in a fixed-dimension grid.

```canopy
DnD.Grid.grid
    { columns = 4
    , toId = .id
    , onMove = CellMoved
    , dnd = model.dnd
    , renderCell = viewCell
    }
    model.cells
```

### DnD.Flip

FLIP (First, Last, Invert, Play) animation for smooth item transitions during reorder. Applied automatically by `DnD.Sortable`; use directly only for custom layouts.

```canopy
DnD.Flip.animated : State -> ItemId -> List (Attribute msg)
```

### DnD.Motion

Animation timing and easing configuration shared by `DnD.Flip` and the drag overlay.

```canopy
DnD.Motion.default        -- 200ms ease-out
DnD.Motion.spring         -- Spring physics approximation
DnD.Motion.none           -- Instant, no animation
```

### DnD.ReducedMotion

Checks `prefers-reduced-motion` at runtime and replaces animations with instant transitions. This happens automatically when you use `DnD.Sortable`, `DnD.Kanban`, or `DnD.Flip`. No application code is required.

### DnD.Monitor

Observe drag events from outside the drag system — useful for updating state in response to drag without being a drop target.

```canopy
DnD.Monitor.onDragStart : (DragStart -> msg) -> Sub msg
DnD.Monitor.onDragEnd   : (DragEnd -> msg)   -> Sub msg
```

### DnD.AutoScroll

Scrolls the nearest scrollable ancestor when the pointer approaches its edge during a drag. Active automatically during any drag operation.

```canopy
DnD.AutoScroll.config
    { threshold = 80     -- px from edge before scrolling starts
    , maxSpeed = 20      -- px per frame at full speed
    }
```

Pass the config to `DnD.update` via `DnD.initWith`.

### DnD.Announcements

Generates live region announcements for screen readers at each drag lifecycle stage. Wire the subscription into your application to enable full keyboard accessibility.

```canopy
-- In subscriptions
DnD.Announcements.subscriptions model.dnd
    |> Sub.map AnnouncementMsg

-- In view
DnD.Announcements.view model.announcements
```

`DnD.Sortable` and related high-level helpers wire announcements automatically using default strings. Provide custom strings via `DnD.Announcements.configWith` for localisation.

### DnD.FileDrop

Accept files dragged from the operating system.

```canopy
DnD.FileDrop.droppable
    { onDrop = FilesDropped
    , accept = [ "image/*", ".pdf" ]
    }
```

## Types

```canopy
type alias State = ...

type DragOperation
    = NotDragging
    | Dragging ActiveDrag

type alias ActiveDrag =
    { id : DragId
    , overId : Maybe DropId
    , startPosition : Point
    , currentPosition : Point
    , delta : Delta
    }

type alias Delta =
    { x : Float
    , y : Float
    }
```

## Keyboard Accessibility

Every draggable element receives `tabindex="0"` and the appropriate `aria-grabbed` / `aria-dropeffect` attributes. When an element is focused, the user can initiate drag with Space, move through drop targets with the arrow keys, confirm with Enter, and cancel with Escape.

Wire `DnD.Announcements.subscriptions` into your application to provide live region feedback at each step. Without announcements, keyboard drag is functional but silent for screen reader users.

## License

BSD-3-Clause
