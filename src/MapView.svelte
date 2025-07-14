<script>
import { onMount } from 'svelte'
import { get, derived } from 'svelte/store'

import InfoBox from "./lib/InfoBox.svelte"
import Toggle from "./lib/Toggle.svelte"
import Locator from "./lib/Locator.svelte"
import Bearing from "./lib/Bearing.svelte"
import Map from "./lib/Map.svelte"
import NetworkInfo from "./lib/NetworkInfo.svelte"
import { selectedStation, loading, locationState } from './lib/store.js'
import { visible_networks_id, network_filter } from './lib/store.js'
import { filter_hydrated } from './lib/store.js'
import { NetworkManager } from './lib/network_manager.js'


const nmanager = new NetworkManager()
// prefetch networks
nmanager.networks

let networks
let visible_networks
let selected_network

function updateFilter({name, tags}) {
  if ($filter_hydrated) {
    network_filter.set({name, tags})
  }
}

onMount(async () => {
  networks = await nmanager.networks
  visible_networks = derived(visible_networks_id, ($store, set) => {
    set(Array.from($store).map((nid) => networks.get(nid)))
  })
  selected_network = derived(selectedStation, ($store, set) => {
    set($store ? networks.get($store.tag) : null)
  })
})

</script>

<div class="interface-layer">
  <header>
    <div class="flex flex-row justify-end">
      <div class="grow">
        {#if visible_networks} <NetworkInfo networks={visible_networks} on:net-filter-update={(e)=>updateFilter(e.detail)}/> {/if}
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
      <Bearing />
      <Locator />
    </div>
    <InfoBox station={selectedStation} network={selected_network}/>
  </div>
</div>
<Map />
