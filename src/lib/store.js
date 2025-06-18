import { writable, derived } from 'svelte/store'

import { LngLat } from 'maplibre-gl'

import { NetworkManager } from './network_manager.js'

export const selectedStation = writable(null)
export const loading = writable(false)

let last_zoom
let last_center
let last_filter

try {
  last_zoom = parseInt(localStorage.getItem('last_zoom'))
  last_center = LngLat.convert(JSON.parse(localStorage.getItem('last_center')))
  last_filter = JSON.parse(localStorage.getItem('last_filter'))
} catch (error) {
  console.log("err", error)
  last_zoom = null
  last_center = null
  last_filter = null
}

export const zoom = writable(last_zoom)
export const center = writable(last_center)
export const bearing = writable({
  bearing: 0,
  pitch: 0,
  pitchInRadians: 0,
  roll: 0,
})

// Persist zoom and center to local storage
zoom.subscribe( async (z) => {
  localStorage.setItem('last_zoom', z)
})

center.subscribe( async (c) => {
  localStorage.setItem('last_center', JSON.stringify(c))
})

export const locationState = writable("OFF")

export const visible_networks_id = writable([])
export const network_filter = writable(last_filter || {name: null, tags: null})
export const filter_hydrated = writable(false)
