import * as THREE from 'three'
import { hormigon, fabrica, reticular, celosia, paneles, LADRILLO, LADRILLO_ROJO, BLOQUE } from './texturas.js'

const conTextura = ({ mapa, relieve }, rugosidad, relieveEscala = 1) =>
  new THREE.MeshStandardMaterial({ map: mapa, bumpMap: relieve, bumpScale: relieveEscala, roughness: rugosidad })

function comunes(aniso) {
  return {
    exterior: new THREE.MeshStandardMaterial({ color: '#d4d0c9', roughness: 1 }),
    // relleno de lo que corta el plano de sección en la vista en planta
    poche: new THREE.MeshStandardMaterial({ color: '#3a3835', roughness: 1 }),
    celosia: new THREE.MeshStandardMaterial({ map: celosia(aniso), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }),
    pvc: new THREE.MeshStandardMaterial({ color: '#6f706d', roughness: 0.45 }),
  }
}

export function materialesActual(local, aniso) {
  const pared = conTextura(fabrica(local.acabadoParedes === 'bloque' ? BLOQUE : LADRILLO, aniso), 0.95, 1.5)
  const hormigonVisto = conTextura(hormigon({ base: '#b3afa7', manchas: 0.05, metros: 2, semilla: 7 }, aniso), 0.9, 0.3)
  const techo =
    local.forjado === 'reticular'
      ? conTextura(reticular({}, aniso), 0.95, 0.5)
      : conTextura(hormigon({ base: '#a39f98', manchas: 0.05, metros: 2.5, semilla: 7 }, aniso), 0.9, 0.4)
  return {
    ...comunes(aniso),
    suelo: conTextura(hormigon({ base: '#a49b8a', manchas: 0.08, metros: 2.5, semilla: 3 }, aniso), 0.9, 0.4),
    pared: () => pared,
    techo,
    pilar: hormigonVisto,
    acabados: {
      'ladrillo-rojo': conTextura(fabrica(LADRILLO_ROJO, aniso), 0.95, 1.5),
      enfoscado: conTextura(hormigon({ base: '#b9b4ab', manchas: 0.07, metros: 1.5, semilla: 12 }, aniso), 0.95, 0.6),
      hormigon: hormigonVisto,
    },
  }
}

// La propuesta conserva los acabados actuales (ladrillo, pilares, forjado, solera)
// y solo añade los materiales de lo nuevo.
export function materialesPropuesta(local, aniso, propuesta) {
  const base = materialesActual(local, aniso)
  const fachada = conTextura(hormigon({ base: '#c9b69b', manchas: 0.03, poros: false, metros: 2, semilla: 21 }, aniso), 0.9, 0.15)
  const pintado = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.9 })
  const liso = (color, rugosidad = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal })
  return {
    ...base,
    // fachada enfoscada y pintada (las dos caras del muro de fachada)
    pared: (i) => (i === 0 && propuesta?.fachada?.acabado === 'pintado' ? fachada : base.pared(i)),
    acabados: {
      ...base.acabados,
      gris: conTextura(hormigon({ base: '#b9bcc2', manchas: 0.03, poros: false, metros: 2, semilla: 23 }, aniso), 0.9, 0.15),
      pintado,
    },
    tablero: liso('#bdb8af', 0.85), // tarima sin acabado definido
    acero: liso('#4f5862', 0.45, 0.6),
    panelado: conTextura(paneles({}, aniso), 0.7, 0.6),
    pintado,
    // falso techo panelado (placas de 60 × 60)
    falsoTecho: conTextura(paneles({ color: '#f1efea', ancho: propuesta?.techo?.panel ?? 0.6, alto: propuesta?.techo?.panel ?? 0.6, linea: 7, semilla: 9 }, aniso), 0.95, 0.4),
    // carpinterías
    marco: liso('#d9922a', 0.5),
    madera: liso('#a8603c', 0.6),
    cuarteron: liso('#9c5635', 0.6),
    cerradura: liso('#2a2420', 0.5, 0.3),
    laton: liso('#c9a24a', 0.3, 0.9),
    aluminio: liso('#f2f3f1', 0.4, 0.3),
    vidrio: new THREE.MeshStandardMaterial({ color: '#cfe3ea', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    rejilla: liso('#4a4b4a', 0.5, 0.6),
    sombra: liso('#1c1c1c', 1),
    cerco: liso('#f4f4f2', 0.5),
    hoja: liso('#f6f6f4', 0.45),
    // instalaciones del techo
    perfil: liso('#8a8a88', 0.5, 0.5),
    blanco: liso('#f4f4f2', 0.5),
    rejillaOscura: liso('#3c3c3c', 0.8),
    lama: liso('#e3e3e0', 0.5),
  }
}
