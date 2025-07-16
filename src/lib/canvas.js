/* A canvas wrapper with some utility functions:
 * resizes to width / height
 * handles pixel density
 * paints stored entities
 */

// XXX Optimize update / draw since this is now called on requestAnimationFrame


const DEBUG_HITBOX = false
const DEBUG_PAINT_MS = false

function Canvas(canvas, ctx, w, h) {
  this.canvas = canvas
  this.ctx = ctx
  this.entities = []
  this.w = w
  this.h = h
  this.dirty = true

  this._trackPixelRatio()
}

Canvas.prototype._trackPixelRatio = function () {
  const mqString = `(resolution: ${window.devicePixelRatio}dppx)`
  const media = matchMedia(mqString)

  const updatePixelRatio = () => {
    media.removeEventListener("change", updatePixelRatio)
    media.addEventListener("change", updatePixelRatio)
    console.log("updating pixel ratio...")
    this.resize()
  }
  updatePixelRatio()
}

Canvas.prototype.resize = function () {
  console.log("Canvas resize")
  this.scale = window.devicePixelRatio

  this.canvas.style.width = `${this.w}px`
  this.canvas.style.height = `${this.h}px`
  this.canvas.width = Math.floor(this.w * this.scale)
  this.canvas.height = Math.floor(this.h * this.scale)

  this.cx = this.w / 2
  this.cy = this.h / 2

  this.ctx.reset()
  this.ctx.scale(this.scale, this.scale)

  this.entities.forEach((e) => e.resize())
  this.invalidate()
}

Canvas.prototype.paint = function () {
  const t0 = performance.now()

  const ctx = this.ctx

  ctx.clearRect(0, 0, this.w, this.h)
  // XXX rename to paint for consistency
  this.entities.forEach((e) => e.draw(ctx))

  ctx.font = "bold 12px 'Inter Variable', ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = '#555'
  ctx.lineWidth = 2
  ctx.strokeStyle = '#FFF'
  ctx.strokeText("CityBikes", 20, this.h - 20)
  ctx.fillText("CityBikes", 20, this.h - 20)

  const t1 = performance.now()
  if (DEBUG_PAINT_MS) {
    ctx.fillStyle = '#000'
    ctx.fillText(`${(t1 - t0)} ms`, 20, this.h - 40)
    ctx.fillText(`${t1}`, 20, this.h - 60)
  }

  this.dirty = false
}

Canvas.prototype.update = function () {
  this.entities.forEach((e) => e.update())
}

Canvas.prototype.animate = function () {
  this.entities.forEach((e) => e.animate())
}

Canvas.prototype.invalidate = function () {
  this.dirty = true
  this.update()
}

Canvas.prototype.add = function (entity) {
  entity._c = this
  entity.canvas = this.canvas
  entity.ctx = this.ctx
  // ?? maybe ??
  entity.resize()
  this.entities.push(entity)
  this.invalidate()
}

Canvas.prototype.click = function(ev) {
  const { x, y } = ev.point
  const ent = this.hit(x, y)

  if (!ent) return [false]

  return [true, ent.click(ev)]
}

Canvas.prototype.hit = function(x, y) {
  for (let i = 0; i < this.entities.length; i++) {
    if (this.entities[i].hit(x, y)) return this.entities[i]
  }
}

function CoarsePointer(map, { ...opts } = {}) {
  opts = {
    latlng: undefined,
    onscreen: false,
    offscreen: true,
    bg: [255, 0, 0],
    fg: [0, 0, 255],
    onClick: () => {},
    ...opts
  }
  const l = 75

  this.map = map
  this.lat = opts.latlng ? opts.latlng[0] : null
  this.lng = opts.latlng ? opts.latlng[1] : null
  this.onscreen = opts.onscreen
  this.offscreen = opts.offscreen
  this.onClick = opts.onClick

  this.bg = opts.bg
  this.fg = opts.fg

  this.l = l
  this.angle = 0
  this.proj = { x: 0, y: 0 }

  this.fat_finger_threshold = 1.25
}

CoarsePointer.prototype.onScreen = function () {
  return this.proj.x > 0 && this.proj.y > 0
        && this.proj.x < this._c.w && this.proj.y < this._c.h
}

CoarsePointer.prototype.visible = function () {
  return (this.lat && this.lng && (this.onScreen() ? this.onscreen : this.offscreen))
}

CoarsePointer.prototype.resize = function () {}

CoarsePointer.prototype.update = function () {
  if (!this.lat || !this.lng) return

  const proj = this.map.project([this.lng, this.lat])

  const x = Math.min(Math.max(proj.x, 0), this._c.w)
  const y = Math.min(Math.max(proj.y, 0), this._c.h)
  const angle = Math.atan2(y - this._c.cy, x - this._c.cx)

  const r = Math.hypot(x - this._c.cx, y - this._c.cy) * 0.8 - 25

  this.angle = angle - Math.PI / 2 // lerpAngle(this.angle, angle, 0.1)
  this.x = Math.cos(angle) * r + this._c.cx
  this.y = Math.sin(angle) * r + this._c.cy
  this.r = r
  this.proj = proj
}

CoarsePointer.prototype.draw = function (ctx) {
  if (!this.lat || !this.lng) return

  if (!this.visible()) return

  const l = this.l
  const bg = this.bg
  const fg = this.fg

  ctx.save()

  ctx.translate(this.x, this.y)
  ctx.rotate(this.angle)

  ctx.beginPath()
  ctx.fillStyle = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 1)`
  ctx.strokeStyle = `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, 1)`
  ctx.lineWidth = 2
  ctx.moveTo(0, 0)
  ctx.lineTo(l / 5, -l / 2)
  ctx.lineTo(-l / 5, -l / 2)
  ctx.lineTo(0, 0)
  ctx.fill()
  ctx.stroke()

  ctx.restore()

  if (DEBUG_HITBOX) {
    ctx.beginPath()
    const {cx, cy, radius} = this.hitbox()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

CoarsePointer.prototype.click = function (ev) {
  return this.onClick(ev, this)
}

CoarsePointer.prototype.hitbox = function() {
  const dspl = this.l/3.4
  const center = [
    this.x + (dspl * Math.sin(this.angle)),
    this.y - (dspl * Math.cos(this.angle)),
  ]
  const radius = dspl * this.fat_finger_threshold

  return {cx: center[0], cy: center[1], radius: radius}
}

CoarsePointer.prototype.hit = function (x, y) {
  // If it's not visible, surely it can't be hit
  if (! this.visible()) return false

  const {cx, cy, radius} = this.hitbox()

  const dx = x - cx
  const dy = y - cy

  return (dx * dx + dy * dy) <= (radius * radius)
}

CoarsePointer.prototype.animate = function () {}


class POV {

  map
  aperture = Math.PI * 2 * 0.3

  lat
  lng
  x
  y

  w = 8
  pov_size = 25
  bg
  fg

  constructor(map, { ... opts } = {}) {
    opts = {
      latlng: undefined,
      bg: [255, 0, 0],
      fg: [0, 0, 255],
      ...opts
    }

    this.map = map
    this.lat = opts.latlng ? opts.latlng[0] : null
    this.lng = opts.latlng ? opts.latlng[1] : null
    this.bg = opts.bg ?? [255, 0, 0]
    this.fg = opts.fg ?? [0, 0, 255]
  }

  angleDelta(a, b) {
    const diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
    return diff < -Math.PI ? diff + 2 * Math.PI : diff;
  }

  update() {
    if (this.lat == undefined || this.lng == undefined) return

    const zoom = Math.max(this.map.getZoom(), 1)
    const proj = this.map.project([this.lng, this.lat])

    this.x = proj.x
    this.y = proj.y
    this.pov_size = 10 * zoom * 0.4

    const bg = this.bg
    const fg = this.fg

    this.gradient = this._c.ctx.createRadialGradient(0, 0, 0, 0, 0, this.pov_size)
    this.gradient.addColorStop(0, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0.8)`)
    this.gradient.addColorStop(1, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0)`)

    this.fill = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 1)`
    this.stroke = `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, 1)`
  }

  hit(x, y) {
    // If it's not visible, surely it can't be hit
    if (! this.visible()) return false

    const radius = this.w
    const dx = x - this.x
    const dy = y - this.y

    return (dx * dx + dy * dy) <= (radius * radius)
  }

  click() {}
  resize() {}

  visible() {
    return this.lat && this.lng &&
           this.x > - 100 && this.y > - 100 &&
           this.x < this._c.w + 100 && this.y < this._c.h + 100
  }

  draw(ctx) {

    if (!this.visible()) return

    if (this.angle != null) {
      // POV Cone
      ctx.save()

      ctx.translate(this.x, this.y)
      ctx.rotate(this.angle - Math.PI / 2 - this.aperture / 2)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(
        this.pov_size * Math.cos(0),
        this.pov_size * Math.sin(0)
      )
      ctx.arc(0, 0, this.pov_size, 0, this.aperture)
      ctx.lineTo(0, 0)

      ctx.fillStyle = this.gradient
      ctx.fill()

      ctx.restore()
    }

    // Position marker
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.w, 0, Math.PI * 2)

    ctx.fillStyle = this.fill
    ctx.strokeStyle = this.stroke
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
  }

  get angle () {
    return this._angle
  }

  set angle(value) {
    this._targetAngle = value

    if (this._angle == null) {
      this._c.invalidate()
      this._angle = value
    }

    if (!this.visible())
      this._angle = value
  }

  animate () {
    if (this.angle == null || this.angle == this._targetAngle) return

    const delta = this.angleDelta(this.angle, this._targetAngle)
    if (Math.abs(delta) < 0.2) {
       // ignore
    } else {
      this._angle += delta * 0.1
      this._c.invalidate()
    }
  }
}

export { Canvas, CoarsePointer, POV }
