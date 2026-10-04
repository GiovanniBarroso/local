// Estado actual del local (en bruto). Todas las medidas en metros.
//
// Coordenadas en planta, como en un plano en papel con la fachada abajo:
//   x → hacia la derecha (mirando el local desde la calle)
//   y → hacia el fondo del local
// El origen (0, 0) es la esquina interior izquierda de la fachada.
//
// Fuente: plano acotado (6,90 × 10,70) y fotos de la visita.
// ⚠ La altura, la cota de la calle y los huecos de fachada están ESTIMADOS a partir de las fotos.

export const local = {
  nombre: 'Local comercial',
  alturaLibre: 4.4, // ⚠ estimada por fotos: medir de solera a forjado
  alturaEstimada: true,
  // La acera está por encima del suelo del local: el umbral de la puerta queda a
  // esta cota sobre la solera. ⚠ estimada por fotos: medir.
  cotaCalle: 1.2,
  espesorMuro: [0.3, 0.15, 0.25, 0.15], // por muro: fachada, medianera dcha., fondo, medianera izda.
  acabadoParedes: 'ladrillo', // 'ladrillo' | 'bloque'
  forjado: 'reticular', // 'reticular' (bloques aligerantes vistos) | 'hormigon'

  // Contorno interior, punto a punto. El muro i va del punto i al punto i+1
  // (el último cierra contra el primero). Vale cualquier forma, no solo rectángulos.
  planta: [
    [0, 0], //      muro 0: fachada
    [6.9, 0], //    muro 1: medianera derecha
    [6.9, 10.7], // muro 2: fondo
    [0, 10.7], //   muro 3: medianera izquierda
  ],

  // Huecos. "desde" se mide a lo largo del muro desde su punto inicial;
  // "alto" es la altura del hueco y "antepecho" la altura a la que empieza.
  // Hoy la fachada está tapiada con ladrillo salvo el hueco de puerta, cuyo umbral
  // está a la cota de la acera, y la respiración superior (bandas de celosía).
  // Los huecos del plano (0,35–2,49 y 3,47–6,59) se abren en la propuesta.
  huecos: [
    { muro: 0, tipo: 'puerta', principal: true, desde: 0.4, ancho: 1.45, antepecho: 1.2, alto: 2.2 },
    { muro: 0, tipo: 'celosia', desde: 0.35, ancho: 2.1, alto: 0.55, antepecho: 3.75 },
    { muro: 0, tipo: 'celosia', desde: 3.5, ancho: 3.05, alto: 0.35, antepecho: 3.45 },
  ],

  // Pilares: centro y sección (en parte quedan embebidos en los muros).
  pilares: [
    { x: -0.045, y: -0.065, ancho: 0.47, fondo: 0.45 }, // esquina fachada izda.
    { x: 6.81, y: -0.065, ancho: 0.44, fondo: 0.45 }, //   esquina fachada dcha.
    { x: -0.045, y: 4.685, ancho: 0.47, fondo: 0.59 }, //  medianera izda.
    { x: 6.84, y: 4.685, ancho: 0.38, fondo: 0.59 }, //    medianera dcha.
    { x: -0.045, y: 10.76, ancho: 0.47, fondo: 0.46 }, //  esquina fondo izda.
    { x: 6.85, y: 10.76, ancho: 0.36, fondo: 0.46 }, //    esquina fondo dcha.
  ],

  // Acabados que cambian sobre la cara interior de un muro (desde/hasta a lo largo
  // del muro, de/a en altura). "saliente" para lo que sobresale, como un zuncho.
  parches: [
    { muro: 1, desde: 0.16, hasta: 4.39, de: 1.24, a: 4.4, acabado: 'ladrillo-rojo' },
    { muro: 0, desde: 2.49, hasta: 3.47, de: 1.05, a: 3.9, acabado: 'enfoscado' }, // machón central
    { muro: 2, desde: 0, hasta: 6.9, de: 1.22, a: 1.52, acabado: 'hormigon', saliente: 0.03 }, // zuncho
  ],

  // Bajantes (los círculos del plano) y su recorrido colgado del techo (aproximado).
  bajantes: [
    { x: 0.07, y: 5.57, recorrido: [[1.2, 6.2], [2.6, 7.6]] },
    { x: 6.83, y: 7.13, recorrido: [[5.2, 8.2]] },
  ],

  // Lo que hay ahora mismo (solo se ve en «Estado actual»).
  existentes: [{ tipo: 'cuadro', x: 6.85, y: 0.8, rot: -90 }],
}
