export function getStdColor(str) {
  const _c = document.createElement("canvas")
  const ctx = _c.getContext("2d")

  _c.height = 1
  _c.width = 1

  ctx.fillStyle = str
  ctx.fillRect(0, 0, 1, 1)
  const ret = ctx.getImageData(0, 0, 1, 1).data

  _c.remove()
  return ret
}
