import { writable } from 'svelte/store'

import { LngLat } from 'maplibre-gl'

export const selectedStation = writable(null)
export const loading = writable(false)

let last_zoom
let last_center

try {
  last_zoom = parseInt(localStorage.getItem('last_zoom'))
  last_center = LngLat.convert(JSON.parse(localStorage.getItem('last_center')))
} catch (error) {
  console.log("err", error)
  last_zoom = null
  last_center = null
}

export const zoom = writable(last_zoom)
export const center = writable(last_center)

// Persist zoom and center to local storage
zoom.subscribe( async (z) => {
  localStorage.setItem('last_zoom', z)
})

center.subscribe( async (c) => {
  localStorage.setItem('last_center', JSON.stringify(c))
})

export const locationState = writable("OFF")
