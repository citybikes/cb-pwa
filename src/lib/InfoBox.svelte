<script>
  import { derived } from 'svelte/store'
  import '../app.css'

  export let station
  export let network

  const distanceStr = derived(station, $st => {
    if (!$st?.distance) return ''

    if ($st.distance < 1) {
      return `${parseInt($st.distance * 1000)} m`
    }

    if ($st.distance < 10) {
      return `${$st.distance.toFixed(1)} km`
    }

    return `${parseInt($st.distance)} km`
  })

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("infobox-click", {
      detail: $station,
    }))
  }

  const availability = derived(station, $st => {
    if (!$st) return [];

    const bikes = parseInt($st.extra.normal_bikes ?? $st.free_bikes ?? 0)
    const ebikes = parseInt($st.extra.ebikes ?? 0)
    const slots = parseInt($st.empty_slots ?? 0)
    const total_slots = $st.free_bikes + slots

    return [bikes/total_slots, ebikes/total_slots, slots / total_slots]
  })
</script>

<style>
div.infobox {

}

div.infobox {
  background-color: var(--background);
  color: var(--text-main);
  border: solid var(--text-main);
  border-width: 1px 0 0 0;
  pointer-events: all;
  cursor: pointer;
}

div.infobox {

}

div.bar {

  div.segment {
    background-color: var(--text-main);
  }

  div.segment:nth-child(1) {
    opacity: 80%;
  }

  div.segment:nth-child(2) {
    opacity: 60%;
  }

  div.segment:nth-child(3) {
    opacity: 20%;
  }
}

</style>



{#if $station}
<div class="infobox px-4 pb-1 pt-2" on:click={handleClick}>
  <div class="flex items-center justify-between">
    <div class="flex-1" style="overflow: hidden;">
      <div class="font-medium text-xl">
        {$network.name}
      </div>
      <div class="text-sm" style="text-wrap: nowrap; overflow: hidden; text-overflow: ellipsis;">
        {$station.name}
      </div>
    </div>
    <div class="text-lg whitespace-nowrap">
      {$distanceStr}
    </div>

   </div>

  <div class="status">

    <div class="h-2 flex bar mt-1">
      <div class="segment" style="width: {$availability[0] * 100}%;"></div>
      <div class="segment" style="width: {$availability[1] * 100}%;"></div>
      <div class="segment" style="width: {$availability[2] * 100}%;"></div>
    </div>

    <div class="font-medium flex text-xl mt-1">
      <div style="text-align: left; flex-grow: 1">{$station.free_bikes} bikes
        {#if $station.extra.ebikes > 0} ({$station.extra.ebikes}⚡){/if}
      </div>
      <div style="text-align: right; flex-grow: 1">{$station.empty_slots} slots</div>
    </div>

  </div>
</div>
{/if}
