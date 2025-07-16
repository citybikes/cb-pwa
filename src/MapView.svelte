<script>
import { tick, onMount, onDestroy } from 'svelte'
import { get, derived, writable } from 'svelte/store'

import InfoBox from "./lib/InfoBox.svelte"
import Toggle from "./lib/Toggle.svelte"
import LocatorButton from "./lib/Locator.svelte"
import Bearing from "./lib/Bearing.svelte"
import Map from "./lib/Map.svelte"
import NetworkInfo from "./lib/NetworkInfo.svelte"

import { Locator } from './lib/locator.js'
import { selectedStation, loading, locationState } from './lib/store.js'
import { visible_networks_id, network_filter } from './lib/store.js'
import { NetworkManager } from './lib/network_manager.js'


const nmanager = new NetworkManager()
// prefetch networks
nmanager.networks

let networks
let visible_networks
let selected_network

let map

const locator = new Locator({
  state: locationState,
  timeout: Infinity,
  accuracy: "HIGH",
})

onMount(async () => {
  networks = await nmanager.networks
  visible_networks = derived(visible_networks_id, ($store, set) => {
    set(Array.from($store).map((nid) => networks.get(nid)))
  })
  selected_network = derived(selectedStation, ($store, set) => {
    set($store ? networks.get($store.tag) : null)
  })

  navigator.permissions.query({ name: 'geolocation' }).then(permission => {
    if (permission.state == "granted") {
      locator.track()
    }
  })

  selectedStation.subscribe(async (station) => {
    // XXX this should be fixed canvas side regardless of the size of the
    // infobox!
    await tick()
    map.resize()
  })
})

onDestroy(() => {
  locator.kill()
})

const bearingClick = () => {
  map.map.resetNorth()
  map.map.resetNorthPitch()
}

const locationClick = () => {
  const state = get(locator.state)
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
        const zoom = Math.max(map.map.getZoom(), map.default_zoom)
        const { latitude, longitude } = locator.position.coords
        map.map.easeTo({center: [longitude, latitude], zoom })
      }
      break
    default:
      throw new Error(`unexpected locator state ${state}`)
  }
}

const infoClick = (station) => {
  const center = [station.longitude, station.latitude]
  const zoom = Math.max(map.map.getZoom(), map.default_zoom)
  map.map.easeTo({ center, zoom })
  locator.unlock()
}

</script>

<div class="interface-layer">
  <header>
    <div class="flex flex-row justify-end">
      <div class="grow">
        {#if visible_networks}
          <NetworkInfo networks={visible_networks} />
        {/if}
      </div>
      <div>
        <Toggle />
      </div>
    </div>
  </header>
  <div id="sidebar">
    <h1>Hello Sidebar</h1>
  </div>
  <div class="attribution">
    Bike-share data from <a href="https://api.citybik.es">CityBikes</a> |
    Make a <a href="https://citybik.es">donation</a> &lt;3 |
    Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
  </div>
  <div id="bottom">
    <div class="flex flex-col items-end px-4 py-8 space-y-4">
      <Bearing onclick={bearingClick}/>
      <LocatorButton onclick={locationClick}/>
    </div>
    <InfoBox station={selectedStation} network={selected_network} onclick={infoClick}/>
  </div>
</div>
<Map bind:map={map} locator={locator} />
