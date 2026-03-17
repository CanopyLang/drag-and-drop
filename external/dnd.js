// @canopy-type getBoundingClientRect : String -> Maybe Rect
function _DnD_getBoundingClientRect(id) {
    var el = document.getElementById(id);
    if (!el) {
        return __Maybe_Nothing;
    }
    var r = el.getBoundingClientRect();
    return __Maybe_Just({
        __$x: r.x,
        __$y: r.y,
        __$width: r.width,
        __$height: r.height
    });
}

// @canopy-type setPointerCapture : String -> Int -> Bool
function _DnD_setPointerCapture(elementId, pointerId) {
    var el = document.getElementById(elementId);
    if (!el) {
        return false;
    }
    try {
        el.setPointerCapture(pointerId);
        return true;
    } catch (e) {
        return false;
    }
}

// @canopy-type releasePointerCapture : String -> Int -> Bool
function _DnD_releasePointerCapture(elementId, pointerId) {
    var el = document.getElementById(elementId);
    if (!el) {
        return false;
    }
    try {
        el.releasePointerCapture(pointerId);
        return true;
    } catch (e) {
        return false;
    }
}

// @canopy-type scrollElementBy : String -> Float -> Float -> Bool
function _DnD_scrollElementBy(elementId, dx, dy) {
    var el = document.getElementById(elementId);
    if (!el) {
        return false;
    }
    el.scrollBy(dx, dy);
    return true;
}

// @canopy-type scrollWindowBy : Float -> Float -> ()
function _DnD_scrollWindowBy(dx, dy) {
    window.scrollBy(dx, dy);
}

// @canopy-type getScrollPosition : String -> Maybe { scrollLeft : Float, scrollTop : Float }
function _DnD_getScrollPosition(elementId) {
    var el = document.getElementById(elementId);
    if (!el) {
        return __Maybe_Nothing;
    }
    return __Maybe_Just({
        __$scrollLeft: el.scrollLeft,
        __$scrollTop: el.scrollTop
    });
}

// rAF-throttled pointermove handler.
// Returns a callback that schedules updates on animation frames,
// preventing excessive repaints during fast pointer movement.
// @canopy-type createThrottledPointerHandler : (Float -> Float -> ()) -> (Float -> Float -> ())
var _DnD_rafId = 0;
var _DnD_pendingX = 0;
var _DnD_pendingY = 0;
function _DnD_createThrottledPointerHandler(callback) {
    return function(x, y) {
        _DnD_pendingX = x;
        _DnD_pendingY = y;
        if (!_DnD_rafId) {
            _DnD_rafId = requestAnimationFrame(function() {
                _DnD_rafId = 0;
                callback(_DnD_pendingX, _DnD_pendingY);
            });
        }
    };
}

// @canopy-type cancelThrottledHandler : () -> ()
function _DnD_cancelThrottledHandler() {
    if (_DnD_rafId) {
        cancelAnimationFrame(_DnD_rafId);
        _DnD_rafId = 0;
    }
}

// Capture bounding rects for a list of element IDs (for FLIP animation).
// Returns a list of { id : String, rect : Rect } pairs for elements that exist.
// @canopy-type captureElementRects : List String -> List { id : String, rect : Rect }
function _DnD_captureElementRects(ids) {
    var result = __List_Nil;
    var arr = [];
    var current = ids;
    while (current.$ !== '[]') {
        arr.push(current.a);
        current = current.b;
    }
    for (var i = arr.length - 1; i >= 0; i--) {
        var el = document.getElementById(arr[i]);
        if (el) {
            var r = el.getBoundingClientRect();
            result = __List_Cons({
                __$id: arr[i],
                __$rect: {
                    __$x: r.x,
                    __$y: r.y,
                    __$width: r.width,
                    __$height: r.height
                }
            }, result);
        }
    }
    return result;
}

// Trigger haptic feedback using the Vibration API.
// @canopy-type hapticFeedback : Int -> Bool
function _DnD_hapticFeedback(durationMs) {
    if (navigator && navigator.vibrate) {
        try {
            navigator.vibrate(durationMs);
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

// Find all scrollable ancestor elements of a given element.
// Returns element IDs of ancestors that have overflow: auto/scroll.
// @canopy-type findScrollableAncestors : String -> List String
function _DnD_findScrollableAncestors(elementId) {
    var el = document.getElementById(elementId);
    if (!el) {
        return __List_Nil;
    }
    var result = __List_Nil;
    var ancestors = [];
    var current = el.parentElement;
    while (current && current !== document.body) {
        var style = window.getComputedStyle(current);
        var overflowX = style.overflowX;
        var overflowY = style.overflowY;
        if (overflowX === 'auto' || overflowX === 'scroll' ||
            overflowY === 'auto' || overflowY === 'scroll') {
            if (current.id) {
                ancestors.push(current.id);
            }
        }
        current = current.parentElement;
    }
    for (var i = ancestors.length - 1; i >= 0; i--) {
        result = __List_Cons(ancestors[i], result);
    }
    return result;
}

// Get the current visual viewport scale for zoom compensation.
// @canopy-type getViewportScale : () -> Float
function _DnD_getViewportScale() {
    if (window.visualViewport) {
        return window.visualViewport.scale;
    }
    return 1.0;
}

// Schedule a callback after two requestAnimationFrame cycles.
// Required for Firefox FLIP compatibility where the first rAF may not
// reflect layout changes from the current microtask.
// @canopy-type doubleRaf : (() -> ()) -> ()
function _DnD_doubleRaf(callback) {
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            callback();
        });
    });
}

// Check whether the user has enabled the prefers-reduced-motion media query.
// @canopy-type prefersReducedMotion : () -> Bool
function _DnD_prefersReducedMotion() {
    if (window.matchMedia) {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
}

// Get the accumulated CSS transform scale of an element.
// @canopy-type getElementScale : String -> Float
function _DnD_getElementScale(elementId) {
    var el = document.getElementById(elementId);
    if (!el) {
        return 1.0;
    }
    var transform = window.getComputedStyle(el).transform;
    if (!transform || transform === 'none') {
        return 1.0;
    }
    var match = transform.match(/^matrix\(([^,]+),/);
    if (match) {
        return Math.abs(parseFloat(match[1]));
    }
    return 1.0;
}

// Read files dropped from the OS via HTML5 drag-and-drop.
// @canopy-type readDroppedFile : File -> String -> Task String String
function _DnD_readDroppedFile(file, readAs) {
    return _Scheduler_binding(function(callback) {
        var reader = new FileReader();
        reader.onload = function() {
            callback(_Scheduler_succeed(reader.result));
        };
        reader.onerror = function() {
            callback(_Scheduler_fail('Failed to read file: ' + file.name));
        };
        if (readAs === 'text') {
            reader.readAsText(file);
        } else if (readAs === 'dataUrl') {
            reader.readAsDataURL(file);
        } else if (readAs === 'arrayBuffer') {
            reader.readAsArrayBuffer(file);
        } else {
            callback(_Scheduler_fail('Unknown read mode: ' + readAs));
        }
    });
}
