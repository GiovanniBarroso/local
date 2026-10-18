// Modelo: la propuesta revisada tras estudiarla. Parte de propuesta.js y cambia solo
// lo que se mejora; lo demás (fachada, tarima, techo, electricidad…) es igual.
//   1. Aseo accesible: si el local tiene que tener aseo, al menos uno debe ser accesible
//      (CTE DB-SUA 9). Cabina de 2,10 × 1,70 m con giro de Ø 1,50, inodoro con espacio
//      de transferencia de 0,80 m y barras de apoyo, lavabo volado; se mantiene la
//      antesala, con la bajante y la toma de agua, y las dos puertas pasan a correderas
//      de 0,90 m alineadas (se cruza la antesala en línea recta, sin girar).
//   2. Tarima con pilares cada ~3,40 m (12 en vez de 20) y vigas de más canto: el
//      subsuelo queda despejado para usarlo como trastero desde el almacén.
//   3. Altillo con escalera de servicio (con peldaños y barandilla) en vez de escala
//      vertical: se sube y se baja con cajas en las manos.
import { propuesta, medidas, tienda } from './propuesta.js'

const { COTA, FONDO, ANTESALA, BAJANTE, ALTILLO } = medidas
const X1 = 2.2 // el bloque de la antesala y el aseo llega hasta aquí (antes 1,50)
const ASEO = { x0: 0, x1: X1, y0: 6.35, y1: FONDO - 0.1 }
const PUERTA = { desde: 1.0, ancho: 0.9, alto: 2.1, puerta: true } // paso libre ≥ 0,80

const sinAseo = (lista) => lista.filter((o) => o.grupo !== 'aseo')

export const modelo = {
  ...propuesta,

  // Resumen para la ficha
  notas: [
    'Aseo accesible: giro Ø 1,50, barras de apoyo y lavabo volado, con antesala y puertas correderas de 0,90',
    'Tarima con 12 pilares en vez de 20: subsuelo despejado como trastero',
    'Escalera de servicio al altillo en vez de escala vertical',
  ],

  // 2. Menos pilares y vigas de más canto (luces de ~3,1 m)
  tarima: { ...propuesta.tarima, separacionPilares: 3.4, cantoViga: 0.22 },

  // 3. Escalera de servicio pegada al muro del fondo, subiendo hacia el altillo
  altillo: {
    ...propuesta.altillo,
    escala: null,
    barandilla: [[ALTILLO.x1, ALTILLO.y0], [ALTILLO.x1, 10.0]],
    escalera: {
      tramo: [[ALTILLO.x1, 10.0], [ALTILLO.x1 + 1.6, 10.65]],
      baja: 'derecha',
      peldanos: 12, // tabicas de ~21 cm
      barandilla: [[ALTILLO.x1, 10.0], [ALTILLO.x1 + 1.6, 10.0]],
    },
  },

  // 1. Antesala y aseo accesible
  tabiques: [
    ...sinAseo(propuesta.tabiques),
    {
      // frente de la antesala; la hoja corre por dentro hacia la medianera
      de: [0, ANTESALA.y0 + 0.04],
      a: [X1, ANTESALA.y0 + 0.04],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [{ ...PUERTA, corredera: { hacia: -1, cara: -1 } }],
    },
    {
      // entre la antesala y el aseo, con la puerta en línea con la de entrada
      de: [0, ASEO.y0 + 0.04],
      a: [X1, ASEO.y0 + 0.04],
      espesor: 0.08,
      acabado: 'pintado',
      huecos: [{ ...PUERTA, corredera: { hacia: -1, cara: 1 } }],
    },
    { de: [X1 - 0.04, ANTESALA.y0], a: [X1 - 0.04, ASEO.y1], espesor: 0.08, acabado: 'pintado', huecos: [] },
  ],

  mobiliario: [
    ...sinAseo(propuesta.mobiliario),
    { tipo: 'tomaAgua', x: 0.01, y: BAJANTE.y + 0.22, rot: 90, altura: 0.5 },
    { tipo: 'inodoro', x: 0.45, y: ASEO.y1 - 0.3, rot: 0 },
    { tipo: 'barrasApoyo', x: 0.45, y: ASEO.y1 - 0.3, rot: 0 },
    { tipo: 'lavabo', x: X1 - 0.08 - 0.23, y: ASEO.y1 - 0.55, rot: -90, ancho: 0.5, pie: false },
    { tipo: 'giro', x: 1.35, y: 7.2 },
  ],

  saneamiento: [
    propuesta.saneamiento[0], // inodoro → bajante
    { diametro: 0.04, puntos: [[1.95, ASEO.y1 - 0.55, COTA + 0.5], [1.95, ASEO.y1 - 0.55, COTA - 0.2], [0.2, ASEO.y1 - 0.55, COTA - 0.28]] },
  ],

  zonas: [
    { ...propuesta.zonas.find((z) => z.nombre === 'Tienda'), poligono: tienda(X1) },
    { nombre: 'Antesala', poligono: [[0, ANTESALA.y0], [X1, ANTESALA.y0], [X1, ASEO.y0], [0, ASEO.y0]] },
    { nombre: 'Aseo accesible', poligono: [[0, ASEO.y0], [X1, ASEO.y0], [X1, ASEO.y1], [0, ASEO.y1]] },
    ...propuesta.zonas.filter((z) => z.nombre === 'Almacén' || z.nombre === 'Altillo'),
  ],
}
