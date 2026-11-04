# Desarrollo

## Requisitos

- Un navegador moderno.
- Cualquier servidor estático: Python 3, `npx serve`, la extensión Live Server de VS Code…

El juego no necesita `npm install` ni build. Solo la suite de pruebas (`tests/e2e/`) usa Node y `playwright-core`.

## Arrancar en local

```bash
python3 -m http.server 8000
```

Abre http://localhost:8000.

> ⚠️ Abrir `index.html` con doble clic (`file://`) **no funciona**: los navegadores bloquean los módulos ES fuera de HTTP.

### Probar en el móvil

1. Arranca el servidor en el PC.
2. Desde el móvil, en la misma wifi, abre `http://<ip-del-pc>:8000`.
3. El audio solo arranca tras tocar la pantalla de inicio (lo exigen los navegadores).
4. En iPhone (Safari 17+), el juego pide una sesión de audio `playback` (`navigator.audioSession`), así que suena aunque el interruptor de silencio físico esté activado. En versiones anteriores de iOS, ese interruptor sigue silenciando WebAudio.
5. iPhone no tiene la Fullscreen API: en la pantalla de inicio aparece un aviso lateral que sugiere "Añadir a pantalla de inicio". No sale en Android, ni en iPad, ni si el juego ya se abrió desde el icono.

## Modo depuración

Añade `?debug` a la URL (`http://localhost:8000/?debug`) para exponer `window.__dd` en la consola:

| Propiedad | Uso |
|---|---|
| `__dd.state` | Estado actual: `title`, `play`, `win` o `gameover` |
| `__dd.player` | Objeto del jugador (posición, velocidad, flags) |
| `__dd.coins` | Monedas recogidas |
| `__dd.lives` | Vidas restantes |
| `__dd.paused` | Juego en pausa |
| `__dd.time` / `__dd.timerBox()` | Tiempo de partida en segundos (el del cronómetro) / caja del cronómetro en píxeles internos |
| `__dd.audioState` / `__dd.suspendAudio()` | Estado del `AudioContext` (`null` antes del primer gesto, `running`, `suspended`) / lo suspende para probar que el siguiente toque lo reanuda |
| `__dd.super` / `__dd.freeze` | Súper David activo / frames restantes de la secuencia de transformación |
| `__dd.world` | Estado completo de la partida (para pruebas: `world.coinCount = 0`, `world.enemies`…) |
| `__dd.result` | Resultado final (`null` hasta llegar a la meta) |
| `__dd.shareFile` | `File` PNG de la tarjeta, cuando ya está generado |
| `__dd.flagX` | Posición x de la meta |
| `__dd.groundAt(x)` | Altura del suelo en x (`null` sobre un hueco) |
| `__dd.teleport(x)` | Coloca al jugador en el suelo en x |

Ejemplo: `__dd.teleport(__dd.flagX - 100)` para probar la celebración final.

Sin `?debug` no se expone nada.

## Dónde tocar según lo que quieras cambiar

| Quiero… | Archivo |
|---|---|
| Ajustar velocidad, salto o gravedad | `src/config.js` → `PHYSICS` |
| Cambiar el encuadre de la cámara | `src/config.js` → `CAMERA` |
| Editar el nivel | `src/world/level.js` (ver [level-design.md](level-design.md)) |
| Añadir un tipo de enemigo | `game/enemies.js` (movimiento y hitbox) + `render/entities-view.js` (dibujo) + `world/level.js` (colocación) |
| Añadir un sonido | Emitir `world.events.push('nombre')` en `game/` + función `nombre` en `audio/sfx.js` |
| Cambiar la música | `audio/music.js` → `MAIN_THEME` (notas MIDI, 0 = silencio) |
| Cambiar la canción de victoria | `audio/music.js` → `BIRTHDAY_SONG` (`[nota MIDI, tiempos]`, en 3/4) y `VICTORY_SONG_DELAY` |
| Cambiar el texto final | `src/config.js` → `WIN.MESSAGE` (y `LIVES.GAMEOVER_SUBTITLE` para el fin de partida) |
| Cambiar las vidas iniciales o la animación de muerte | `src/config.js` → `LIVES` |
| Ajustar rodar o la carga en parado | `src/config.js` → `ROLL` |
| Ajustar polvo y temblores (sensación) | `src/config.js` → `FEEL` |
| Puntos de las letras, notas o poderes de Súper David | `src/config.js` → `LETTERS` y `SUPER` |
| Mover una letra | `src/world/level.js` → bloque `Letters` |
| Cambiar el aspecto de la bola | `render/player-view.js` → `BALL` / `drawBall` |
| Cambiar la fórmula de puntuación | `src/config.js` → `SCORE` (y `game/score.js` si cambia la forma) |
| Cambiar el texto que se comparte | `ui/share.js` → `buildShareText` |
| Cambiar la URL, el título o el nombre del archivo compartido | `src/config.js` → `SHARE` |
| Cambiar el diseño de la tarjeta-imagen | `render/share-card.js` (maquetada a 1080 px) |
| Cambiar el aspecto del personaje | `render/player-view.js` |
| Cambiar la foto | Sustituye `assets/head.png` y ajusta `HEAD_SPRITE` en `config.js` (caja opaca y posición de la cara y la barbilla) |

## Convenciones

- Código, identificadores y comentarios en **inglés**. Textos visibles para el jugador en **español**.
- Sin dependencias externas en tiempo de ejecución.
- Pixel art solo con `rect()` en coordenadas enteras (`render/draw.js`).
- Errores explícitos: los fallos de carga o de APIs no soportadas se registran con `console.error` o `console.warn`; no se silencian.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/).

## Pruebas automáticas

```bash
cd tests/e2e
npm install      # solo la primera vez
npm test         # todas las suites (~95 s, casi todo es la partida completa del bot)
npm test -- roll lives   # solo las que coincidan
```

Detalles, elección de navegador y cómo añadir suites en [tests/e2e/README.md](../tests/e2e/README.md). Todo cambio debe dejar `npm test` en verde, y cada funcionalidad nueva lleva su suite.

## Verificación antes de hacer push

No hay CI. Cada push a `main` se publica directamente, así que verifica en local:

0. `cd tests/e2e && npm test` en verde.
1. Consola del navegador sin errores al cargar, jugar y terminar.
2. Una partida completa hasta la bandera: celebración y "Volver a jugar".
3. Caer a un hueco devuelve al último checkpoint.
4. Rodar (↓ en movimiento), cargar (↓ + saltar varias veces, soltar ↓) y saltar convierten al personaje en bola, que destruye enemigos al tocarlos. Pisar un enemigo lo elimina; tocarlo de lado con monedas las hace perder y parpadear; sin monedas, quita una vida. Perder las 3 vidas muestra la felicitación sin puntuación y "Intentar de nuevo" vuelve a dar 3 vidas.
5. Sonido y botón de silencio (también con la tecla M). Pausa con el botón ⏸, P o Esc: congela el juego y el audio; al cambiar de pestaña se pausa sola.
6. Emulación móvil en DevTools (en horizontal): los botones táctiles funcionan. En vertical aparece el aviso de girar.
7. Al terminar: aparece el panel con las monedas, el tiempo y los puntos, y "Compartir felicitación" abre el menú nativo en el móvil. En escritorio sin Web Share, copia el texto y aparece "Descargar tarjeta". Para borrar el récord: `localStorage.removeItem('dd-best')`.
8. Letras: cada una se ilumina en el marcador; la quinta muestra "¡SÚPER DAVID!", el pelo dorado y el aura; los enemigos mueren al tocarlos y caer sigue restando vida. Para probar rápido: `__dd.world.letters.forEach(l => l.taken = true)` y coger cualquier letra pendiente, o teletransportarse a ellas.
9. Si cambiaste el nivel: comprueba con `?debug` y `teleport` que cada hueco nuevo se puede saltar.
