const THRESHOLD = 400

function MapInteractor(map) {
  this.map = map

  this.events = []

  this.pointerUp = null
  this.pointerDown = null
  this.pointerEv = null

  this.clickUp = null
  this.clickDown = null
  this.clickEv = null
}

MapInteractor.prototype.init = function (onSingleTouch) {
  this.map._container.addEventListener('pointerdown', (e) => {
    e.point = {
      x: parseInt(e.x),
      y: parseInt(e.y),
    }
    this.events.push(e)
    // disable for multi touch
    if (this.events.length > 1) return

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

  this.map._container.addEventListener('pointerup', (e) => {
    e.point = {
      x: parseInt(e.x),
      y: parseInt(e.y),
    }
    this.events.pop()
    this.pointerUp = performance.now()
    this.pointerEv = e
  })
}

export { MapInteractor }
