<script>
  import { get } from 'svelte/store';
  import { selectedStation } from './store.js'
  import { derived } from 'svelte/store'

  const distanceStr = derived(selectedStation, $st => {
    if (!$st?.distance) return ''
    const kms = Math.floor($st.distance)
    const mts = Math.floor(($st.distance - kms) * 1000)
    return `${kms ? kms + ' km ' : ''}${mts} m`
  })

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("infobox-click", {
      detail: get(selectedStation),
    }))
  }
</script>

{#if $selectedStation}
  <div class="infobox" on:click={handleClick}>
    <h1>{$selectedStation.name.toLowerCase()}</h1>
    <span class="bikes">
      {$selectedStation.free_bikes} bikes
      {#if $selectedStation.extra?.ebikes} ({$selectedStation.extra.ebikes}⚡){/if}
    </span>
    |
    <span class="slots">{$selectedStation.empty_slots} slots</span>
    |
    <span class="distance">{$distanceStr}</span>
  </div>
{/if}
