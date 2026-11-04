# David Dash 🎂

Juego web de plataformas 2D hecho como regalo de cumpleaños para David. Inspirado en los plataformas de velocidad de las consolas de 16 bits: corres, saltas, recoges monedas, esquivas cangrejos y abejas y llegas a la bandera de meta, donde te espera una celebración con fuegos artificiales y un "¡FELICIDADES, DAVID!".

**Jugar:** https://gamehappybirthday.netlify.app/

## Propósito

- Un regalo personal, corto (60–90 s) y asequible. Aunque pierdas todas las vidas, la felicitación a David aparece igual.
- Funciona en el móvil (Chrome Android y Safari iOS) y en escritorio, sin instalar nada.
- Todo el arte está dibujado por código, salvo la foto de la cara de David (`assets/head.png`).

## Características

- Pixel art a 180 px de alto, escalado sin suavizado para ocupar la pantalla manteniendo la proporción.
- Fondo con parallax: cielo por franjas, nubes, montañas, colinas y agua.
- Física con aceleración, inercia, pendientes, *coyote time*, *jump buffer* y salto de altura variable.
- Plataformas fijas y móviles, huecos, rampas y checkpoints.
- Enemigos: si los pisas, desaparecen; si te tocan de lado, pierdes las monedas (puedes recuperarlas) y parpadeas durante 2 s.
- **Vidas:** empiezas con 3. Pierdes una al caer al vacío o al recibir un golpe sin monedas, y reapareces en el último checkpoint. Con 0 vidas la partida termina sin puntuación, pero con la felicitación (y también se puede compartir). Marcador arriba a la izquierda con la cara de David.
- Música chiptune original y efectos de sonido generados con WebAudio, con botón de silencio.
- Controles táctiles multitáctiles y aviso para girar el móvil cuando está en vertical.
- **Puntuación final** según las monedas y el tiempo, con récord personal guardado en el navegador.
- **Compartir la felicitación:** abre el menú nativo de compartir de Android/iOS con un texto y una tarjeta-imagen (la cara de David y la puntuación). Si el navegador no lo permite, copia el texto y ofrece descargar la tarjeta.

## Controles

| Acción | Teclado | Móvil |
|---|---|---|
| Moverse | ← → / A D | ◀ ▶ (abajo a la izquierda) |
| Agacharse | ↓ / S | ▼ |
| Saltar | Espacio / Z / ↑ / W | Botón grande (abajo a la derecha) |
| Silenciar | M | Botón 🔊 (arriba a la derecha) |
| Volver a jugar | Enter / Espacio | Botón "Volver a jugar" |
| Compartir | Botón "Compartir felicitación" | Botón "Compartir felicitación" |

## Stack

- **HTML + CSS + JavaScript puro** con `<canvas>` 2D.
- **Módulos ES nativos** (`<script type="module">`): sin frameworks, sin dependencias y sin paso de build.
- **WebAudio API** para todo el sonido (síntesis en tiempo real, sin archivos de audio).
- **Pointer Events** para los controles táctiles.
- **Web Share API** (`navigator.share` con archivos) para compartir, con alternativa de Clipboard API y descarga.
- **Netlify** como hosting estático, con despliegue continuo desde GitHub.

## Estructura

```
index.html            Markup: canvas, overlays y botones táctiles
css/styles.css        Estilos de los overlays, controles y aviso de rotación
assets/head.png       Única imagen externa (cara de David, fondo transparente)
src/
  main.js             Punto de entrada: crea los módulos, los conecta y ejecuta el bucle
  config.js           Constantes de ajuste (física, cámara, vista, assets)
  core/               Plataforma: canvas, audio e input
  audio/              Efectos de sonido y música
  world/              Definición estática del nivel (terreno y entidades)
  game/               Lógica pura del juego (sin DOM ni audio)
  render/             Dibujo pixel art (solo lectura del estado)
  ui/                 Overlays del DOM e integración con el móvil
  utils/              Utilidades sin dependencias
docs/                 Documentación técnica
```

Hay más detalle en [docs/architecture.md](docs/architecture.md).

## Puntuación

```
Puntos = monedas × 100 + max(0, 120 − segundos) × 50
```

El tiempo cuenta solo mientras se juega (la pausa del móvil en vertical no suma). Los golpes hacen perder monedas, así que la fórmula ya penaliza los choques. Los valores se ajustan en `SCORE` (`src/config.js`).

## Ejecutar en local

Los módulos ES **no cargan desde `file://`**, así que hace falta un servidor estático:

```bash
python3 -m http.server 8000
# o bien
npx serve .
```

Luego abre http://localhost:8000. Para probarlo en el móvil, entra desde la misma red a `http://<ip-de-tu-pc>:8000`.

Hay más información en [docs/development.md](docs/development.md).

## Despliegue en Netlify

El sitio está conectado al repositorio de GitHub: **cada `git push` a `main` publica automáticamente**. No hay comando de build; Netlify sirve la raíz tal cual (lo fija `netlify.toml`).

Los detalles y la puesta en marcha desde cero están en [docs/deployment.md](docs/deployment.md).

## Documentación

- [docs/architecture.md](docs/architecture.md): capas, módulos y flujo de datos.
- [docs/development.md](docs/development.md): entorno local, depuración y verificación.
- [docs/level-design.md](docs/level-design.md): cómo editar el nivel y sus límites jugables.
- [docs/deployment.md](docs/deployment.md): Netlify y publicación.

## Créditos

Código, gráficos y música originales. La foto de David (`assets/head.png`) se usa únicamente para este regalo personal.
