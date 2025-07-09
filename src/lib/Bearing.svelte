<script>
  import { bearing } from './store.js'

  let visible = $derived(
    $bearing.pitch != 0 || $bearing.roll != 0 || $bearing.bearing != 0
  )

  let hidCls = $derived(visible ? "" : "hidden")

  let transform = $derived(`scale(${1 / Math.pow(Math.cos($bearing.pitchInRadians), 0.5)}) rotateZ(${$bearing.roll}deg) rotateX(${$bearing.pitch}deg) rotateZ(${$bearing.bearing}deg)`)

  let attrs = $props()
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

    }

    .logo:hover {
      transform: scale(1.1);
    }

    .logo:active {
      transform: scale(1);
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

    .logo.hidden {
      opacity: 0;
    }

</style>

<button {...attrs} class="logo {hidCls}" title="Reset bearing" aria-label="reset bearing">
    <svg
        viewBox='0 0 29 29'
        xmlns='http://www.w3.org/2000/svg'
        style:transform="{transform}"
    >
        <path d='m10.5 14 4-8 4 8h-8z' stroke='currentColor' fill='currentColor'/>
        <path d='m10.5 16 4 8 4-8h-8z' stroke='currentColor' fill='none' />
    </svg>
</button>
