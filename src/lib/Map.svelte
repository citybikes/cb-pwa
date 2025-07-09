<script>
import { get } from 'svelte/store'
import { onMount, onDestroy } from 'svelte'
import { tick } from 'svelte'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from "pmtiles"
let protocol = new Protocol()
maplibregl.addProtocol("pmtiles",protocol.tile)

// import only as needed
import * as turf from '@turf/turf'

import { Canvas, CoarsePointer, POV } from './canvas.js'
import { Locator } from './locator.js'
import { getStdColor } from './utils.js'
import { MapInteractor } from './map.js'
import { NetworkManager } from './network_manager.js'

import { selectedStation, loading, locationState } from './store.js'
import { visible_networks_id, network_filter } from './store.js'
import { filter_hydrated } from './store.js'
import { center, zoom, bearing } from './store.js'

const DEBUG_FPS = false

const setFilter = async ({name, tags}) => {
  // Who the fuck invented this syntax.
  // Get out of here ASAP and do filtering on your own end
  const name_filter = name ? ["==", ["get", "nname"], name] : null
  map.setFilter(layers.stations.id, name_filter)
  map.setFilter(layers.stations_labels.id, name_filter)
  map.setFilter(layers.stations_status_labels.id, name_filter)

  const nets_filter = tags ? ["in", ["get", "tag"], ["literal", tags]] : null
  map.setFilter(layers.stations_lite.id, nets_filter)
  map.setFilter(layers.hulls_net.id, nets_filter)
  map.setFilter(layers.hull_labels.id, nets_filter)
  loadVisibleNets(true)
}


const update_info = (element) => {
  if (element == null) {
    selectedStation.set(null)
    return
  }

  const sts = stmap[element.properties.id]

  let distance

  // XXX
  if (pov) {
    distance = turf.distance([pov.lng, pov.lat], element.geometry.coordinates)
  }

  selectedStation.set({
    ...sts,
    ... { distance: distance },
  })
}


loading.set(true)

// XXX Move all this shit to its own place

let loc = [2.1734035, 41.3850639]
let selected

let cwrapper

const default_zoom = 15
const max_zoom = 18

// XXX hardcode
const red = getStdColor("#E33033")
const yellow = getStdColor("#FFB43F")
const green = getStdColor("#009933")

const getFgColor = () => getStdColor(window.getComputedStyle(document.body).getPropertyValue('--text-main'))
const getBgColor = () => getStdColor(window.getComputedStyle(document.body).getPropertyValue('--background'))

let fg = getFgColor()
let bg = getBgColor()

const data = turf.featureCollection([])

const networks = new NetworkManager()

const locator = new Locator({
  state: locationState,
  timeout: Infinity,
  accuracy: "HIGH",
})

const sources = {
  stations_lite: {
    type: 'vector',
    url: 'pmtiles://layers/stations.pmtiles',
  },
  hulls: {
    type: 'vector',
    url: 'pmtiles://layers/hulls.pmtiles',
  },
  stations: {
    type: 'geojson',
    data: data,
    generateId: false,
    promoteId: 'id',
  }
}

const layers = {
  stations: {
    id: 'stations',
    type: 'circle',
    source: 'stations',
    minzoom: 5,
    paint: {
      'circle-radius': [
          'let', 'selected',
              ['case', ['boolean', ['feature-state', 'selected'], false], 1.2, 1],
              [
                // XXX Maybe tune these
                'interpolate', ['linear'], ['zoom'],
                8,    ['*', ['var', 'selected'], 0.5 ],
                10,   ['*', ['var', 'selected'], 2   ],
                12,   ['*', ['var', 'selected'], 4   ],
                15,   ['*', ['var', 'selected'], 8   ],
                22,   ['*', ['var', 'selected'], 18  ],
              ]
      ],
      'circle-color': [
          'match',
          ['get', 'status'],
          'green', '#009933',
          'yellow', '#FFB43F',
          'red', '#E33033',
          'rgba(84, 7, 91, 0.7)',
      ],
      'circle-stroke-color': '#111',
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        10.0, 0,
        10.5,   ['case', ['boolean', ['feature-state', 'selected'], false], 3, 0],
      ],
      'circle-opacity': [
        // XXX Maybe tune these
        'interpolate', ['linear'], ['zoom'],
        10,  0.0,
        11,  1.0 ,
      ]
    }
  },
  hulls: {
    id: 'hulls',
    type: 'line',
    source: 'hulls',
    'source-layer': 'tag_hulls',
    paint: {
      'line-color': '#000',
      'line-width': 1,
      'line-opacity': [
        // XXX Maybe tune these
        'interpolate', ['linear'], ['zoom'],
        0,   1.0 ,
        8,   0.5 ,
        12,  0 ,
      ]
    }
  },
  hulls_fill: {
    id: 'hulls-fill',
    type: 'fill',
    source: 'hulls',
    'source-layer': 'tag_hulls',
    paint: {
      'fill-color': '#000',
      'fill-opacity': [
        // XXX Maybe tune these
        'interpolate', ['linear'], ['zoom'],
        0,   1.0 ,
        5,   0.5 ,
        8,   0.3 ,
        10,  0 ,
      ]
    }
  },
  hulls_net: {
    id: 'hulls_net',
    type: 'line',
    source: 'hulls',
    'source-layer': 'tag_hulls_net',
    paint: {
      'line-color': '#000',
      'line-width': 1,
      'line-opacity': 0.3,
      'line-dasharray': [2, 2],
    }
  },
  hulls_net_inv: {
    id: 'hulls-net-inv',
    type: 'fill',
    source: 'hulls',
    'source-layer': 'tag_hulls_net',
    paint: {
      'fill-opacity': 0,
    }
  },
  stations_labels: {
    id: 'stations-labels',
    type: 'symbol',
    source: 'stations',
    minzoom: 16,
    layout: {
      // WTF
      // https://docs.mapbox.com/style-spec/reference/layers/#symbol
      // https://docs.mapbox.com/style-spec/reference/expressions/#types-format
      "text-field": '{nname}',
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "symbol-placement": "point",
      "text-variable-anchor": ["top"],
      "text-offset": [0, 1.5],
    },
    paint: {
      "text-color": "#000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    }
  },
  stations_status_labels: {
    id: 'stations-status-labels',
    type: 'symbol',
    source: 'stations',
    minzoom: 14,
    layout: {
      "text-field": '{bikes}',
      "text-font": ["Noto Sans Regular"],
      "text-size": [
        'interpolate', ['linear'], ['zoom'],
        15, 8,
        18, 12,
      ],
      "symbol-placement": "point",
      "text-offset": [0, 0],
      "text-justify": "center",
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#fff",
      "text-halo-color": "#ffffff",
      "text-halo-width": 0.3,
    }
  },
  hull_labels: {
    id: 'hull-labels',
    type: 'symbol',
    source: 'hulls',
    minzoom: 14,
    'source-layer': 'tag_hulls_net',
    layout: {
      "symbol-placement": "line",
      // WTF
      // https://docs.mapbox.com/style-spec/reference/layers/#symbol
      // https://docs.mapbox.com/style-spec/reference/expressions/#types-format
      "text-field": '{tag}',
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-anchor": "bottom",
    },
    paint: {
      "text-color": "#000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    }
  },
  stations_lite: {
    id: 'stations-lite',
    type: 'circle',
    minzoom: 8,
    maxzoom: 20,
    source: 'stations-lite',
    'source-layer': 'stations',
    paint: {
      'circle-radius': [
         // XXX Maybe tune these
         'interpolate', ['linear'], ['zoom'],
          8  ,   0.5  ,
         10  ,   2    ,
         12  ,   4    ,
         15  ,   8    ,
         22  ,   18   ,
      ],
      'circle-color': 'rgba(100, 100, 100, 1)',
      'circle-opacity': [
        // XXX Maybe tune these
        'interpolate', ['linear'], ['zoom'],
        0,   0.0 ,
        9,   1.0 ,
       11,   0.3 ,
      ]
    }
  },
  outliers: {
    id: 'outliers',
    type: 'circle',
    source: 'hulls',
    'source-layer': 'outliers',
    maxzoom: 8,
    paint: {
      'circle-radius': [
          'let', 'selected',
              ['case', ['boolean', ['feature-state', 'selected'], false], 2, 1],
              [
                // XXX Maybe tune these
                'interpolate', ['linear'], ['zoom'],
                8,    ['*', ['var', 'selected'], 0.5 ],
                10,   ['*', ['var', 'selected'], 2   ],
                12,   ['*', ['var', 'selected'], 4   ],
                15,   ['*', ['var', 'selected'], 8   ],
                22,   ['*', ['var', 'selected'], 18  ],
              ]
      ],
      'circle-color': 'rgba(100, 100, 100, 1)',
      'circle-stroke-color': '#555',
      'circle-stroke-width': 1,
    }
  },
}


const resize = () => {
  console.log("Resize")
  const info = document.querySelector('.infobox') ?? {}

  const container = document.querySelector('.map-container')
  const w = container.offsetWidth
  const h = container.offsetHeight - (info.offsetHeight ?? 0)

  cwrapper.w = w
  cwrapper.h = h

  cwrapper.resize()
}

function angleDelta(a, b) {
  const diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  return diff < -Math.PI ? diff + 2 * Math.PI : diff;
}

let targetAngle = null

let stats = null

if (DEBUG_FPS) {
  import('stats.js').then((Stats) => {
    stats = new Stats.default()
    stats.dom.style.cssText += 'margin: 65px 0 0 10px;'
    document.body.appendChild(stats.dom)
  })
}


const animate = () => {
  if (stats) stats.begin()
  // XXX this could be done in the canvas element on itself ...
  if (targetAngle != null && pov != null && pov.angle != targetAngle) {
    if (pov.visible()) {
      const delta = angleDelta(pov.angle, targetAngle)
      if (Math.abs(delta) < 0.2) {
        // ignore delta
      } else {
        // lerp to angle
        pov.angle += delta * 0.1
        cwrapper.invalidate()
      }
    }
  }

  if (cwrapper.dirty) {
    cwrapper.paint()
  }

  if (stats) stats.end()

  requestAnimationFrame(animate)
}


let map
const stmap = {}
const net_promises = {}
let pov, pov_pointer, selected_pointer

// We can make this use a store so we can use it as a state (to generate filtering)
const getVisibleNets = (map) => {
  if (map.getZoom() < 10) return new Set()

  // Query for invisible rendered hull polygons to see what networks are
  // visible, and also stations (XXX add tag info to outliers)
  const t_layers = [layers.stations_lite.id, layers.hulls_net_inv.id]

  const nets = new Set(
    map.queryRenderedFeatures(map.getBounds(), {layers: t_layers})
      .map(f => f.properties.tag)
  )

  return nets
}

let visible_nets = new Set()

const loadVisibleNets = (force = false) => {
  const nets = getVisibleNets(map)
  const filter = get(network_filter)
  const filter_applies = filter.tags && filter.tags.some(t => nets.has(t))
  console.log("Load visible nets", force, filter, filter_applies)

  // XXX Only set store if something changed since this triggers UI changes
  if (visible_nets.difference(nets).size == 0 &&
      nets.difference(visible_nets).size == 0 &&
      !force)
    return

  console.log("Really doing it")

  visible_networks_id.set(nets)
  visible_nets = nets

  nets.forEach( n => {
    // do not load networks that are filtered out if never loaded
    if (filter_applies && filter.tags && ! filter.tags.includes(n)) return

    if (networks.loaded(n)) return

    loading.set(true)

    networks.getNetwork(n).then(d => {
      d.network.stations.forEach((st) => {
        stmap[st.id] = st
      })

      const dd = d.network.stations.map((st) => {
        // set station on our own data source
        stmap[st.id] = st

        // normalize coord precision
        const coords = [st.longitude.toFixed(6), st.latitude.toFixed(6)]
        // generate smallest feature to decr. mapbox memory usage
        const _st = {
          id: st.id,
          name: st.name,
          nname: d.network.name,
          bikes: st.free_bikes,
          // precalculate color based on status (easy filter)
          // If we need to update data, then this should not be
          // precalculated but done using expressions
          status: st.free_bikes > 5 ? 'green' : st.free_bikes > 0 ? 'yellow' : 'red'
        }
        return turf.point(coords, _st)
      })

      // involves multiple calls to setData possibly invalidating caches
      // and so on, but makes everything feel snappier
      // XXX updateData(data) does not work: recreate and report bug
      data.features = [...data.features, ...dd]
      map.getSource('stations').setData(data)
    })
  })

  networks.all.then(() => {
    loading.set(false)
  })
}

onMount(() => {

  const canvas = document.getElementById("map-overlay")
  const ctx = canvas.getContext("2d")

  cwrapper = new Canvas(canvas, ctx)
  resize()

  selectedStation.subscribe(async (station) => {
    // If needed, move this to requestAnimationFrame and forget
    // about it.
    await tick()
    resize()
  })

  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.citybik.es/styles/basic-preview/style.json',
    attributionControl: false,
    maxZoom: max_zoom,
    center: get(center) ?? loc,
    zoom: get(zoom) ?? default_zoom,
  })

  if (DEBUG_FPS) {
    import('stats.js').then((Stats) => {
      const stats = new Stats.default()
      stats.dom.style.cssText += 'margin: 10px;'
      document.body.appendChild(stats.dom)
      const orig = map._render
      map._render = (...args) => {
        stats.begin()
        const res = orig.apply(map, args)
        stats.end()
        return res
      }
    })
  }

  const map_i = new MapInteractor(map)

  // XXX go figure
  selected_pointer = new CoarsePointer(map, null, null, [0,0,0], false, true)
  cwrapper.add(selected_pointer)

  map.on('load', async () => {
    map.addSource('stations-lite', sources.stations_lite)
    map.addSource('hulls', sources.hulls)
    map.addSource('stations', sources.stations)

    // Woah, that's a lot of layers :)
    map.addLayer(layers.hulls)
    map.addLayer(layers.hulls_fill)
    map.addLayer(layers.stations_lite)
    map.addLayer(layers.outliers)
    map.addLayer(layers.hulls_net)
    map.addLayer(layers.hulls_net_inv)
    map.addLayer(layers.hull_labels)
    map.addLayer(layers.stations_labels)
    map.addLayer(layers.stations)
    map.addLayer(layers.stations_status_labels)

    network_filter.subscribe(setFilter)

    map.on('resize', (ev) => {
      resize()
      loadVisibleNets()
    })

    map.on('move', (ev) => {
      // Makes it so canvas elements that depend on map projection move
      // smoothly together with the map
      cwrapper.invalidate()
      cwrapper.paint()

      loadVisibleNets()
    })

    map.on('dragstart', (ev) => {
      locator.unlock()
    })

    map.on('moveend', (ev) => {
      center.set(map.getCenter())
      zoom.set(map.getZoom())
    })

    map.on('zoomend', (ev) => {
      center.set(map.getCenter())
      zoom.set(map.getZoom())
    })

    map.on('click', (ev) => {
      console.log('click', ev)
      fireEvent(ev)
    })

    map.once('idle', (ev) => {
      filter_hydrated.set(true)
      loadVisibleNets()
    })

    let canvas_element_clicked = false

    function deselectEvent(ev) {
      const { x, y } = ev.point

      // ack possible canvas element clicked and do nothing
      // XXX this is rube goldberg-y
      if (canvas_element_clicked) {
        canvas_element_clicked = false
        return
      }

      if (map.getZoom() < 10) return

      // Instead of precise clicking layer elements, add a fat finger threshold
      // to check what features are around that point
      const threshold = map.getZoom() * 0.8

      // Set `bbox` as 5px reactangle area around clicked point.
      // XXX is this enough? too much? maybe should be dependent on the zoom
      // level and other stuff ?
      const bbox = [
          [ev.point.x - threshold, ev.point.y - threshold],
          [ev.point.x + threshold, ev.point.y + threshold]
      ]

      const selectedFeatures = map.queryRenderedFeatures(bbox, {
          layers: ['stations'],
      })

      if (selectedFeatures.length == 0) {
        map.removeFeatureState({source: 'stations'})
        selected = null
        update_info(null)
        selected_pointer.lat = null
        selected_pointer.lng = null
        return
      }
    }

    map_i.init(deselectEvent)

    function fireEvent(ev) {
      const { x, y } = ev.point

      for (let i = 0; i < cwrapper.entities.length; i++) {
        if (cwrapper.entities[i].hit(x, y)) {
          cwrapper.entities[i].click(ev)
          canvas_element_clicked = true
          locator.unlock()
          return
        }
      }

      if (map.getZoom() < 10) return

      // Instead of precise clicking layer elements, add a fat finger threshold
      // to check what features are around that point
      const threshold = map.getZoom() * 0.8

      // Set `bbox` as 5px reactangle area around clicked point.
      const bbox = [
          [ev.point.x - threshold, ev.point.y - threshold],
          [ev.point.x + threshold, ev.point.y + threshold]
      ]

      const selectedFeatures = map.queryRenderedFeatures(bbox, {
          layers: ['stations'],
      })

      if (selectedFeatures.length == 0)
        return

      const element = selectedFeatures[0]

      locator.unlock()

      map.removeFeatureState({source: 'stations'})
      map.setFeatureState({source: 'stations', id: element.id}, {selected: true})
      selected = element

      const latlng = [
        element.geometry.coordinates[1],
        element.geometry.coordinates[0]
      ]

      selected_pointer.lat = latlng[0]
      selected_pointer.lng = latlng[1]

      selected_pointer.strokeColor = [0, 0, 0]
      if (element.properties.status == "red") {
        selected_pointer.bg = red
      } else if (element.properties.status == "yellow") {
        selected_pointer.bg = yellow
      } else {
        selected_pointer.bg = green
      }

      update_info(selected)
    }

    // XXX!!!! Look into slots

    // XXX This might be faster than registering on idle, but this
    // makes it nice
    map.on('data', (ev) => {
      if (ev.sourceId == 'stations-lite' && ev.isSourceLoaded) {
        // XXX: move to a proper load event this is a hack
        loadVisibleNets()
      }
    })

    map.on('rotate', (ev) => {
      bearing.set({
        pitch: map.getPitch(),
        roll: map.getRoll(),
        bearing: map.getBearing(),
        pitchInRadians: map.transform.pitchInRadians,
      })
    })

    map.on('pitch', (ev) => {
      bearing.set({
        pitch: map.getPitch(),
        roll: map.getRoll(),
        bearing: map.getBearing(),
        pitchInRadians: map.transform.pitchInRadians,
      })
    })

    animate()
  })
})


onDestroy(() => {
  locator.kill()
})


window.addEventListener('loc-update', (ev) => {
  // XXX Make this proper
  const loc = ev.detail.position
  const lat = loc.coords.latitude
  const lng = loc.coords.longitude

  // mapbox bull :)
  // const center = new maplibregl.LngLat(loc.coords.longitude, loc.coords.latitude)
  // const radius = loc.coords.accuracy
  // const bearing = map.getBearing()
  // console.log(bearing)
  // const options = { ... { bearing }, ... { maxZoom: 15 } }
  // const newBounds = maplibregl.LngLatBounds.fromLngLat(center, radius)
  // map.fitBounds(newBounds, options, {
  //     geolocateSource: true // tag this camera change so it won't cause the control to change to background state
  // });

  // console.log("Got position", lat, lng, ev.detail.state, ev.detail.position)

  if (! pov ) {
    pov = new POV(map, [lat, lng], bg, fg)
    cwrapper.add(pov)
  } else {
    pov.lat = lat
    pov.lng = lng
  }

  if (! pov_pointer) {
    pov_pointer = new CoarsePointer(map, [lat, lng], bg, fg)
    cwrapper.add(pov_pointer)
  } else {
    pov_pointer.lat = lat
    pov_pointer.lng = lng
  }

  if (ev.detail.state == "LOCKING") {
    // XXX Only do this when user is "locked in" (dirty flag on map)
    const zoom = Math.max(map.getZoom(), 15)
    map.easeTo({center: [lng, lat], zoom})
  }

  if (selected !== undefined)
    update_info(selected)

  cwrapper.invalidate()
})


document.addEventListener('theme-updated', (ev) => {
  const _fg = getFgColor()
  const _bg = getBgColor()

  fg[0] = _fg[0]
  fg[1] = _fg[1]
  fg[2] = _fg[2]

  bg[0] = _bg[0]
  bg[1] = _bg[1]
  bg[2] = _bg[2]

  cwrapper.invalidate()
})

window.addEventListener('infobox-click', (ev) => {
  const center = [ev.detail.longitude, ev.detail.latitude]
  const zoom = Math.max(map.getZoom(), 15)
  map.easeTo({ center, zoom })
  locator.unlock()
})

window.addEventListener('loc-click', (ev) => {
  const state = get(locator.state)
  console.log("State is", state)
  switch(state) {
    case "OFF":
    case "ERROR":
      locator.lock()
      break
    case "WATCHING":
      break
    case "LOCKING":
    case "TRACKING":
      locator.lock()
      if (locator.position) {
        const zoom = Math.max(map.getZoom(), 15)
        const { latitude, longitude } = locator.position.coords
        map.easeTo({center: [longitude, latitude], zoom })
      }
      break
    default:
      throw new Error(`unexpected locator state ${state}`)
  }
})

// XXX deprecated, but nothing similar exists /shrug
// For safari, look into:
// https://stackoverflow.com/questions/56514116/how-do-i-get-deviceorientationevent-and-devicemotionevent-to-work-on-safari

window.addEventListener("deviceorientationabsolute", event => {
  if (! pov) return

  // deg to rad
  // convert also to canvas reference
  // alpha is degrees to north
  targetAngle = 2 * Math.PI - ((event.alpha * Math.PI) / 180.0)
  if (pov.angle == null) {
    pov.angle = targetAngle
    cwrapper.invalidate()
  } else if (!pov.visible()) {
    pov.angle = targetAngle
  }
})

window.addEventListener("bearing-click", event => {
  map.resetNorth()
  map.resetNorthPitch()
})

navigator.permissions.query({ name: 'geolocation' }).then(permission => {
  if (permission.state == "granted") {
    locator.track()
  }
})
</script>

<style>

div#map {
  width: 100%;
  height: 100%;
}

div.map-container {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 1;
}

canvas#map-overlay {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

</style>

<div class='map-container'>
  <div id="map"></div>
  <canvas id="map-overlay"></canvas>
</div>
