# CLAUDE.md — David Dash

Juego web de plataformas 2D, regalo de cumpleaños para David. Está publicado en https://gamehappybirthday.netlify.app/ con despliegue continuo desde `main`.

## Reglas del proyecto (no negociables)

- **Cero dependencias en tiempo de ejecución y cero build.** Solo HTML, CSS y JavaScript con módulos ES nativos. No añadas frameworks, bundlers ni librerías CDN. Si alguna vez hace falta tooling de desarrollo (por ejemplo, tests), va en `devDependencies` y nunca se carga desde el juego.
- **Gráficos dibujados por código.** La única imagen es `assets/head.png`. El pixel art usa `rect()` (`src/render/draw.js`) en coordenadas enteras.
- **Personaje y nivel originales.** El juego se inspira en el género, pero no reproduce personajes, sprites, música ni niveles de juegos existentes.
- **Debe seguir siendo fácil:** sin game over. Consulta los límites de huecos y saltos en `docs/level-design.md`.
- **Móvil primero:** cualquier cambio de UI debe funcionar en Chrome Android y Safari iOS (táctil, horizontal, audio tras un gesto).

## Idiomas

- Conversación con el usuario: español.
- Código, identificadores y comentarios: inglés.
- Textos visibles para el jugador (`index.html`, `WIN.MESSAGE`, `aria-label`): español.
- Documentación (`README.md`, `docs/`): español.
- Commits: inglés, Conventional Commits, con este formato y **sin** líneas de coautor ni atribución a IA:

  ```
  <type>: <short descriptive sentence>

  - <change 1>
  - <change 2>
  ```

## Git e identidad

- El repo es **personal**: `git@github.com:citizen987/game_web_happybirthday.git`.
- La carpeta vive bajo `~/dev/work/`, donde un `includeIf` global aplica la identidad de trabajo. Por eso el repo tiene en su **configuración local** `user.name=citizen987`, `user.email=rubencodina@gmail.com` y un `core.sshCommand` que usa `~/.ssh/id_ed25519_github_citizen987`. Antes de hacer commit, comprueba con `git config user.email` que sale el correo personal. Nunca hagas commit con la cuenta de trabajo.
- Haz commit o push solo cuando el usuario lo pida: un push a `main` publica directamente en producción.

## Arquitectura (resumen)

Detalle en `docs/architecture.md`.

```
src/main.js     composition root + bucle de paso fijo a 60 Hz
src/config.js   todas las constantes de ajuste
core/  audio/  render/  ui/   →  plataforma, sonido, dibujo, DOM
game/          →  lógica pura (sin DOM, audio ni canvas)
world/         →  datos estáticos del nivel (Terrain + buildLevel)
```

Reglas de capas:

- `game/` no importa de `core/`, `render/`, `audio/` ni `ui/`. Para producir sonido, emite eventos (`world.events.push('nombre')`) que `Game.flushEvents()` traduce en `sfx.nombre()`.
- `render/` solo lee el estado y nunca lo modifica.
- `world/level.js` es la definición estática; `game/world.js` crea el estado mutable de cada partida.
- Las constantes nuevas van en `config.js`, no repartidas por el código.

## Cómo ejecutar y verificar

```bash
python3 -m http.server 8000   # file:// no funciona con módulos ES
```

- `?debug` en la URL expone `window.__dd` con `state`, `player`, `coins`, `flagX`, `groundAt(x)` y `teleport(x)`. El usuario quiere mantener este hook.
- No hay suite de tests en el repo. Para verificar un cambio con navegador headless, usa Playwright **fuera del repo** (en el scratchpad) contra el servidor local:
  - **Partida completa:** bot que mantiene → y salta cuando hay un hueco entre 10 y 26 px por delante. Antes del refactor modular terminaba en ~45 s.
  - **Reinicio:** tras la victoria, Enter → `state === 'play'`, 0 monedas y x = 60.
  - **Móvil:** viewport de 844×390 con `hasTouch`, un `pointerdown` sobre `[data-btn=right]` mueve al jugador. En 390×844 aparece el aviso de girar.
  - Sin errores en la consola (`pageerror`).
- Tras cada cambio, da al usuario una checklist de verificación manual adaptada a lo modificado (ver `docs/development.md`).

## Gotchas conocidos

- **Audio:** solo se puede iniciar dentro de un gesto del usuario (`AudioEngine.unlock()` en la pantalla de inicio y en "Volver a jugar"). En iPhone, el interruptor de silencio físico también silencia WebAudio.
- **`head.png` desde `file://`:** el canvas queda "tainted"; `getImageData` falla y se omite el contorno pixelado (aparece un aviso en la consola).
- **Pointer events sintéticos en `window`:** `e.target` no es un `Node`; `MuteButton.contains` ya lo contempla.
- **Patrones de canvas:** se anclan al espacio del mundo gracias a `ctx.translate`, así que no hay que desplazarlos a mano.
- **El ancho interno es variable (240–400 px).** Nunca asumas 320: usa `display.width` o `view.w`.
- **Netlify** inyecta un comentario y un script `/.netlify/scripts/hud` en el HTML servido. Es normal.
