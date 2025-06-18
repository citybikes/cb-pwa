<script>
  import { derived } from 'svelte/store'

  export let station

  const distanceStr = derived(station, $st => {
    if (!$st?.distance) return ''
    const kms = Math.floor($st.distance)
    const mts = Math.floor(($st.distance - kms) * 1000)
    return `${kms ? kms + ' km ' : ''}${mts} m`
  })

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("infobox-click", {
      detail: $station,
    }))
  }


</script>

{#if $station}
  <div class="infobox" on:click={handleClick}>
    <h1>{$station.name.toLowerCase()}</h1>
    <span class="bikes">
      {$station.free_bikes} bikes
      {#if $station.extra?.ebikes} ({$station.extra.ebikes}⚡){/if}
    </span>
    |
    <span class="slots">{$station.empty_slots} slots</span>
    {#if $distanceStr}
    |
    <span class="distance">{$distanceStr}</span>
    {/if}
  </div>
{/if}
