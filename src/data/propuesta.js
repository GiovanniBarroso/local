// Propuesta de reforma. Mismas coordenadas en planta que en local.js (metros);
// las alturas se miden desde la solera original del local (cota 0).
//
// Lo que no aparece aquí (medianeras, pilares, bajantes, forjado) se queda como
// en el estado actual.
//   1. Estructura metálica de suelo a la altura de la puerta, salvo los 2,50 m del fondo.
//   2. Esos 2,50 m del fondo, a la cota original, como almacén.
//   3. La pared que los separa, panelada desde la tarima hacia arriba, con el hueco
//      de la escalera; por debajo, acceso abierto al subsuelo bajo la tarima.
//   4. Escalera recta al fondo a la derecha (mirando desde la puerta) para bajar al almacén.
//   5. Falso techo panelado dejando ~0,40 m para instalaciones, con tiras LED
//      perimetrales, cassette de aire acondicionado centrado y luces de emergencia.
//   6. Fachada: se abren los huecos del plano. Puerta a la izquierda, dos ventanas
//      a la derecha, rejillas de ventilación en los extremos y enfoscado pintado.
//   7. Aseo en el fondo izquierdo de la tienda, sobre la tarima.
//   8. Enchufes en las dos medianeras y cuadro eléctrico nuevo en el machón central,
//      a la derecha nada más entrar.
import { local } from './local.js'

const COTA = local.cotaCalle // la tarima queda a la altura del umbral de la puerta
const FONDO = 10.7 - 2.5 // la tarima llega hasta 2,50 m antes del muro del fondo
const ANCHO = 6.9
const ASEO = { x0: 0, x1: 1.5, y0: FONDO - 0.1 - 2.0, y1: FONDO - 0.1 } // aseo pegado al panelado

export const propuesta = {
  pleno: 0.4, // espacio bajo el forjado para instalaciones: el falso techo queda a alturaLibre - pleno

  // 6. Fachada (muro 0). Sustituye a los huecos actuales de ese muro.
  //    La puerta mantiene posición y ancho; las ventanas van en el hueco derecho del
  //    plano (3,47–6,59) con el antepecho a 1,00 m sobre la tarima; las celosías se
  //    conservan recortadas para dejar sitio a las rejillas en los extremos.
  fachada: {
    acabado: 'pintado', // enfoscado y pintado en beige; el machón central queda en gris
    huecos: [
      { muro: 0, tipo: 'puerta', principal: true, desde: 0.4, ancho: 1.45, antepecho: COTA, alto: 2.2, hoja: true },
      { muro: 0, tipo: 'ventana', desde: 3.6, ancho: 1.35, antepecho: COTA + 1.0, alto: 1.2 },
      { muro: 0, tipo: 'ventana', desde: 5.1, ancho: 1.35, antepecho: COTA + 1.0, alto: 1.2 },
      { muro: 0, tipo: 'rejilla', desde: 0.35, ancho: 0.3, antepecho: 3.9, alto: 0.25 },
      { muro: 0, tipo: 'celosia', desde: 0.7, ancho: 1.75, alto: 0.55, antepecho: 3.75 },
      { muro: 0, tipo: 'celosia', desde: 3.5, ancho: 2.75, alto: 0.35, antepecho: 3.45 },
      { muro: 0, tipo: 'rejilla', desde: 6.28, ancho: 0.3, antepecho: 3.5, alto: 0.25 },
    ],
    // acabados sobre la cara exterior de la fachada
    parches: [{ muro: 0, cara: 'exterior', desde: 2.49, hasta: 3.47, de: COTA, a: 4.4, acabado: 'gris' }],
  },

  // 1. Estructura metálica (pilares, vigas y viguetas) con su tablero
  tarima: {
    cota: COTA,
    poligono: [[0, 0], [ANCHO, 0], [ANCHO, FONDO], [0, FONDO]],
    separacionPilares: 2.2,
    separacionViguetas: 0.6,
  },

  // 4. Escalera recta pegada a la medianera derecha, bajando hacia el fondo.
  //    Con 2,50 m de fondo cabe un tramo recto (7 tabicas ≈ 17 cm, huellas ≈ 29 cm).
  escalera: {
    tramo: [[5.7, FONDO], [ANCHO, FONDO + 1.75]],
    baja: 'fondo', // izquierda | derecha | fondo | fachada
    peldanos: 7, // número de tabicas
    barandilla: [[5.7, FONDO], [5.7, FONDO + 1.75]], // lado abierto
  },

  // 3. Pared panelada sobre el borde de la tarima, con el paso a la escalera.
  //    Arranca a la altura de la tarima: por debajo queda abierto el acceso
  //    desde el almacén al subsuelo bajo la tarima.
  // 7. Tabiques del aseo (el fondo del aseo es el propio panelado).
  tabiques: [
    {
      de: [0, FONDO - 0.05],
      a: [ANCHO, FONDO - 0.05],
      espesor: 0.1,
      cota: COTA,
      acabado: 'panelado',
      huecos: [{ desde: 5.7, ancho: 1.2, alto: 2.1 }],
    },
    {
      // frente del aseo, con su puerta hacia la tienda
      de: [ASEO.x0, ASEO.y0 + 0.04],
      a: [ASEO.x1, ASEO.y0 + 0.04],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [{ desde: 0.35, ancho: 0.8, alto: 2.1, puerta: true }],
    },
    {
      // lateral del aseo
      de: [ASEO.x1 - 0.04, ASEO.y0],
      a: [ASEO.x1 - 0.04, ASEO.y1],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [],
    },
  ],

  // 5. Techo: tiras LED perimetrales empotradas (a 0,60 m de las paredes), cassette
  //    de aire centrado en la tienda, luces de emergencia sobre las salidas y en el
  //    eje del local, y una regleta estanca en el almacén.
  techo: {
    panel: 0.6, // módulo del panelado del falso techo
    led: {
      poligono: [[0.6, 0.6], [ANCHO - 0.6, 0.6], [ANCHO - 0.6, FONDO - 0.1 - 0.6], [0.6, FONDO - 0.1 - 0.6]],
      color: '#ffcf8f', // luz cálida
    },
    aire: [{ x: ANCHO / 2, y: (FONDO - 0.1) / 2, lado: 0.84 }],
    emergencias: [
      { x: ANCHO / 2, y: 1.2 }, //       eje, junto a la fachada
      { x: ANCHO / 2, y: FONDO - 1.2 }, // eje, junto al fondo
      { x: 1.125, y: 0.3, rot: 0 }, //    sobre la puerta de entrada
      { x: 4.5, y: 10.7 - 1.2, rot: 90 }, // almacén, junto al pie de la escalera
    ],
    regletas: [{ x: 2.5, y: FONDO + 1.25, largo: 1.2, rot: 90 }], // almacén
  },

  // 8. Instalación eléctrica: cuadro nuevo en la cara interior del machón central, a la
  //    derecha nada más entrar; enchufes dobles a 0,30 m sobre la tarima en las medianeras.
  //    El cuadro de obra actual (medianera derecha) desaparece.
  quitar: ['cuadro'],
  mobiliario: [
    { tipo: 'cuadroNuevo', x: 2.98, y: 0.01, rot: 0, altura: 1.15 },
    // medianera izquierda (x = 0) y derecha (x = 6,9)
    ...[1.25, 3.1, 5.1].flatMap((y) => [
      { tipo: 'enchufe', x: 0.01, y, rot: 90, altura: 0.3 },
      { tipo: 'enchufe', x: ANCHO - 0.01, y, rot: -90, altura: 0.3 },
    ]),
    // 7. aseo: inodoro contra el panelado, lavabo en el lateral, toma de agua
    { tipo: 'inodoro', x: 0.45, y: ASEO.y1 - 0.3, rot: 0 },
    { tipo: 'lavabo', x: ASEO.x1 - 0.08 - 0.23, y: ASEO.y0 + 0.95, rot: -90 },
    { tipo: 'tomaAgua', x: 1.05, y: ASEO.y1 - 0.01, rot: 0, altura: 0.5 },
  ],

  // Rótulos de las zonas (superficie y nivel)
  zonas: [
    { nombre: 'Tienda', poligono: [[0, 0], [ANCHO, 0], [ANCHO, FONDO - 0.1], [ASEO.x1, FONDO - 0.1], [ASEO.x1, ASEO.y0], [0, ASEO.y0]] },
    { nombre: 'Aseo', poligono: [[ASEO.x0, ASEO.y0], [ASEO.x1, ASEO.y0], [ASEO.x1, ASEO.y1], [ASEO.x0, ASEO.y1]] },
    { nombre: 'Almacén', poligono: [[0, FONDO], [ANCHO, FONDO], [ANCHO, 10.7], [0, 10.7]] },
  ],
}
