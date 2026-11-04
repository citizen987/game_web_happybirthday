# Arquitectura

## Principios

1. **Sin dependencias ni build.** El navegador carga los módulos ES directamente; lo que hay en el repo es exactamente lo que se publica.
2. **Capas con dependencias en un solo sentido.** La lógica no conoce el DOM, el audio ni el canvas.
3. **Estado separado de su representación.** `game/` muta el estado; `render/` solo lo lee.
4. **Datos estáticos frente a estado de partida.** `world/level.js` describe el nivel; `game/world.js` crea a partir de él un estado nuevo en cada partida.

## Capas

```
                 main.js  (composition root + bucle)
                    │
   ┌────────┬───────┼─────────┬──────────┐
   ▼        ▼       ▼         ▼          ▼
  ui/     core/   audio/    render/     game/ ──▶ world/
 (DOM)  (platform) (sonido) (canvas)   (lógica)   (datos)
                                          │
                     config.js · utils/  ◀┘ (los usan todas)
```

| Capa | Responsabilidad | Puede depender de |
|---|---|---|
| `config.js` | Constantes de ajuste | — |
| `utils/` | Funciones puras genéricas (`clamp`, PRNG, storage seguro) | — |
| `model/` | Predicados puros sobre el estado compartidos por varias capas (`isBall`) | — |
| `world/` | Terreno y definición del nivel | `config`, `utils` |
| `game/` | Estado y reglas: física, enemigos, recogidas, cámara, máquina de estados | `config`, `utils`, `model`, `world` (vía datos) |
| `render/` | Dibujar un frame a partir del estado | `config`, `utils`, `model` |
| `audio/` | Efectos y música sobre `AudioEngine` | `core/audio` |
| `core/` | Canvas y escalado, WebAudio, teclado y táctil | `config`, `utils` |
| `ui/` | Overlays del DOM, botón de silencio, fullscreen y gestos del móvil. `share-flow.js` orquesta el final (récord, tarjeta y compartir) | `config`, `core/best-score`, `render/share-card` |
| `main.js` | Crea y conecta todo y ejecuta el bucle | todas |

**Regla clave:** `game/` nunca importa de `core/`, `render/`, `audio/` ni `ui/`. Se comunica hacia fuera mediante:

- **Eventos** (`world.events`): nombres como `'jump'`, `'coin'`, `'hit'`… `Game.flushEvents()` los traduce en llamadas a `sfx[nombre]()`. Para añadir un sonido nuevo basta con emitir un evento y añadir la función con el mismo nombre en `audio/sfx.js`.
- **Callbacks** del constructor de `Game`: `onStateChange(state)` y `onShowWin()`.
- **Input por interfaz:** `Game.update(input, viewW)` solo usa `input.left/right/down/jump` y `input.consumeJump()`.

## Máquina de estados

```
title ──start()──▶ play ──bandera──────▶ win ──────┐
                    │                                ├─restart()──▶ play
                    └──0 vidas──▶ gameover ──────────┘
```

- `title`: escena estática detrás del overlay de inicio. La simulación no avanza.
- `play`: input activo y controles táctiles visibles (`body[data-state="play"]`).
- `gameover`: sin vidas. No hay puntuación (`game.result = null`) ni récord. Hay confeti, y en `LIVES.GAMEOVER_OVERLAY_AT` se llama a `onGameOver()`: el mismo overlay en modo `data-mode="gameover"` (felicitación, subtítulo, compartir e "Intentar de nuevo").
- `win`: control bloqueado, saltos de alegría, fuegos artificiales y confeti. Al entrar se calcula `game.result` (`game/score.js`). En `WIN.SHOW_OVERLAY_AT` se llama a `onShowWin(result)` y aparece el overlay con el panel de puntuación.

## Puntuación y compartir

```
Game.triggerWin ─▶ computeScore()  ──▶ game.result
                                         │ onShowWin(result)
main.showResult ─┬▶ submitBestScore()     (core/best-score.js, localStorage)
                 ├▶ screens.showWin()     (panel + contador animado)
                 └▶ createShareCard()     (render/share-card.js → PNG 1080×1080, pregenerado)
botón Compartir ─▶ shareCongrats()        (ui/share.js)
                     navigator.share({ text, files }) ─┬▶ menú nativo
                                                       └▶ fallback: portapapeles + enlace de descarga
```

- **La tarjeta se genera al mostrar el panel, no al pulsar:** `navigator.share` tiene que llamarse dentro del gesto del usuario, y en iOS cualquier `await` previo (como `canvas.toBlob`) lo invalida.
- El tiempo sale de `playFrames`, que solo cuenta en el estado `play` y en pasos fijos, así que es independiente de la tasa de refresco y de las pausas.
- Cancelar el menú de compartir (`AbortError`) no se trata como error.

## Bola: rodar, cargar y saltar

Estados del jugador en `game/player.js` (constantes en `ROLL`, `config.js`):

```
de pie ──↓ con |vx| ≥ START_MIN──▶ rolling ──|vx| < EXIT──▶ de pie / agachado
agachado ──saltar──▶ charging ──saltar: +CHARGE_ADD (máx. CHARGE_MAX), pierde 1/32 por frame
                      └──soltar ↓──▶ rolling a RELEASE_BASE + floor(charge) × RELEASE_PER_CHARGE
cualquier salto ──▶ airBall ──aterrizar──▶ de pie (↓ mantenido vuelve a rodar)
```

- `rolling`: sin aceleración. Rozamiento a la mitad, frenada contra la dirección y pendientes ×2,5 cuesta abajo y ×0,6 cuesta arriba. Velocidad máxima `ROLL.MAX_V`.
- `isBall(p)` = `rolling || charging || airBall`. Bola de radio `ROLL.RADIUS` (≈ 2/3 de la altura de pie) con hitbox a juego frente a enemigos y monedas (`ROLL.H_BALL`, `ROLL.HALF_W_BALL` vía `playerHalfW`; contra el terreno se mantiene `PLAYER.HALF_W`) y, mientras se es bola, **`isAttacking(p)`**: cualquier contacto destruye al enemigo (rebote solo si caes desde arriba; rodando no se pierde velocidad).
- `clearBall()` se llama al recibir un golpe, al morir y al llegar a la meta (la celebración se hace con la cara de David).
- La cámara sigue más rápido a altas velocidades (`CAMERA.LERP_X_FAST`) y limita la anticipación (`MAX_LOOK`).
- Los eventos de sonido pueden llevar parámetro: `{ name: 'charge', arg: 0..1 }` (el tono sube con la carga).
- `isBall` vive en `model/player-state.js` y la importan tanto `game/player.js` como `render/player-view.js`.

## Letras D-A-V-I-D y Súper David

- `world/level.js` define `letters` (5 posiciones) y `game/world.js` las copia con `taken`, más `super`, `transformPending` y `flash`.
- `game/pickups.js`: al coger una letra emite `{ name: 'letter', arg: índice }` (la nota sube con cada letra) y, con las 5, marca `transformPending`.
- `game/super.js` contiene la secuencia (`beginTransform`, `stepTransform`) y la estela (`superTrail`); `Game.startTransform()` la orquesta con la música y el callback. Congela la acción durante `SUPER.SEQUENCE_FRAMES` (`game.freeze`; el cronómetro no avanza), con destello, fanfarria `transform` y `onTransform()` (rótulo DOM "¡SÚPER DAVID!"). Al terminar, `world.super = true` y la música arranca en variante `{ bpm: SUPER.MUSIC_BPM, transpose: SUPER.MUSIC_TRANSPOSE }`.
- **Efectos de `super`:**
  - `player.js` aplica multiplicadores (`motionLimits`: velocidad ×1,5, aceleración ×2, salto ×1,12).
  - `enemies.js` destruye a cualquier enemigo al contacto y nunca hiere.
  - **Las caídas siguen costando vida**; el estado `super` vive en `world`, así que se conserva al reaparecer y solo se reinicia con una partida nueva.
- **Render:**
  - `head-sprite.js` genera `goldRight`/`goldLeft` recoloreando a dorado los píxeles azules del pelo (requiere HTTP).
  - `player-view.js` dibuja el aura (`drawAura`) y la bola dorada.
  - `hud.js` dibuja las ranuras `D A V I D` con los glifos de `letter-glyphs.js`.
- **Puntuación:** `computeScore({ ..., letters })` suma `LETTERS.POINTS` por letra y `LETTERS.WORD_BONUS` si se completa el nombre. El panel, el texto de compartir y la tarjeta lo reflejan.

## Vidas

- `world.lives` empieza en `LIVES.START` (3).
- **Golpe lateral:** con monedas, se pierden (y se esparcen); sin monedas, `killPlayer()` activa `player.dying` (salto, caída sin colisiones y evento `'die'`).
- `Game.checkLifeLoss()` (solo en `play`): al terminar la animación de muerte (`LIVES.DEATH_FRAMES`) o al caer por debajo de `DEATH_Y`, llama a `loseLife()`. Es el **único punto** donde se resta una vida: si quedan, `respawn()` en el último checkpoint; si no, `triggerGameOver()`.
- Mientras `dying`, el jugador no recoge monedas, no activa checkpoints ni la meta, y no interactúa con enemigos.

## Bucle principal

`main.js` usa un **paso fijo de 60 Hz** con acumulador, de modo que la física es idéntica en pantallas de 60, 90 o 120 Hz. Se renderiza una vez por `requestAnimationFrame`. Mientras el móvil está en vertical (`portraitQuery`), la simulación se pausa.

Orden dentro de `Game.update`:

1. Plataformas móviles.
2. Jugador (input, física y aterrizajes, o animación de muerte) y comprobación de pérdida de vida.
3. Enemigos (patrulla y colisión: pisotón o golpe).
4. Recogidas: monedas, monedas perdidas, checkpoints y meta.
5. Partículas y confeti.
6. Secuencia de victoria (si toca).
7. Cámara, temporizadores de `fade` y `shake`.
8. Vaciado de eventos de sonido.

## Módulos principales

| Archivo | Qué contiene |
|---|---|
| `world/terrain.js` | `Terrain`: segmentos rectos ordenados, constructor encadenable (`flat`, `ramp`, `gap`) y consultas `groundAt(x)` y `slopeAt(x)` con búsqueda binaria |
| `world/level.js` | `buildLevel()`: terreno, monedas, plataformas, enemigos, checkpoints y decoración determinista |
| `game/player.js` | Física del jugador dividida en fuerzas, movimiento horizontal con muros, seguimiento del suelo y gravedad con aterrizaje |
| `game/enemies.js` | Patrulla de cangrejos y abejas, pisotón y golpe lateral |
| `game/pickups.js` | Monedas, monedas derramadas y checkpoints; devuelve si se ha tocado la meta |
| `game/effects.js` | Partículas, fuegos artificiales y confeti |
| `game/camera.js` | Seguimiento suave con anticipación en la dirección de carrera |
| `game/game.js` | Máquina de estados y orquestación |
| `render/renderer.js` | Orden de capas de un frame y temblor de cámara |
| `render/head-sprite.js` | Reduce la foto, endurece el alfa y añade el contorno de 1 px |
| `core/input.js` | Teclado y botones táctiles con *hit-test* por puntero (permite deslizar el dedo entre botones) |
| `core/audio.js` | `AudioEngine`: contexto, buses, silencio persistente y primitivas `tone`/`noise` |
| `audio/music.js` | Planificador con *lookahead* y el tema principal como datos. `playOnce()` programa una canción completa en su propio `GainNode` (así `stop()` la corta); se usa para "Cumpleaños feliz" al ganar (`playVictory()`) |
| `game/score.js` | `computeScore({ coins, frames, totalCoins })`: función pura |
| `core/best-score.js` | Récord personal en `localStorage` |
| `render/share-card.js` | Tarjeta PNG para compartir (cielo, confeti, foto y puntuación) |
| `ui/share.js` | Texto de la felicitación, Web Share API y portapapeles |
| `utils/format.js` | `formatPoints` (4.250) y `formatTime` (1:14) |

## Coordenadas

- Resolución interna fija **320×180 (16:9)**, igual en todos los dispositivos, para que todos vean el mismo encuadre. Se escala con CSS al mayor tamaño que quepa; en pantallas más alargadas (móviles ~20:9) o más cuadradas (tablets 4:3) quedan bandas decorativas que imitan el cielo y el suelo.
- Mundo: `x` crece hacia la derecha e `y` hacia abajo. El suelo base está en `y = 150` y el agua en `y = 182`. Por debajo de `DEATH_Y = 250` se reaparece en el último checkpoint.
- Las capas de fondo se dibujan en coordenadas de pantalla con parallax. El resto, dentro de `ctx.translate(-camX, -camY)`.
