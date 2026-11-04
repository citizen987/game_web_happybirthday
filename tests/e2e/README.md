# Tests end-to-end

Pruebas de navegador para David Dash con [playwright-core](https://playwright.dev/). Son tooling de desarrollo: viven en esta carpeta con su propio `package.json`, así que Netlify no instala nada y el juego sigue sin dependencias.

## Instalar y ejecutar

```bash
cd tests/e2e
npm install
npm test                 # todas las suites
npm test -- roll lives   # solo las suites cuyo nombre contiene "roll" o "lives"
```

`run.js` levanta un servidor estático propio (módulo `http` de Node) sobre la raíz del repo en un puerto libre, abre Chromium una sola vez y ejecuta las suites en orden. Imprime `PASS <suite> (Xs)` o `FAIL <suite>: <mensaje>` y termina con código distinto de 0 si alguna falla. Con `E2E_VERBOSE=1` muestra además la traza completa de cada fallo.

Requisitos: Node 18 o superior. No hace falta Python ni otro servidor.

## Elegir el navegador

Por orden:

1. `CHROME_PATH=/ruta/a/chrome npm test`: usa ese ejecutable (Chrome, Chromium o Edge).
2. Si existe, el Chromium más reciente de la caché de Playwright: `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`.
3. Si no, lo que decida playwright-core. Si no encuentra ninguno, el error indica que ejecutes `npx playwright-core install chromium` o que definas `CHROME_PATH`.

## Qué cubre cada suite

Todas cargan `index.html?debug`, manejan el juego a través de `window.__dd` y fallan si hay `pageerror`, `console.error` o `console.warn`.

| Suite | Qué comprueba |
|---|---|
| `playthrough` | Un bot que mantiene → y salta cuando hay un hueco entre 10 y 26 px por delante termina el nivel (máx. 150 s, aborta si llega a `gameover`). Después, Enter reinicia con 0 monedas, 3 vidas y x = 60. |
| `mobile` | Móvil horizontal (844×390, táctil): tocar empieza la partida y el botón → mueve al jugador. Vertical (390×844): aparece el aviso de girar y el juego no arranca. |
| `share` | Panel de puntuación (monedas, tiempo, puntos, récord), tarjeta PNG en `__dd.shareFile`, `navigator.share` simulado (título, texto con puntos y URL, un archivo PNG) y récord guardado en `dd-best`. En escritorio sin Web Share: botón "Copiar", enlace "Descargar tarjeta", aviso y texto en el portapapeles. |
| `lives` | Golpe con monedas (se pierden monedas, no vidas), golpe sin monedas (animación y reaparición en el checkpoint), caída (vida menos, conserva monedas), fin de partida sin puntuación ni récord, compartir sin "puntos" e "Intentar de nuevo". |
| `roll` | Rodar sin acelerar, frenar contra la bola, levantarse agachado, ganar velocidad cuesta abajo, cargar en parado y lanzarse, salto en bola y ataques rodando/saltando; andando contra un cangrejo sigue haciendo daño. |
| `letters` | Las letras 1–4 no transforman; la 5.ª congela, muestra "¡SÚPER DAVID!" y activa Súper David (más velocidad, invencible, caer sigue restando vida). Al ganar: 10.000 puntos de letras, 5 letras encendidas y el texto compartido menciona "Súper David". Reiniciar lo resetea. |
| `pwa` | Comprobación estática: todos los módulos de `src/` están en el `PRECACHE` de `sw.js`, todas sus rutas existen, el manifest es válido con sus iconos, y la página enlaza el manifest y una `og:image` absoluta que existe en el repo. |
| `pause` | El botón de pausa solo se ve en partida; P congela la simulación y Esc la reanuda; ocultar la pestaña pausa (y sigue en pausa al volver); "Continuar" reanuda; en el móvil, tocar pausa y continuar. |
| `feel` | Polvo al aterrizar desde altura y al derrapar; temblor de cámara al soltar la carga. |
| `victory-song` | Al ganar se programa "Cumpleaños feliz" (cuenta de osciladores creados) y "Volver a jugar" la corta sin errores. |
| `timer` | El cronómetro está a 0 en el inicio, avanza en partida, se detiene en pausa, se congela en la meta e iguala el tiempo puntuado; el panel usa MM:SS; en 16:9, móvil y tablet queda dentro del lienzo y sin solaparse con ⏸/🔊. |
| `ios` | iPhone simulado (UA, sin Fullscreen API, `navigator.audioSession` falso): el aviso lateral "Añadir a pantalla de inicio" aparece en el inicio sin tapar el título y desaparece al jugar; la sesión de audio pasa a `playback`; un contexto suspendido se reanuda con el siguiente toque. Abierto desde la pantalla de inicio no hay aviso. Android: sin aviso y sigue pidiendo pantalla completa. |
| `version` | `stamp-version.sh` sobre una copia de `src/version.js` genera `hash · DD/MM/YYYY HH:MM` con el commit actual y falla si ya no está el marcador `'dev'`. En el inicio, la etiqueta muestra `dev`, está abajo a la izquierda y desaparece al jugar. |
| `overlays` | En el móvil, una píldora tipo Netlify (iframe abajo a la derecha) sube el botón de salto sin solaparse y el botón sigue funcionando; al quitarla vuelve a su sitio; una barra de otro hosting abajo a la izquierda sube la cruceta; un banner grande se ignora. |

## Añadir una suite

1. Crea `suites/<nombre>.js` con una función exportada por defecto:

   ```js
   import assert from 'node:assert/strict';
   import { DESKTOP, assertNoErrors, openGame, startWithKeyboard } from '../lib/game.js';

   export default async function nombre({ browser, baseUrl }) {
     const g = await openGame(browser, baseUrl, { context: DESKTOP });
     try {
       await startWithKeyboard(g.page);
       // ...interactúa con g.page y comprueba el estado con g.ev(() => window.__dd...)
       assertNoErrors(g.errors);
     } finally {
       await g.close();
     }
   }
   ```

2. Añade `'<nombre>'` a la lista `SUITES` de `run.js`.

Consejos:

- Cada suite abre y cierra su propio contexto con `openGame` (aislado: `localStorage` limpio).
- Espera a estados concretos con `page.waitForFunction(() => window.__dd...)` o `waitForState` en lugar de pausas largas. Las pausas fijas solo tienen sentido cuando miden física (cuánto tiempo se mantiene una tecla).
- Web Share no existe en headless: usa `initScript: mockNativeShare` (lo compartido queda en `window.__shared`) o `removeNativeShare` para la alternativa del portapapeles.
- Si cambias el hook `window.__dd` en `src/main.js`, revisa estas suites.
