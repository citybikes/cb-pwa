/* A canvas wrapper with some utility functions:
 * resizes to width / height
 * handles pixel density
 * paints stored entities
 */

// XXX Optimize update / draw since this is now called on requestAnimationFrame

function Canvas(canvas, ctx, w, h) {
  this.canvas = canvas
  this.ctx = ctx
  this.entities = []
  this.w = w
  this.h = h

  this._trackPixelRatio()
}

Canvas.prototype._trackPixelRatio = function () {
  const mqString = `(resolution: ${window.devicePixelRatio}dppx)`
  const media = matchMedia(mqString)

  const updatePixelRatio = () => {
    media.removeEventListener("change", updatePixelRatio)
    media.addEventListener("change", updatePixelRatio)
    this.resize()
  }
  updatePixelRatio()
}

Canvas.prototype.resize = function () {
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
}

Canvas.prototype.paint = function () {
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
}

Canvas.prototype.update = function () {
  this.entities.forEach((e) => e.update())
}

Canvas.prototype.add = function (entity) {
  entity._c = this
  entity.canvas = this.canvas
  entity.ctx = this.ctx
  // ?? maybe ??
  entity.resize()
  this.entities.push(entity)
}

function CoarsePointer(map, latlng, bg, fg, onscreen, offscreen) {
  const l = 75

  this.map = map
  this.lat = latlng ? latlng[0] : null
  this.lng = latlng ? latlng[1] : null
  this.onscreen = onscreen === undefined ? false : onscreen
  this.offscreen = offscreen === undefined ? true : offscreen

  this.bg = bg ?? [255, 0, 0]
  this.fg = fg ?? [0, 0, 255]

  this.l = l
  this.angle = 0
  this.proj = { x: 0, y: 0 }
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
  ctx.moveTo(0, 0)
  ctx.lineTo(l / 5, -l / 2)
  ctx.lineTo(-l / 5, -l / 2)
  ctx.lineTo(0, 0)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

CoarsePointer.prototype.click = function (ev) {
  if (!this.lat || !this.lng) return

  if (!this.visible()) return

  const zoom = Math.max(this.map.getZoom(), 15)
  const center = [this.lng, this.lat]
  this.map.easeTo({ center: center, zoom: zoom })
}


function POV(map, latlng, bg, fg) {
  this.map = map

  // angle relative to canvas, 0 north, clockwise
  this.angle = null
  // view cone
  this.aperture = Math.PI * 2 * 0.3

  this.lat = latlng[0]
  this.lng = latlng[1]

  this.pov_size = 25
  this.point_size = 50

  this.bg = bg ?? [255, 0, 0]
  this.fg = fg ?? [0, 0, 255]

  this.l = 8
}

POV.prototype.update = function () {
  const zoom = Math.max(this.map.getZoom(), 1)
  const proj = this.map.project([this.lng, this.lat])

  this.x = proj.x
  this.y = proj.y
  this.pov_size = 10 * zoom * 0.4
}

POV.prototype.click = function () {}

POV.prototype.resize = function () {}

POV.prototype.visible = function () {
  return this.lat && this.lng
}

POV.prototype.draw = function (ctx) {

  const bg = this.bg
  const fg = this.fg

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

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.pov_size)
    gradient.addColorStop(0, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0.8)`)
    gradient.addColorStop(1, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0)`)

    // gradient.addColorStop(0, "rgba(0, 150, 255, 0.8)")
    // gradient.addColorStop(1, "rgba(0, 150, 255, 0)")

    ctx.fillStyle = gradient
    ctx.fill()

    ctx.restore()
  }

  // Position marker
  ctx.beginPath()
  ctx.arc(this.x, this.y, this.l, 0, Math.PI * 2)

  // ctx.fillStyle = '#007bff'
  // ctx.strokeStyle = 'white';
  ctx.fillStyle = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 1)`
  ctx.strokeStyle = `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, 1)`
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}


export { Canvas, CoarsePointer, POV }
