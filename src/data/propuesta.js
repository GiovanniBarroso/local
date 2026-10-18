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
//      perimetrales y cassette de aire acondicionado centrado.
//   6. Fachada: se abren los huecos del plano. Puerta a la izquierda, dos ventanas
//      a la derecha, rejillas de ventilación en los extremos y enfoscado pintado.
//   7. Aseo en el fondo izquierdo de la tienda, sobre la tarima, con antesala
//      (vestíbulo previo) hasta la bajante; el desagüe acomete a la bajante bajo la tarima.
//   8. Enchufes en las dos medianeras y cuadro eléctrico nuevo en el machón central,
//      a la derecha nada más entrar. Luces de emergencia en pared sobre las salidas.
//   9. Altillo metálico a 2,50 m en la mitad izquierda del almacén, con escala.
import { local } from './local.js'

const COTA = local.cotaCalle // la tarima queda a la altura del umbral de la puerta
const FONDO = 10.7 - 2.5 // la tarima llega hasta 2,50 m antes del muro del fondo
const ANCHO = 6.9
const ASEO = { x0: 0, x1: 1.5, y0: 6.45, y1: FONDO - 0.1 } // cabina del inodoro, pegada al panelado
const ANTESALA = { x0: 0, x1: 1.5, y0: 5.3, y1: ASEO.y0 } // vestíbulo previo, hasta pasada la bajante
const BAJANTE = local.bajantes[0] // bajante de la medianera izquierda, dentro de la antesala
const HUECOS = COTA + 2.2 // cabeza de la puerta y de las ventanas
const REJILLA = 0.25 // alto de las rejillas de ventilación
// las rejillas, centradas en la franja alta de la fachada (entre los huecos y la coronación)
const FRANJA = (HUECOS + local.alturaLibre) / 2 - REJILLA / 2
const ALTILLO = { x0: 0, x1: ANCHO / 2, y0: FONDO, y1: 10.7, cota: 2.5 } // mitad izquierda del almacén

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
      { muro: 0, tipo: 'rejilla', desde: 0.35, ancho: 0.3, antepecho: FRANJA, alto: REJILLA },
      { muro: 0, tipo: 'celosia', desde: 0.7, ancho: 1.75, alto: 0.55, antepecho: 3.75 },
      { muro: 0, tipo: 'celosia', desde: 3.5, ancho: 2.75, alto: 0.35, antepecho: 3.45 },
      { muro: 0, tipo: 'rejilla', desde: 6.28, ancho: 0.3, antepecho: FRANJA, alto: REJILLA },
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
  // 7. Tabiques de la antesala y del aseo (el fondo del aseo es el propio panelado).
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
      // frente de la antesala, con su puerta hacia la tienda
      de: [ANTESALA.x0, ANTESALA.y0 + 0.04],
      a: [ANTESALA.x1, ANTESALA.y0 + 0.04],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [{ desde: 0.6, ancho: 0.8, alto: 2.1, puerta: true, bisagra: 'derecha' }], // abre contra el lateral
    },
    {
      // entre la antesala y el aseo
      de: [ASEO.x0, ASEO.y0 + 0.04],
      a: [ASEO.x1, ASEO.y0 + 0.04],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [{ desde: 0.6, ancho: 0.8, alto: 2.1, puerta: true, bisagra: 'derecha' }], // abre contra el lateral
    },
    {
      // lateral de la antesala y del aseo
      de: [ASEO.x1 - 0.04, ANTESALA.y0],
      a: [ASEO.x1 - 0.04, ASEO.y1],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [],
    },
  ],

  // 9. Altillo: forjado metálico ligero sobre cuatro pilares, barandilla en el lado
  //    abierto (hacia la escalera) y escala fija para subir. Debajo quedan ~2,15 m libres.
  altillo: {
    cota: ALTILLO.cota,
    poligono: [[ALTILLO.x0, ALTILLO.y0], [ALTILLO.x1, ALTILLO.y0], [ALTILLO.x1, ALTILLO.y1], [ALTILLO.x0, ALTILLO.y1]],
    separacionPilares: 3.5,
    barandilla: [[ALTILLO.x1, ALTILLO.y0], [ALTILLO.x1, 9.95]], // el resto del borde, para la escala
    escala: { x: ALTILLO.x1 + 0.06, y: 10.25, ancho: 0.45 },
  },

  // 7. Saneamiento del aseo bajo la tarima: desagües del inodoro y del lavabo hasta un
  //    colector que acomete a la bajante con un injerto (puntos: x, y, cota).
  saneamiento: [
    {
      diametro: 0.11,
      injerto: true,
      puntos: [[0.45, 7.95, COTA], [0.45, 7.95, COTA - 0.25], [0.2, 7.7, COTA - 0.27], [0.2, 5.8, COTA - 0.31], [BAJANTE.x, BAJANTE.y, COTA - 0.33]],
    },
    { diametro: 0.04, puntos: [[0.14, 6.15, COTA + 0.5], [0.14, 6.15, COTA - 0.2], [0.2, 6.15, COTA - 0.3]] },
  ],

  // 5. Techo: tiras LED perimetrales empotradas (a 0,60 m de las paredes), cassette
  //    de aire centrado en la tienda y regletas estancas en el almacén (una bajo el
  //    falso techo y otra bajo el altillo).
  techo: {
    panel: 0.6, // módulo del panelado del falso techo
    led: {
      poligono: [[0.6, 0.6], [ANCHO - 0.6, 0.6], [ANCHO - 0.6, FONDO - 0.1 - 0.6], [0.6, FONDO - 0.1 - 0.6]],
      color: '#ffcf8f', // luz cálida
    },
    aire: [{ x: ANCHO / 2, y: (FONDO - 0.1) / 2, lado: 0.84 }],
    regletas: [
      { x: 4.6, y: FONDO + 1.25, largo: 1.2, rot: 90 }, // almacén, junto a la escalera
      { x: ANCHO / 4, y: FONDO + 1.25, largo: 1.2, cota: ALTILLO.cota - 0.3 }, // bajo el altillo
    ],
  },

  // 8. Instalación eléctrica: cuadro nuevo en la cara interior del machón central, a la
  //    derecha nada más entrar; enchufes dobles a 0,30 m sobre la tarima en las medianeras.
  //    Luces de emergencia en pared sobre lo que hay que encontrar a oscuras: la puerta de
  //    la calle, el paso a la escalera y el pie de la escalera en el almacén.
  //    El cuadro de obra actual (medianera derecha) desaparece.
  quitar: ['cuadro'],
  mobiliario: [
    { tipo: 'cuadroNuevo', x: 2.98, y: 0.01, rot: 0, altura: 1.15 },
    // medianera izquierda (x = 0) y derecha (x = 6,9)
    ...[1.25, 3.1, 5.1].flatMap((y) => [
      { tipo: 'enchufe', x: 0.01, y, rot: 90, altura: 0.3 },
      { tipo: 'enchufe', x: ANCHO - 0.01, y, rot: -90, altura: 0.3 },
    ]),
    { tipo: 'emergencia', x: 1.125, y: 0.01, rot: 180, altura: 2.35 }, // sobre la puerta de entrada
    { tipo: 'emergencia', x: 6.3, y: FONDO - 0.11, rot: 0, altura: 2.25 }, // sobre el paso a la escalera
    { tipo: 'emergencia', x: 6.3, y: 10.69, rot: 0, altura: 2.3 }, // almacén, frente al pie de la escalera
    // 7. antesala: toma de agua junto a la bajante y lavabo en la misma medianera;
    //    aseo: inodoro contra el panelado
    { tipo: 'tomaAgua', x: 0.01, y: BAJANTE.y + 0.22, rot: 90, altura: 0.5 },
    { tipo: 'lavabo', x: 0.23, y: 6.15, rot: 90, ancho: 0.5 },
    { tipo: 'inodoro', x: 0.45, y: ASEO.y1 - 0.3, rot: 0 },
  ],

  // Rótulos de las zonas (superficie y nivel). "cota" y "rotulo" (dónde va el rótulo)
  // son opcionales: por defecto, el suelo y el centro de la zona.
  zonas: [
    { nombre: 'Tienda', poligono: [[0, 0], [ANCHO, 0], [ANCHO, FONDO - 0.1], [ASEO.x1, FONDO - 0.1], [ASEO.x1, ANTESALA.y0], [0, ANTESALA.y0]] },
    { nombre: 'Antesala', poligono: [[ANTESALA.x0, ANTESALA.y0], [ANTESALA.x1, ANTESALA.y0], [ANTESALA.x1, ANTESALA.y1], [ANTESALA.x0, ANTESALA.y1]] },
    { nombre: 'Aseo', poligono: [[ASEO.x0, ASEO.y0], [ASEO.x1, ASEO.y0], [ASEO.x1, ASEO.y1], [ASEO.x0, ASEO.y1]] },
    { nombre: 'Almacén', poligono: [[0, FONDO], [ANCHO, FONDO], [ANCHO, 10.7], [0, 10.7]], rotulo: [4.6, FONDO + 1.25] },
    { nombre: 'Altillo', poligono: [[ALTILLO.x0, ALTILLO.y0], [ALTILLO.x1, ALTILLO.y0], [ALTILLO.x1, ALTILLO.y1], [ALTILLO.x0, ALTILLO.y1]], cota: ALTILLO.cota },
  ],
}
