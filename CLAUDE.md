# CLAUDE.md — David Dash

Juego web de plataformas 2D, regalo de cumpleaños para David. Está publicado en https://gamehappybirthday.netlify.app/ con despliegue continuo desde `main`.

## Reglas del proyecto (no negociables)

- **Cero dependencias en tiempo de ejecución y cero build.** Solo HTML, CSS y JavaScript con módulos ES nativos. No añadas frameworks, bundlers ni librerías CDN. Si alguna vez hace falta tooling de desarrollo (por ejemplo, tests), va en `devDependencies` y nunca se carga desde el juego.
- **Gráficos dibujados por código.** La única imagen es `assets/head.png`. El pixel art usa `rect()` (`src/render/draw.js`) en coordenadas enteras.
- **Personaje y nivel originales.** El juego se inspira en el género, pero no reproduce personajes, sprites, música ni niveles de juegos existentes.
- **Debe seguir siendo asequible:** hay 3 vidas, pero el fin de partida también felicita a David (sin puntuación). Un bot que corre sin esquivar termina el nivel; si un cambio lo impide, es demasiado difícil. Consulta los límites en `docs/level-design.md`.
- **Móvil primero:** cualquier cambio de UI debe funcionar en Chrome Android y Safari iOS (táctil, horizontal, audio tras un gesto).

## Idiomas

- Conversación con el usuario: español.
- Código, identificadores y comentarios: inglés.
- Textos visibles para el jugador (`index.html`, `WIN.MESSAGE`, `aria-label`): español.
- Documentación (`README.md`, `docs/`): español.
- Commits: inglés (detalle en la sección siguiente).

## Commits y push

### Cuándo

- Haz commit y push **solo cuando el usuario lo pida explícitamente**. La aprobación de un commit no vale para el siguiente.
- Un push a `main` **publica directamente en producción** (Netlify), así que antes de cada push hay que verificar el cambio (ver "Cómo ejecutar y verificar").
- Cada commit es una unidad coherente: el cambio de código junto con su documentación (`README.md`, `docs/`, `CLAUDE.md`) cuando le afecte.

### Identidad (obligatorio)

- El repo es **personal**: `git@github.com:citizen987/game_web_happybirthday.git`, rama `main`.
- La carpeta vive bajo `~/dev/work/`, donde un `includeIf` global aplica la identidad de **trabajo**. Por eso el repo tiene en su **configuración local**:
  - `user.name = citizen987`
  - `user.email = rubencodina@gmail.com`
  - `core.sshCommand = ssh -i ~/.ssh/id_ed25519_github_citizen987 -o IdentitiesOnly=yes`
- Antes de cada commit, ejecuta `git config user.email`: debe salir `rubencodina@gmail.com`. Si sale el correo de trabajo o no sale nada, **detente** y vuelve a fijar la config local; nunca hagas commit con la cuenta de trabajo.
- Si el repo se vuelve a clonar, hay que reaplicar esas tres claves con `git config` (sin `--global`).

### Formato del mensaje

En inglés, siguiendo [Conventional Commits](https://www.conventionalcommits.org/) y exactamente con esta forma:

```
<type>: <short descriptive sentence>

- <concise change 1>
- <concise change 2>
- <concise change 3>
```

- `type`: `feat`, `fix`, `refactor`, `docs`, `style`, `perf`, `test`, `chore`.
- Asunto en minúscula tras los dos puntos, en imperativo, sin punto final y de unos 72 caracteres como máximo.
- Cuerpo: de 1 a 5 viñetas cortas con lo que cambia (no cómo).
- **Prohibido** añadir `Co-Authored-By`, "Generated with Claude" o cualquier atribución a IA.

Ejemplo real del repo:

```
refactor: split game into layered ES modules and add docs

- Move head image to assets/ and styles to css/styles.css
- Split script into core, audio, world, game, render and ui modules
- Add README, CLAUDE.md, docs folder, netlify.toml and .gitignore
```

### Pasos

1. `git status` y `git diff`: revisa que solo entra lo previsto. Nada de `.atl/`, `node_modules/` ni archivos temporales.
2. `git config user.email` → correo personal.
3. `git add <archivos>` (o `git add -A` si el `status` está limpio de basura).
4. `git commit -F -` pasando el mensaje con un heredoc, para conservar el formato multilínea.
5. `git log -1 --format='%an <%ae> | %s'` para confirmar el autor.
6. `git push`. Después comprueba que https://gamehappybirthday.netlify.app/ sirve la versión nueva (por ejemplo, `curl -sI` a un archivo cambiado).
7. Nunca hagas `push --force`, reescribas historia publicada ni crees ramas o PRs sin que el usuario lo pida.

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
  - **Vidas** (`?debug`): golpe con monedas → mismas vidas y monedas esparcidas; golpe sin monedas (`world.coinCount = 0` + `teleport` sobre un cangrejo) → `player.dying` y, a los ~75 frames, una vida menos y reaparición en el checkpoint; caída (`player.y = 300`, `onGround = false`) → una vida menos y se conservan las monedas; a 0 vidas → `state === 'gameover'`, overlay en `data-mode="gameover"`, sin `dd-best` y compartir sin "puntos"; "Intentar de nuevo" → 3 vidas.
  - **Bola** (`?debug`, teclado): corriendo + ↓ → `rolling` y `vx` no aumenta; ← contra la dirección frena; por debajo de 0,3 se levanta (agachado si ↓ sigue pulsado). Cuesta abajo (`teleport(790)`, `rolling = true`) gana velocidad. Parado: ↓ + Espacio → `charging` sin saltar; al soltar ↓, `vx` entre 4,8 y 7,2. Todo salto pone `airBall`. Rodando contra un cangrejo lo destruye sin daño; andando contra él se aplican las reglas de golpe.
  - **Compartir:** `?debug` → `teleport(flagX - 150)` y mantener → hasta `state === 'win'`. Comprobar `__dd.result`, el panel, `__dd.shareFile` (PNG) y el `navigator.share` simulado (texto con los puntos y la URL, y un archivo adjunto).
  - **Móvil:** viewport de 844×390 con `hasTouch`, un `pointerdown` sobre `[data-btn=right]` mueve al jugador. En 390×844 aparece el aviso de girar.
  - Sin errores en la consola (`pageerror`).
- Tras cada cambio, da al usuario una checklist de verificación manual adaptada a lo modificado (ver `docs/development.md`).

## Gotchas conocidos

- **Audio:** solo se puede iniciar dentro de un gesto del usuario (`AudioEngine.unlock()` en la pantalla de inicio y en "Volver a jugar"). En iPhone, el interruptor de silencio físico también silencia WebAudio.
- **`head.png` desde `file://`:** el canvas queda "tainted"; `getImageData` falla y se omite el contorno pixelado (aparece un aviso en la consola).
- **Pointer events sintéticos en `window`:** `e.target` no es un `Node`; `MuteButton.contains` ya lo contempla.
- **Patrones de canvas:** se anclan al espacio del mundo gracias a `ctx.translate`, así que no hay que desplazarlos a mano.
- **El ancho interno es variable (240–400 px).** Nunca asumas 320: usa `display.width` o `view.w`.
- **Capas y la bola:** `render/player-view.js` repite `isBall` en lugar de importarla de `game/`, para no romper la regla de capas. Si cambias la condición, cámbiala en los dos sitios.
- **Compartir:** `navigator.share` exige un gesto del usuario y en iOS se invalida si hay un `await` previo. Por eso la tarjeta PNG se pregenera en `showResult` (`main.js`) y `shareCongrats` llama a `share` antes de cualquier `await`. No muevas la generación al clic.
- **Web Share en Playwright:** headless no la tiene. Simúlala con `addInitScript` (`navigator.share`/`canShare`) para la ruta nativa, y bórrala (`delete Navigator.prototype.share`) para probar la alternativa del portapapeles.
- **Netlify** inyecta un comentario y un script `/.netlify/scripts/hud` en el HTML servido. Es normal.
