<script>
  import toggle from "./toggle.js"
  import { loading } from './store.js'

  const t = toggle()

  function handleClick(ev) {
    t.cycle(ev)
  }

  $: loadingClass = $loading ? 'loading' : '';
</script>

<style>
    .logo {
        border-radius: 4px;
        width: 45px;
        height: 45px;
        cursor: pointer;
        background-color: var(--background-alt);
        color: var(--text-alt);
        padding: 4px;
    }

    .logo svg {
        width: 100%;
        height: 100%;
    }

    .logo {
      transition: .2s transform cubic-bezier(0.18, 0.89, 0.32, 1.28);
      transform: rotate(180deg);
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
            width: 64px;
            height: 64px;
        }
    }

    .logo.loading {
        background-color: red;
    }
</style>

<button on:click={handleClick} class="logo theme-toggle {loadingClass}" title="Toggle theme" aria-label="toggle theme">
    <svg
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
        stroke="currentColor"
        version="1.1"
        viewBox="0 0 64 40"
        stroke-width="2"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="m44.276 4.7041-10.522 22.742-14.906-16.619 0.87685-1.7494h23.675l8.7685 18.368h-18.414m-21.044 0.87468 9.6453-27.115h5.2611m10.522 2.6241h8.7685m-35.074 12.246a11.399 11.371 0 1 0 0.87685 0m38.581 0a11.399 11.371 0 1 0 0.87685 0"
        ></path>
    </svg>
</button>
