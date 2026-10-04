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
export function materialesPropuesta(local, aniso) {
  return {
    ...materialesActual(local, aniso),
    tablero: new THREE.MeshStandardMaterial({ color: '#bdb8af', roughness: 0.85 }), // tarima sin acabado definido
    acero: new THREE.MeshStandardMaterial({ color: '#4f5862', roughness: 0.45, metalness: 0.6 }),
    panelado: conTextura(paneles({}, aniso), 0.7, 0.6),
    falsoTecho: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.95 }),
  }
}
