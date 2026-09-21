import '@testing-library/jest-dom'

/**
 * jsdom does not implement the browser APIs Radix uses to place and drive a
 * popover — pointer capture, scrolling an item into view, observing a resize.
 * They are not stubbed to make a test pass: without them Radix throws while
 * OPENING the listbox, so the component under test never renders at all.
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
