import confetti from 'canvas-confetti'

const rnd = () => "#" + Math.floor(0xffffff * Math.random()).toString(16).padStart(6, "0")
const lum = (hex) => {
    let rgb = parseInt(hex.slice(1), 16),
        [r, g, b] = [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255].map(channel => {
            let normalized = channel / 255;
            return normalized <= 0.03928 
                ? normalized / 12.92 
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const con = (color1, color2) => {
    let lum1 = lum(color1),
        lum2 = lum(color2);

    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
};
const gen = () => {
    let bg, fg
    do {
        bg = rnd()
        fg = rnd()
    } while (con(bg, fg) < 4.5)

    return [bg, fg]
}


const Toggle = () => {
    const themes = ['citybikes', 'dark', 'light']

    const scheme = window.matchMedia("(prefers-color-scheme: dark)")
    const store = localStorage

    const doc = document.documentElement
    const root = document.querySelector(':root')

    let ccount = 0;

    const getTheme = () => {
        return (store.getItem('theme') ?? 'citybikes').split(';')
    }

    let [c_theme] = getTheme()

    const update = (theme, bg, fg) => {
        root.style.removeProperty('--background')
        root.style.removeProperty('--text-main')
        if (bg !== undefined)
            root.style.setProperty('--background', bg)

        if (fg !== undefined)
            root.style.setProperty('--text-main', fg)

        doc.classList.remove(c_theme)
        doc.classList.add(theme)
        c_theme = theme
    }

    const save = (theme) => store.setItem('theme', theme)

    const cycle = (ev) => {
        ccount += 1;

        let n_theme
        if (ccount >= 10) {
            ccount == 10 ? confetti({
            angle: 180,
            particleCount: 200,
            spread: 360,
            origin: {
                x: ev.clientX/window.innerWidth,
                y: ev.clientY/window.innerHeight,
            }
            }) : null

            n_theme = "random"
            const [bg, fg] = gen()
            update(n_theme, bg, fg)
            save([n_theme, bg, fg].join(';'))
        } else {
            n_theme = themes[(themes.indexOf(c_theme) + 1) % themes.length] ?? 'citybikes'
            update(n_theme)
            save(n_theme)
        }

        document.dispatchEvent(new Event('theme-updated'))
    }

    return {
        getTheme,
        update,
        save,
        cycle,
    }
}

export default Toggle
