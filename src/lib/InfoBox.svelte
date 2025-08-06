<script>
  import * as turf from '@turf/turf'
  import { onMount, onDestroy } from 'svelte'
  import { writable, derived } from 'svelte/store'

  import '../app.css'

  export let station
  export let network

  export let onclick = (station) => { console.log(station) }

  let position = writable(null)

  const onLocUpdate = (ev) => position.set(ev.detail.position)

  onMount(() => {
    window.addEventListener('loc-update', onLocUpdate)
  })

  onDestroy(() => {
    window.removeEventListener('loc-update', onLocUpdate)
  })

  const kind = derived(station, $thing => $thing && $thing.kind)

  const distanceStr = derived([station, position], ([$st, $pos]) => {
    if (!$pos || !$st) return

    const distance = turf.distance(
      [$pos.coords.longitude, $pos.coords.latitude],
      [$st.longitude, $st.latitude]
    )

    if (distance < 1) {
      return `${parseInt(distance * 1000)} m`
    }

    if (distance < 10) {
      return `${distance.toFixed(1)} km`
    }

    return `${parseInt(distance)} km`
  })

  const availability = derived(station, $st => {
    if (!$st) return []

    const ebikes = parseInt($st.extra.ebikes ?? 0)
    const bikes = parseInt($st.extra.normal_bikes ?? $st.free_bikes - ebikes ?? 0)
    const slots = parseInt($st.empty_slots ?? 0)
    const total_slots = $st.free_bikes + slots

    return [
      ... [bikes/total_slots, ebikes/total_slots].sort().reverse(),
      slots / total_slots
    ]
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
    color: var(--background);
  }
}

</style>



{#if $kind && $kind == 'station'}
<div class="infobox px-4 pb-1 pt-2" onclick={() => onclick($station)}>
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
      <div class="segment" style="opacity: 80%; width: {$availability[0] * 100}%;"></div>
      <div class="segment" style="opacity: 60%; width: {$availability[1] * 100}%;"></div>
      <div class="segment" style="opacity: 20%; width: {$availability[2] * 100}%;"></div>
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

{#if $kind && $kind != 'station'}
<div class="infobox px-4 pb-1 pt-2" onclick={() => onclick($station)}>
  <div class="flex items-center justify-between">
    <div class="flex-1" style="overflow: hidden;">
      <div class="font-medium text-xl">
        {$network.name}
      </div>
      <div class="text-sm" style="text-wrap: nowrap; overflow: hidden; text-overflow: ellipsis;">
        {$station.kind} {$station.extra.uid}
      </div>
    </div>
    <div class="text-lg whitespace-nowrap">
      {$distanceStr}
    </div>

   </div>

  <div class="status mt-1 font-normal text-sm">
    {#if $station.extra.battery !== undefined}
      <div class="bar mb-1" style="position: relative; border: solid 1px var(--text-main);">
        <div class="segment" style="padding-left: clamp(0px, {parseInt($station.extra.battery * 100)}%, 2px); width: {parseInt($station.extra.battery * 100)}%; text-overflow: clip; white-space: nowrap; overflow: hidden; z-index: 2; position: relative"> 🔋 {parseInt($station.extra.battery * 100)} %</div>
        <div style="padding-left: 2px; color: var(--text-main); position: absolute; left: 0px; top: 0px; z-index: 1;"> 🔋 {parseInt($station.extra.battery * 100)} %</div>
      </div>
    {/if}
  </div>
</div>
{/if}
