// Propuesta de reforma. Mismas coordenadas en planta que en local.js (metros);
// las alturas se miden desde la solera original del local (cota 0).
//
// Solo incluye lo pedido; el resto del local (paredes, fachada, pilares,
// bajantes) se queda como en el estado actual:
//   1. Estructura metálica de suelo a la altura de la puerta, salvo los 2 m del fondo.
//   2. Esos 2 m del fondo, a la cota original, como almacén.
//   3. La pared que los separa, panelada desde la tarima hacia arriba, con el hueco
//      de la escalera; por debajo, acceso abierto al subsuelo bajo la tarima.
//   4. Escalera al fondo a la derecha (mirando desde la puerta) para bajar al almacén.
//   5. Falso techo dejando ~0,40 m para instalaciones (electricidad, ventilación…).
import { local } from './local.js'

const COTA = local.cotaCalle // la tarima queda a la altura del umbral de la puerta
const FONDO = 10.7 - 2 // la tarima llega hasta 2 m antes del muro del fondo

export const propuesta = {
  pleno: 0.4, // espacio bajo el forjado para instalaciones: el falso techo queda a alturaLibre - pleno

  // 1. Estructura metálica (pilares, vigas y viguetas) con su tablero
  tarima: {
    cota: COTA,
    poligono: [[0, 0], [6.9, 0], [6.9, FONDO], [0, FONDO]],
    separacionPilares: 2.2,
    separacionViguetas: 0.6,
  },

  // 4. Escalera: meseta a la altura de la tarima y tramo que baja hacia la izquierda.
  //    (En 2 m de fondo no cabe un tramo recto de 1,20 m de desnivel con meseta abajo.)
  escalera: {
    rellano: [[5.8, FONDO], [6.9, FONDO + 1.1]],
    tramo: [[4.12, FONDO], [5.8, FONDO + 1.1]],
    baja: 'izquierda', // izquierda | derecha | fondo | fachada
    peldanos: 7, // número de tabicas (≈ 17 cm cada una)
    barandilla: [[6.9, FONDO + 1.1], [4.12, FONDO + 1.1]], // lado abierto
  },

  // 3. Pared panelada sobre el borde de la tarima, con el paso a la escalera.
  //    Arranca a la altura de la tarima: por debajo queda abierto el acceso
  //    desde el almacén al subsuelo bajo la tarima.
  tabiques: [
    {
      de: [0, FONDO - 0.05],
      a: [6.9, FONDO - 0.05],
      espesor: 0.1,
      cota: COTA,
      acabado: 'panelado',
      huecos: [{ desde: 5.8, ancho: 1.1, alto: 2.1 }],
    },
  ],

  // Rótulos de las dos zonas (superficie y nivel)
  zonas: [
    { nombre: 'Tarima', poligono: [[0, 0], [6.9, 0], [6.9, FONDO - 0.1], [0, FONDO - 0.1]] },
    { nombre: 'Almacén', poligono: [[0, FONDO], [6.9, FONDO], [6.9, 10.7], [0, 10.7]] },
  ],
}
