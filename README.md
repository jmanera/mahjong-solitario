# Mahjong solitario

Juego de mahjong solitario (emparejar fichas) para tablet Android. Es una página web
(`app/assets/`) envuelta en una app Android mínima con un WebView a pantalla completa.
Funciona sin conexión.

## Instalar en la tablet

Con la tablet conectada por USB y la depuración USB activada:

```bash
./build.sh
adb install -r Mahjong.apk
```

`build.sh` pasa primero las pruebas de lógica y compila sin Gradle (usa `aapt2`, `javac`,
`d8` y `apksigner` del SDK en `~/Android/Sdk`). La primera vez crea `release.keystore`
(no se sube al repo): guárdalo, porque para actualizar la app sin desinstalarla
(y sin perder estadísticas) hay que firmar siempre con la misma clave.

## Qué incluye

- 12 tableros: Tortuga (clásico de 144 fichas), Iniciación, Pirámide, Diamante, Corazón,
  Mariposa, Cruz, Puente, Cuatro torres, Fortaleza, Muralla y Escalera.
- Juego completo de 144 fichas: círculos, bambú y caracteres (1–9), vientos, dragones,
  flores y estaciones (las flores casan entre sí, y las estaciones también).
- Repartos siempre resolubles (se puede desactivar) y partidas por número: el mismo
  número da siempre el mismo reparto.
- Pista, barajar (manteniendo la partida resoluble), deshacer y rehacer sin límite, pausa.
- Aviso cuando no quedan jugadas, con opción de barajar, deshacer o empezar otra.
- Puntuación con bonus por rapidez y por tiempo final; estadísticas y récords por tablero.
- Ajustes: color de la mesa, cuatro estilos de ficha, sonido, oscurecer fichas bloqueadas,
  números en las esquinas, contador de jugadas disponibles.
- La partida se guarda sola y se recupera en pausa al volver.
- En Android: pantalla completa, pantalla siempre encendida mientras juegas, orientación
  horizontal, y el botón atrás cierra ventanas o quita la pausa antes de salir.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/assets/layouts.js` | Definición de los tableros (coordenadas en medias fichas). |
| `app/assets/engine.js` | Reglas, repartos resolubles, barajado y pistas (sin DOM, se prueba con Node). |
| `app/assets/tiles.js` | Dibujo de las caras de las fichas en canvas. |
| `app/assets/app.js` | Interfaz, animaciones, ventanas, ajustes, estadísticas y guardado. |
| `app/src/.../MainActivity.java` | Envoltorio Android (WebView). |
| `tools/test.js` | Comprobaciones de tableros y del motor: `node tools/test.js`. |

## Probar en el ordenador

```bash
python3 -m http.server 8765 -d app/assets
```

Y abrir `http://localhost:8765`. Atajos de teclado: Z deshacer, Y rehacer, H pista, P pausa.
