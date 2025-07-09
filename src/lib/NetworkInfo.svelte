<script>
import { onMount } from 'svelte'
import { get } from 'svelte/store'

import { network_filter } from './store.js'

export let networks

let name_selected = null
let networks_selected = null

function select(name, networks) {
  // Does nothing if only one visible network
  if (grouped.size < 2) return

  if (name_selected === name) {
    name_selected = null
    networks_selected = null
  } else {
    name_selected = name
    networks_selected = networks
  }

  const filter = {name: name_selected, tags: networks_selected}
  network_filter.set(filter)

  // XXX Use a subscription, but do only on user interaction!!
  localStorage.setItem('last_filter', JSON.stringify(filter))
}

$: grouped = (() => {
  const gmap = new Map()
  for (const net of $networks) {
    if (gmap.has(net.name)) gmap.get(net.name).push(net)
    else gmap.set(net.name, [net])
  }
  return gmap
})()

$: selected = grouped.has(name_selected) ? name_selected : null

onMount(() => {
  // Load name and networks if present already ?
  const last_filter = get(network_filter)
  name_selected = last_filter.name
  networks_selected = last_filter.tags
})

</script>

<div>
{#each Array.from(grouped).sort((a, b) => a[0].localeCompare(b[0])) as [name, networks]}
  <button
      class:selected={selected === name}
      class:dimmed={selected && selected !== name}
      on:click={()=>select(name, networks.map(n => n.id))}
    >{name}</button>
{/each}
</div>

<style>

div {

}

button {
  cursor: pointer;
  pointer-events: all;
}

button {
  border: solid 2px inherit;
  border-radius: 8px;
  padding: 2px 10px;
  background-color: var(--text-main);
  color: var(--background);
  margin-right: 10px;
  margin-bottom: 10px;
}

button.selected {

}

button.dimmed {
  opacity: 0.5;
}

</style>
