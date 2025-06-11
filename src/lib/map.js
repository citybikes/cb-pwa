const THRESHOLD = 400

function MapInteractor(map) {
  this.map = map

  this.pointerUp = null
  this.pointerDown = null
  this.pointerEv = null

  this.clickUp = null
  this.clickDown = null
  this.clickEv = null
}

MapInteractor.prototype.init = function (onSingleTouch) {
  this.map.on('touchstart', (e) => {
    console.log('touchstart', e)
    // pinch zoom
    if (e.originalEvent.touches.length > 1) return

    const now = performance.now()
    // < THRESHOLD since last touch, possibly a double tap
    if (now - this.pointerUp < THRESHOLD) {

    } else {
      // possible normal touch
      setTimeout(() => {
        const now = performance.now()
        // double tap
        if (now - this.pointerDown < THRESHOLD) return
        // still pressing so its a drag ?
        if (now - this.pointerUp > THRESHOLD) return
        // compare x,y of up and down to see if it was a drag event
        const { x, y } = this.pointerEv.point
        if (x != e.point.x || y != e.point.y) return
        onSingleTouch(e)
      }, THRESHOLD)
    }
    this.pointerDown = now
  })

  this.map.on('touchend', (e) => {
    console.log('touchend', e)
    this.pointerUp = performance.now()
    this.pointerEv = e
  })

  this.map.on('mousedown', (e) => {
    // ignore touch events (yes, maplibre does this)
    if (e.originalEvent.sourceCapabilities.firesTouchEvents) return

    console.log('mousedown', e)
    const now = performance.now()
    // possible double click
    if (now - this.clickUp < THRESHOLD) {

    } else {
      setTimeout(() => {
        const now = performance.now()
        // double click
        if (now - this.clickDown < THRESHOLD) return
        // long click ?
        if (now - this.clickUp > THRESHOLD) return
        // compare x,y of up and down to see if it was a drag event
        const { x, y } = this.clickEv.point
        if (x != e.point.x || y != e.point.y) return
        onSingleTouch(e)
      }, THRESHOLD)
    }
    this.clickDown = now
  })

  this.map.on('mouseup', (e) => {
    // ignore touch events (yes, maplibre does this)
    if (e.originalEvent.sourceCapabilities.firesTouchEvents) return
    console.log('mouseup', e)
    this.clickUp = performance.now()
    this.clickEv = e
  })
}

export { MapInteractor }
