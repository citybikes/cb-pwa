<script>
import { onMount, onDestroy } from 'svelte'
import { get } from 'svelte/store'

import { loading, center, zoom, bearing } from './store.js'
import { visible_networks_id, network_filter } from './store.js'
import { selectedStation } from './store.js'
import { Map } from './map.js'

loading.set(true)

export let map
export let locator

if (!customElements.get('bike-map')) customElements.define('bike-map', Map)

onMount(() => {
  // XXX kind of a hack but works
  map.onStationSelected = (st) => selectedStation.set(st)
})

</script>

<style>

div#map {
  width: 100%;
  height: 100%;
}

.map-container {
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

<bike-map
  class="map-container"
  bind:this={map}
  on:loading={() => map ? loading.set(map.loading) : null }
  on:visible-nets={() => map ? visible_networks_id.set(map.visible_nets) : null }
  on:user-interaction={() => locator.unlock()}
>
  <div id="map"></div>
  <canvas id="map-overlay"></canvas>
</bike-map>
