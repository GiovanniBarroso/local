# Local · propuesta de reforma en 3D

Visor web (Three.js) para enseñar el local en su estado actual y con la reforma propuesta.

- **Estado actual / Propuesta / Comparar**: el comparador parte la pantalla con un divisor arrastrable (antes | después) desde la misma cámara.
- **Maqueta**: vista de pájaro sin techo. Los muros que tapan la cámara se recortan solos.
- **Planta**: vista cenital ortogonal cortada a 1,10 m, con muros en relleno oscuro, cotas y superficies por zona.
- **Recorrido**: a la altura de los ojos. Se arrastra para mirar, se hace clic en el suelo para ir y también se puede caminar con WASD o las flechas.
- **Estructura**: en la propuesta, oculta el tablero de la tarima para ver la estructura metálica (pilares, vigas y viguetas). En planta queda como un plano de estructura.
- **Captura**: descarga un PNG de lo que se ve.

En el recorrido se camina por los dos niveles: tarima (a cota de calle) y almacén (cota original), bajando por la escalera.

La URL guarda la vista (`#propuesta/planta`, `#comparar/recorrido`…), así que se puede mandar un enlace que abra directamente en una vista concreta.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm run deploy   # compila y publica en https://giovannibarroso.github.io/local/
```

`npm run deploy` sube la web compilada a la rama `gh-pages`, que es la que sirve GitHub Pages. El código fuente va en `master` con un `git push` normal.

## Dónde se cambian las cosas

Todo el modelo sale de dos archivos de datos, en metros:

| Archivo | Contenido |
| --- | --- |
| [src/data/local.js](src/data/local.js) | Estado actual: contorno de la planta, altura libre, espesor de muro, huecos (escaparate, puertas), pilares y lo que hay ahora |
| [src/data/propuesta.js](src/data/propuesta.js) | Reforma: tarima metálica a la altura de la puerta (salvo los 2 m del fondo), almacén al fondo, panelado con el paso a la escalera, escalera y falso techo con 0,40 m para instalaciones. El resto del local se queda como está |

Coordenadas: igual que un plano en papel con la fachada abajo. `x` va hacia la derecha y `y` hacia el fondo, con origen en la esquina interior izquierda de la fachada. El muro `i` va del punto `i` al `i+1` del contorno.

> La planta (6,90 × 10,70 m), los pilares y las bajantes salen del plano acotado. La **altura libre (≈ 4,40 m)**, la **cota de la acera / umbral (≈ +1,20 m)** y los huecos actuales de fachada están **estimados a partir de fotos**: hay que confirmarlos midiendo. Al cambiar `alturaLibre` o `cotaCalle` en `local.js`, la tarima, el falso techo (con su plénum de 0,40 m) y la escalera se recalculan solos.

## Estructura

```
src/
  data/          datos del local y de la propuesta (lo único que hay que tocar)
  escena.js      construye cada escena: suelo, muros con huecos, tabiques, pilares, luces
  mobiliario.js  elementos sueltos paramétricos (hoy solo el cuadro eléctrico existente)
  texturas.js    texturas generadas por código (hormigón, ladrillo, bloque, forjado reticular, celosía, paneles)
  materiales.js  acabados del estado actual y de la propuesta
  cotas.js       cotas y rótulos de zonas
  recorrido.js   controles del recorrido a pie
  main.js        cámaras, interfaz, comparador y bucle de render
```

No usa imágenes ni modelos externos: todo se genera por código, sin licencias y sin coste.
