import { get, writable } from 'svelte/store'

const LOC_OFF = "OFF"
const LOC_WATCHING = "WATCHING"
const LOC_TRACKING = "TRACKING"
const LOC_LOCKING = "LOCKING"
const LOC_ERROR = "ERROR"

const ACC_LOW  = "LOW"
const ACC_HIGH = "HIGH"

const defaults = {
  accuracy: ACC_LOW,
  timeout: 6000,
  state: writable(LOC_OFF),
  maximumAge: 0,
}

const geo = window.navigator.geolocation

// XXX really fuck the acceleremeter shit bullshit
function Locator (options) {
  this.options = { ...defaults, ...options }
  this.watchId = null
  this.position = null

  this.state = this.options.state
  this.desiredState = get(this.state)
}

Locator.prototype.supported = () => !!geo
Locator.prototype.loc_update_event = ({...args}) => new CustomEvent("loc-update", {detail: args})

Locator.prototype.watchOptions = function () {
  return {
    enableHighAccuracy: this.options.accuracy == ACC_HIGH,
    timeout: this.options.timeout,
    // device can return a cached (age) position
    // 0: means no-cache
    maximumAge: this.options.maximumAge,
  }
}

Locator.prototype.watch = function (options) {
  let opt = { ... this.watchOptions(), ... (options || {}) }
  // there's also getCurrentPosition play with that
  geo.clearWatch(this.watchId)

  this.state.set(LOC_WATCHING)

  this.watchId = geo.watchPosition(
    (position) => {
      this.state.set(this.desiredState)
      this.position = position
      window.dispatchEvent(this.loc_update_event({position, state: get(this.state)}))
    },
    (error) => {
      console.log(error.code, error.message)
      switch(error.code) {
        // permission denied
        case 1:
        // internal error
        case 2:
          this.kill()
          break
        case 3:
          // Keep trying to get position, but do not lock
          this.desiredState = LOC_TRACKING
          this.state.set(LOC_ERROR)
          break
        default:
          throw new Exception(`Unhandled error code ${error.code}: ${error.message}`)
      }
    },
    opt
  )
}

Locator.prototype.unlock = function () {
  switch(get(this.state)) {
    case LOC_LOCKING:
      console.log("Setting to tracking only")
      this.state.set(LOC_TRACKING)
      this.desiredState = LOC_TRACKING
      break
  }
}

Locator.prototype.track = function (options) {
  this.desiredState = LOC_TRACKING
  this.watch(options)
}

Locator.prototype.lock = function (options) {
  this.desiredState = LOC_LOCKING

  if (!this.watchId) {
    this.watch(options)
    return
  }

  switch(get(this.state)) {
    case LOC_TRACKING:
      this.state.set(LOC_LOCKING)
      break
  }
}

Locator.prototype.kill = function () {
  geo.clearWatch(this.watchId)
  this.watchId = null
}

export {
  Locator,
}
