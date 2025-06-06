<script>
import InfoBox from "./lib/InfoBox.svelte"
import Toggle from "./lib/Toggle.svelte"
import Locator from "./lib/Locator.svelte"
import Map from "./lib/Map.svelte"
</script>

<main>
  <div id="root">
    <div class="interface-layer">
      <header>
        <div class="flex flex-row items-center justify-end">
          <Toggle />
        </div>
      </header>
      <div id="sidebar">
        <h1>Hello Sidebar</h1>
      </div>
      <div id="bottom">
        <div class="flex flex-row justify-end px-4 py-8">
          <Locator />
        </div>
        <div class="flex flex-row justify-end">
          <div class="attribution">
            Bike-share data from <a href="https://api.citybik.es">CityBikes</a> |
            Make a <a href="https://citybik.es">donation</a> &lt;3 |
            Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
          </div>
        </div>
        <InfoBox />
      </div>
    </div>
    <Map />
  </div>
</main>
