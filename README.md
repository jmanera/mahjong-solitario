# Mahjong solitario

Juego de mahjong solitario (emparejar fichas) para tablet Android. Es una página web
(`app/assets/`) envuelta en una app Android mínima con un WebView a pantalla completa.
Funciona sin conexión.

## Descargar

La última versión firmada está en [Releases](https://github.com/jmanera/mahjong-solitario/releases/latest): descarga `Mahjong.apk` y ábrelo
en la tablet (la primera vez hay que permitir instalar aplicaciones de origen desconocido), o
instálalo con `adb install -r Mahjong.apk`.

## Compilar e instalar desde el código

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

## Publicar una versión

El workflow [Publicar APK](.github/workflows/release.yml) compila el APK firmado y crea una release
nueva (`v1.N`). Solo se lanza a mano, desde *Actions > Publicar APK > Run workflow*, y solo lo puede
ejecutar el dueño del repositorio. Firma con la misma clave que `release.keystore`, guardada en el
secreto `KEYSTORE_BASE64` (el fichero en base64):

```bash
base64 -w0 release.keystore | gh secret set KEYSTORE_BASE64
```

## Otros juegos

Hechos de la misma forma, para la misma tablet:

- [Autodefinidos](https://github.com/jmanera/autodefinidos): crucigramas con las definiciones dentro de la cuadrícula.
- [Sopa de letras](https://github.com/jmanera/sopa-de-letras): sopas de letras por temas.
- [Abecedario](https://github.com/jmanera/abecedario): una definición por letra contra el reloj, para uno o varios jugadores.
