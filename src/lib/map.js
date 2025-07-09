// XXX import only as needed
import * as turf from '@turf/turf'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from "pmtiles"
let protocol = new Protocol()
maplibregl.addProtocol("pmtiles",protocol.tile)

// XXX Try to _not_ use stores and instead use events -> stores on Map.svelte
// or function callbacks
import { get } from 'svelte/store'
import { center, zoom, bearing } from './store.js'
import { network_filter } from './store.js'

import { NetworkManager } from './network_manager.js'
import { Canvas, CoarsePointer, POV } from './canvas.js'

import { colors } from './utils.js'

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

// XXX clearly hacky. think this over
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
    data: new turf.featureCollection([]),
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
      "text-variable-anchor": ["left", "right", "top", "bottom"],
      "text-offset": [1.25, 1.25],
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


class Map extends HTMLElement {

  _loading = false
  _visible_nets = undefined
  _canvas_hit = false
  default_zoom = 15

  constructor() {
    super()
    this.networks = new NetworkManager()

    this.map_container = this.querySelector('#map')
    this.canvas_container = this.querySelector('#map-overlay')

    this.fg = colors.getFgColor()
    this.bg = colors.getBgColor()

    // re-bind event listeners to obj
    this.onLocUpdate = this.onLocUpdate.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onMove = this.onMove.bind(this)
    this.onThemeUpdate = this.onThemeUpdate.bind(this)
    this.onClick = this.onClick.bind(this)
    this.deselectEvent = this.deselectEvent.bind(this)
  }

  resize() {
    // XXX this should be fixed canvas side regardless of the size of the
    // infobox!
    const info = document.querySelector('.infobox')
    this.canvas.w = this.offsetWidth
    this.canvas.h = this.offsetHeight - (info ? info.offsetHeight : 0)
    this.canvas.resize()
  }

  get visible_nets() {
    return this._visible_nets
  }

  set visible_nets(nets) {
    if (this._visible_nets && this._visible_nets.difference(nets).size == 0 &&
        nets.difference(this._visible_nets).size == 0
    ) return

    this._visible_nets = nets
    this.dispatchEvent(new CustomEvent('visible-nets', {
      detail: { nets: nets },
      bubbles: true,
    }))
  }

  set loading(val) {
    if (this._loading == val) return

    this._loading = val
    this.dispatchEvent(new CustomEvent('loading', {
      detail: { loading: val },
      bubbles: true,
    }))
  }

  get loading() {
    return this._loading
  }

  queryVisibleNets() {
    if (this.map.getZoom() < 10) return new Set()

    // Query for invisible rendered hull polygons to see what networks are
    // visible, and also stations (XXX add tag info to outliers)
    const t_layers = [layers.stations_lite.id, layers.hulls_net_inv.id]

    const nets = new Set(
      this.map.queryRenderedFeatures(this.map.getBounds(), {layers: t_layers})
        .map(f => f.properties.tag)
    )

    return nets
  }

  async connectedCallback() {
    const ctx = this.canvas_container.getContext("2d")
    this.canvas = new Canvas(this.canvas_container, ctx, this.offsetWidth, this.offsetHeight)

    this.networks.startInvalidateTimer((invalid) => {
      if (invalid.length == 0) return

      sources.stations.data.features = sources.stations.data.features
        .filter( st => ! invalid.includes(st.properties.tag) )
      this.loadVisibleNets({ atOnce: true })
      // XXX of course there's more to this:
      //    - Is station selected ?
      //    - Do something on the UI level with the differences ?
      //    - ...
    })

    this.loading = true

    this.map = new maplibregl.Map({
      container: this.map_container,
      style: 'https://tiles.citybik.es/styles/basic-preview/style.json',
      attributionControl: false,
      maxZoom: 18,
      center: get(center) ?? [2.1734035, 41.3850639],
      zoom: get(zoom) ?? this.default_zoom,
    })
    this.map_i = new MapInteractor(this.map)
    this.map_i.init(this.deselectEvent)

    this.selected_pointer = new CoarsePointer(this.map, {
      onscreen: false, offscreen: true,
      fg: [0, 0, 0],
      onClick: (ev, pointer) => {
        const zoom = Math.max(this.map.getZoom(), this.default_zoom)
        const center = [pointer.lng, pointer.lat]
        this.map.easeTo({ center: center, zoom: zoom })
      },
    })

    this.pov_pointer = new CoarsePointer(this.map, {
      onscreen: false, offscreen: true,
      bg: this.bg, fg: this.fg,
      onClick: (ev, pointer) => {
        const zoom = Math.max(this.map.getZoom(), this.default_zoom)
        const center = [pointer.lng, pointer.lat]
        this.map.easeTo({ center: center, zoom: zoom })
      },
    })

    this.pov = new POV(this.map, { bg: this.bg, fg: this.fg })

    this.canvas.add(this.pov)
    this.canvas.add(this.pov_pointer)
    this.canvas.add(this.selected_pointer)

    this.map.on('load', () => {

      this.map.addSource('stations-lite', sources.stations_lite)
      this.map.addSource('hulls', sources.hulls)
      this.map.addSource('stations', sources.stations)

      // Woah, that's a lot of layers :)
      this.map.addLayer(layers.hulls)
      this.map.addLayer(layers.hulls_fill)
      this.map.addLayer(layers.stations_lite)
      this.map.addLayer(layers.outliers)
      this.map.addLayer(layers.hulls_net)
      this.map.addLayer(layers.hulls_net_inv)
      this.map.addLayer(layers.hull_labels)
      this.map.addLayer(layers.stations_labels)
      this.map.addLayer(layers.stations)
      this.map.addLayer(layers.stations_status_labels)

      this.map.on('resize', this.onResize)
      this.map.on('move', this.onMove)
      this.map.on('click', this.onClick)

      this.map.on('dragstart', () => this.dispatchEvent(new CustomEvent('user-interaction')))
      this.map.on('click', () => this.dispatchEvent(new CustomEvent('user-interaction')))

      network_filter.subscribe((data) => {
        // Invalidate first load
        this._visible_nets = new Set()
        this.setFilter(data.tags)
      })

      // XXX This might be faster than registering on idle
      this.map.on('data', (ev) => {
        // XXX: move to a proper load event this is a hack
        if (ev.sourceId == 'stations-lite' && ev.isSourceLoaded) {
          this.visible_nets = this.queryVisibleNets()
        }
      })

      this.map.on('moveend', (ev) => {
        center.set(this.map.getCenter())
        zoom.set(this.map.getZoom())
      })

      this.map.on('zoomend', (ev) => {
        center.set(this.map.getCenter())
        zoom.set(this.map.getZoom())
      })

      this.map.on('rotate', (ev) => {
        bearing.set({
          pitch: this.map.getPitch(),
          roll: this.map.getRoll(),
          bearing: this.map.getBearing(),
          pitchInRadians: this.map.transform.pitchInRadians,
        })
      })

      this.map.on('pitch', (ev) => {
        bearing.set({
          pitch: this.map.getPitch(),
          roll: this.map.getRoll(),
          bearing: this.map.getBearing(),
          pitchInRadians: this.map.transform.pitchInRadians,
        })
      })

    })

    this.addEventListener('visible-nets', (ev) => {
      this.loadVisibleNets()
    })

    window.addEventListener('loc-update', this.onLocUpdate)

    // XXX use something else than event, store probl.
    document.addEventListener('theme-updated', this.onThemeUpdate)

    this.animate()
  }

  queryAroundPoint(x, y) {
    // Instead of precise clicking layer elements, add a fat finger threshold
    // to check what features are around that point
    const threshold = this.map.getZoom() * 0.8
    const bbox = [
        [x - threshold, y - threshold],
        [x + threshold, y + threshold]
    ]

    return this.map.queryRenderedFeatures(bbox, {
      layers: [layers.stations.id],
    })
  }

  onClick(ev) {
    // XXX Handle event propagation and bubbling
    const [c_elem_clicked, ] = this.canvas.click(ev)

    this._canvas_hit = c_elem_clicked

    if (c_elem_clicked) return

    if (this.map.getZoom() < 10) return

    const selectedFeatures = this.queryAroundPoint(ev.point.x, ev.point.y)

    if (! selectedFeatures.length) return

    const element = selectedFeatures[0]

    this.map.removeFeatureState({source: layers.stations.source})
    this.map.setFeatureState({
      source: layers.stations.source,
      id: element.id,
    }, { selected: true })

    const [lng, lat] = element.geometry.coordinates

    this.selected_pointer.lat = lat
    this.selected_pointer.lng = lng
    // XXX do something less implicit
    this.selected_pointer.bg = colors[element.properties.status]
    this.canvas.invalidate()

    const station = this.networks.getStation(element.properties)
    return (this.onStationSelected ? this.onStationSelected(station) : undefined)
  }

  deselectEvent(ev) {
    // XXX kind of hack-y
    // ack possible canvas element clicked and do nothing
    if (this._canvas_hit) {
      this._canvas_hit = false
      return
    }

    const { x, y } = ev.point
    if (this.queryAroundPoint(x, y).length > 0) return

    this.map.removeFeatureState({source: layers.stations.source})

    this.selected_pointer.lat = null
    this.selected_pointer.lng = null

    return (this.onStationSelected ? this.onStationSelected(null) : undefined)
  }

  onLocUpdate(ev) {
    // XXX Make this proper
    const loc = ev.detail.position
    const lat = loc.coords.latitude
    const lng = loc.coords.longitude

    this.pov.lat = lat
    this.pov.lng = lng
    this.pov_pointer.lat = lat
    this.pov_pointer.lng = lng
    this.canvas.invalidate()

    if (ev.detail.state == "LOCKING") {
      const zoom = Math.max(this.map.getZoom(), this.default_zoom)
      this.map.easeTo({center: [lng, lat], zoom})
    }
  }

  onThemeUpdate(ev) {
    const _fg = colors.getFgColor()
    const _bg = colors.getBgColor()

    this.fg[0] = _fg[0]
    this.fg[1] = _fg[1]
    this.fg[2] = _fg[2]

    this.bg[0] = _bg[0]
    this.bg[1] = _bg[1]
    this.bg[2] = _bg[2]

    this.canvas.invalidate()
  }

  onMove() {
    this.canvas.invalidate()
    this.canvas.paint()
    this.visible_nets = this.queryVisibleNets()
  }

  onResize() {
    this.resize()
  }

  animate() {
    if (this.canvas.dirty) this.canvas.paint()
    requestAnimationFrame(() => this.animate())
  }

  async disconnectedCallback() {
    this.networks.killInvalidateTimer()
    this.map.remove()
    window.removeEventListener('loc-update', this.onLocUpdate)
    document.removeEventListener('theme-update', this.onThemeUpdate)
  }

  networkToFeatures(network) {
    return network.stations.map((st) => {
      // normalize coord precision
      const coords = [st.longitude.toFixed(6), st.latitude.toFixed(6)]

      // generate smallest feature to decr. mapbox memory usage
      const _st = {
        id: st.id,
        name: st.name,
        nname: network.name,
        tag: network.id,
        bikes: st.free_bikes,
        // precalculate color based on status (easy filter)
        // If we need to update data, then this should not be
        // precalculated but done using expressions
        status: st.free_bikes > 5 ? 'green' : st.free_bikes > 0 ? 'yellow' : 'red'
      }
      return turf.point(coords, _st)
    })
  }

  loadVisibleNets({ atOnce, ...opts} = { atOnce: false, }) {
    const nets = this.visible_nets
    const filter = get(network_filter).tags
    const filter_applies = filter && filter.some(t => nets.has(t))

    // XXX check perf hit on always filtering before load
    if (! filter_applies ) {
      this.setFilter()
    } else {
      this.setFilter(get(network_filter).tags)
    }

    this.loading = true

    const promises = []

    nets.forEach(n => {
      // Ignore networks already loaded
      if (this.networks.loaded(n)) return

      // Ignore filtered out networks
      if (filter_applies && filter && ! filter.includes(n)) return

      // XXX look into updateData
      promises.push(this.networks.getNetwork(n).then(net => {
        const features = this.networkToFeatures(net.network)
        sources.stations.data.features = [...sources.stations.data.features, ...features]
        if (! atOnce) this.map.getSource('stations').setData(sources.stations.data)
      }))
    })

    Promise.all(promises).then(() => {
      if (atOnce) this.map.getSource('stations').setData(sources.stations.data)
      this.loading = false
    })
  }

  setFilter(tags) {
    const filter = tags ? ["in", ["get", "tag"], ["literal", tags]] : null
    this.map.setFilter(layers.stations.id, filter)
    this.map.setFilter(layers.stations_labels.id, filter)
    this.map.setFilter(layers.stations_status_labels.id, filter)
    this.map.setFilter(layers.stations_lite.id, filter)
    this.map.setFilter(layers.hulls_net.id, filter)
    this.map.setFilter(layers.hull_labels.id, filter)
  }
}


export { Map, sources, layers }
