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

- **Commits:** hazlos cuando lo consideres, por unidades de trabajo coherentes y ya verificadas (el cambio de código junto con su documentación: `README.md`, `docs/`, `CLAUDE.md`). No hace falta pedir permiso para cada commit; lo obligatorio es el formato del mensaje y la identidad personal.
- Si hay otros agentes editando en paralelo, añade solo las rutas de tu unidad (`git add <rutas>`), nunca `git add -A`.
- **Push:** un push a `main` **publica directamente en producción** (Netlify). Hazlo al cerrar el trabajo, con todo verificado (ver "Cómo ejecutar y verificar"), y confirma con el usuario antes si no lo ha pedido.

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
- **Suite E2E en el repo** (`tests/e2e/`, Playwright con `playwright-core`, servidor estático propio): `cd tests/e2e && npm install && npm test` (o `npm test -- <suite>`). Suites: `pwa`, `playthrough`, `mobile`, `share`, `lives`, `roll`, `letters`, `pause`, `feel`, `victory-song`, `timer`. Todo cambio debe dejarla en verde, y cada funcionalidad nueva añade o amplía una suite (ver `tests/e2e/README.md`). Las suites usan el hook `?debug` (`window.__dd`).
- Si añades un módulo a `src/`, añádelo también al `PRECACHE` de `sw.js` y sube `CACHE_VERSION`: la suite `pwa` falla si falta.
- Tras cada cambio, da al usuario una checklist de verificación manual adaptada a lo modificado (ver `docs/development.md`).

## Gotchas conocidos

- **Audio:** solo se puede iniciar dentro de un gesto del usuario (`AudioEngine.unlock()` en la pantalla de inicio y en "Volver a jugar"). En iPhone, el interruptor de silencio físico también silencia WebAudio.
- **`head.png` desde `file://`:** el canvas queda "tainted"; `getImageData` falla y se omite el contorno pixelado (aparece un aviso en la consola).
- **Pointer events sintéticos en `window`:** `e.target` no es un `Node`; `MuteButton.contains` ya lo contempla.
- **Patrones de canvas:** se anclan al espacio del mundo gracias a `ctx.translate`, así que no hay que desplazarlos a mano.
- **Lienzo fijo 16:9 (320×180).** Se escala manteniendo la proporción y el espacio sobrante muestra bandas decorativas (fondo de `html` en `css/styles.css`, con el horizonte al ~73 % para continuar el suelo del juego). Aun así, en el código usa `display.width`/`view.w` en lugar de 320 literal.
- **Predicados compartidos:** lo que necesiten a la vez `game/` y `render/` (como `isBall`) va en `src/model/`, que no depende de nada.
- **Compartir:** `navigator.share` exige un gesto del usuario y en iOS se invalida si hay un `await` previo. Por eso la tarjeta PNG se pregenera en `showResult` (`main.js`) y `shareCongrats` llama a `share` antes de cualquier `await`. No muevas la generación al clic.
- **Web Share en Playwright:** headless no la tiene. Simúlala con `addInitScript` (`navigator.share`/`canShare`) para la ruta nativa, y bórrala (`delete Navigator.prototype.share`) para probar la alternativa del portapapeles.
- **Netlify** inyecta un comentario y un script `/.netlify/scripts/hud` en el HTML servido. Es normal.
