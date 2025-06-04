import { writable } from 'svelte/store'

export const selectedStation = writable(null)
export const loading = writable(false)

const last_zoom = localStorage.getItem('last_zoom') ?? undefined
const last_center = localStorage.getItem('last_center') ?? undefined

export const zoom = writable(null)
export const center = writable(null)

// Persist zoom and center to local storage
zoom.subscribe( async (z) => {
  localStorage.setItem('last_zoom', z)
})

center.subscribe( async (c) => {
  localStorage.setItem('last_center', JSON.stringify(c))
})
