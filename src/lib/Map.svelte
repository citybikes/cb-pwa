<script>
import { get } from 'svelte/store';
import { onMount } from 'svelte';
import { tick } from 'svelte';

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from "pmtiles"
let protocol = new Protocol()
maplibregl.addProtocol("pmtiles",protocol.tile)

// import only as needed
import * as turf from '@turf/turf'

import { Canvas, CoarsePointer, POV } from './canvas.js'
import { getStdColor } from './utils.js'

import { selectedStation, loading } from './store.js'
import { center, zoom } from './store.js'

const update_info = (element) => {
  const loc = [pov.lng, pov.lat]
  const sts = stmap[element.properties.id]
  const distance = turf.distance(loc, element.geometry.coordinates)

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


const paint = () => {
  map.triggerRepaint()
  // requestAnimationFrame(animate)
  cwrapper.paint()
}

const resize = () => {
  const info = document.querySelector('.infobox') ?? {}

  const container = document.querySelector('.map-container')
  const w = container.offsetWidth
  const h = container.offsetHeight - (info.offsetHeight ?? 0)

  cwrapper.w = w
  cwrapper.h = h

  cwrapper.resize()
}

const update = () => {
  cwrapper.update()
}

let map
const stmap = {}
const net_promises = {}
let pov, pov_pointer, selected_pointer

// We can make this use a store so we can use it as a state (to generate filtering)
const getVisibleNets = (map) => {
  if (map.getZoom() < 10) return []

  // // XXX sometimes this is incorrect
  // let nets = new Set(map.queryRenderedFeatures(map.getBounds(), {layers: ['hulls_net']}).map(
  //   f => f.properties.tag
  // ))

  // This always works, but maybe its' too much work
  let nets = new Set(map.querySourceFeatures('stations-lite', {sourceLayer: 'stations'}).map(
    f => f.properties.tag
  ))

  return nets
}

const loadVisibleNets = () => {
  const nets = getVisibleNets(map)
  nets.forEach( n => {
    if (net_promises[n] != undefined) return

    loading.set(true)

    net_promises[n] = fetch("/networks/" + n).then(r=>{
      if (!r.ok) throw new Error(r.status + " Failed Fetch ")
      return r.json()
    })

    net_promises[n].then(d => {

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
    }).catch(e => console.log('404'))
  })

  Promise.all(Object.values(net_promises)).then((e) => {
    loading.set(false)
  })
}


onMount(() => {

  const canvas = document.getElementById("map-overlay")
  const ctx = canvas.getContext("2d")

  cwrapper = new Canvas(canvas, ctx)

  selectedStation.subscribe(async (station) => {
    // If needed, move this to requestAnimationFrame and forget
    // about it.
    await tick()
    resize()
    update()
    paint()
  })

  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.citybik.es/styles/basic-preview/style.json',
    attributionControl: false,
    maxZoom: max_zoom,
    center: get(center) ?? loc,
    zoom: get(zoom) ?? default_zoom,
  })

  pov = new POV(map, [loc[1], loc[0]], bg, fg)
  pov_pointer = new CoarsePointer(map, [loc[1], loc[0]], bg, fg)
  // XXX go figure
  selected_pointer = new CoarsePointer(map, null, null, [0,0,0], false, true)

  cwrapper.entities.push(pov)
  cwrapper.add(pov_pointer)
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
    map.addLayer(layers.hull_labels)
    map.addLayer(layers.stations)

    map.on('resize', (ev) => {
      resize()
      update()
      paint()
      loadVisibleNets()
    })

    map.on('move', (ev) => {
      update()
      paint()
      loadVisibleNets()
    })

    map.on('moveend', (ev) => {
      center.set(map.getCenter())
      zoom.set(map.getZoom())
    })

    map.on('zoomend', (ev) => {
      center.set(map.getCenter())
      zoom.set(map.getZoom())
    })


    map.on('click', 'stations', (ev) => {
      const element = ev.features[0]
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
    })

    // XXX!!!! Look into slots

    update()
    paint()
    map.on('data', (ev) => {
      if (ev.sourceId == 'stations-lite' && ev.isSourceLoaded) {
        // XXX: move to a proper load event this is a hack
        loadVisibleNets()
      }
    })
  })

  // XXX Again, don't do this
  document.querySelector('#map').addEventListener('click', (ev) => {
    const {x, y} = {x: ev.layerX, y: ev.layerY}
    cwrapper.entities.forEach((p) => {
      if (x > p.x - p.l/2 &&
        x < p.x + p.l/2 &&
        y > p.y - p.l/2 &&
        y < p.y + p.l/2) {
        p.click(ev)
      }
    })
  })
})

document.addEventListener('loc-update', (ev) => {
  // XXX Make this proper
  const loc = ev.detail.position

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

  pov.lat = loc.coords.latitude
  pov.lng = loc.coords.longitude

  pov_pointer.lat = loc.coords.latitude
  pov_pointer.lng = loc.coords.longitude

  update()
  paint()

  // XXX Only do this when user is "locked in" (dirty flag on map)
  // const zoom = Math.max(map.getZoom(), 15)
  // map.setCenter([pointers[0].lng, pointers[0].lat])
  // map.setZoom(zoom)
  if (selected !== undefined)
    update_info(selected)
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

  update()
  paint()
})

window.addEventListener('infobox-click', (ev) => {
  const center = [ev.detail.longitude, ev.detail.latitude]
  const zoom = Math.max(map.getZoom(), 15)
  map.easeTo({ center, zoom })
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
