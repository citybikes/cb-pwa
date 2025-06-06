<script>
  import { onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { Locator } from './locator.js'
  import { loading, locationState } from './store.js'

  function handleClick(ev) {
    window.dispatchEvent(new CustomEvent("loc-click", {detail: ev}))
  }

  $: loadingClass = $locationState == "WATCHING" ? 'loading' : ''
  $: lockedClass = $locationState == "LOCKING" ? 'locked' : ''
  $: errorClass = $locationState == "ERROR" ? 'error' : ''
</script>

<style>
    .logo {
        border-radius: 4px;
        width: 35px;
        height: 35px;
        cursor: pointer;
        background-color: var(--background-alt);
        color: var(--text-alt);
        padding: 4px;
    }

    .logo svg #inner {
        display: none
    }

    .logo svg {
        width: 100%;
        height: 100%;
    }

    .logo:hover {
      transform: scale(1.1) rotate(0deg);
    }

    .logo:active {
      transform: scale(1) rotate(0deg);
      transition: .1s transform cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    @media (min-width: 640px) {}

    @media (min-width: 768px) {}

    @media (min-width: 1024px) {}

    @media (min-width: 1280px) {
        .logo {
            padding: 8px;
            width: 50px;
            height: 50px;
        }
    }

    .logo.loading {
        transform: scale(1) rotate(0deg);
        transition: .1s transform cubic-bezier(0.18, 0.89, 0.32, 1.28);
        animation: hueShift 2s linear infinite;
    }

    @keyframes shake {
      0% { transform: translateX(0); }
      20% { transform: translateX(-5px); }
      40% { transform: translateX(5px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
      100% { transform: translateX(0); }
    }

    .logo.error {
      animation: shake 0.4s ease;
    }

    .logo.locked svg #inner {
        display: inline;
    }

    @keyframes hueShift {
      0%   { filter: hue-rotate(0deg); }
      50%  { filter: hue-rotate(180deg); }
      100% { filter: hue-rotate(360deg); }
    }
</style>

<button on:click={handleClick} class="logo loc-toggle {loadingClass} {lockedClass} {errorClass}" title="Find my location" aria-label="find my location">
    <svg
       viewBox="0 0 24 24"
       version="1.1"
       fill="currentColor"
       stroke="none"
       xmlns="http://www.w3.org/2000/svg"
       xmlns:svg="http://www.w3.org/2000/svg">
      <path
         d="m 12,8 c 2.209139,0 4,1.790861 4,4 0,2.209139 -1.790861,4 -4,4 C 9.790861,16 8,14.209139 8,12 8,9.790861 9.790861,8 12,8 Z"
         id="inner" />
      <path
         d="m 12,2 c 0.379696,0 0.693491,0.2821539 0.743153,0.6482294 L 12.75,2.75 12.749069,4.5377088 v 0 c 3.543745,0.3498655 6.363357,3.1694772 6.71415,6.7148232 L 19.5,11.25 h 1.75 c 0.414214,0 0.75,0.335786 0.75,0.75 0,0.379696 -0.282154,0.693491 -0.648229,0.743153 L 21.25,12.75 19.461656,12.749037 v 0 c -0.34923,3.543777 -3.168842,6.363389 -6.714188,6.714182 L 12.75,19.5 v 1.75 C 12.75,21.664214 12.414214,22 12,22 11.620304,22 11.306509,21.717846 11.256847,21.351771 L 11.25,21.25 l 9.63e-4,-1.788344 v 0 C 7.707186,19.112426 4.8875743,16.292814 4.5367805,12.747468 L 4.5,12.75 H 2.75 C 2.3357864,12.75 2,12.414214 2,12 2,11.620304 2.2821539,11.306509 2.6482294,11.256847 L 2.75,11.25 l 1.7877088,9.32e-4 v 0 C 4.8875743,7.707186 7.707186,4.8875743 11.252532,4.5367805 L 11.25,4.5 V 2.75 C 11.25,2.3357864 11.585786,2 12,2 Z m 0,4 c -3.3137085,0 -6,2.6862915 -6,6 0,3.313709 2.6862915,6 6,6 3.313709,0 6,-2.686291 6,-6 0,-3.3137085 -2.686291,-6 -6,-6 z"
         id="crosshair" />
    </svg>
</button>
