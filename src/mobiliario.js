// Mobiliario paramétrico hecho con primitivas: suficiente para leer la distribución
// y la escala. Cada mueble se construye con su frente mirando a +z (hacia la fachada).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { aMundo } from './geometria.js'

const cacheMateriales = new Map()
function mat(color, rugosidad = 0.75, metal = 0, extra = {}) {
  const clave = `${color}|${rugosidad}|${metal}|${JSON.stringify(extra)}`
  if (!cacheMateriales.has(clave)) {
    cacheMateriales.set(clave, new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal, ...extra }))
  }
  return cacheMateriales.get(clave)
}

// Caja con la base apoyada en y.
const caja = (ancho, alto, fondo, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(ancho, alto, fondo).translate(x, y + alto / 2, z)

const cilindro = (rArriba, rAbajo, alto, x = 0, y = 0, z = 0, lados = 24) =>
  new THREE.CylinderGeometry(rArriba, rAbajo, alto, lados).translate(x, y + alto / 2, z)

function malla(geometrias, material) {
  const g = Array.isArray(geometrias) ? mergeGeometries(geometrias) : geometrias
  const m = new THREE.Mesh(g, material)
  m.castShadow = m.receiveShadow = true
  return m
}

function grupo(...hijos) {
  const g = new THREE.Group()
  g.add(...hijos)
  return g
}

const METAL = '#232323'
const PRODUCTOS = ['#d9cbb5', '#8aa39b', '#c97b5a', '#3f4a5a', '#efe8dc', '#b8a07a', '#6e7f6a', '#a35d4f']

function azar(semilla) {
  let s = semilla
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

const tipos = {
  mostrador({ ancho = 2.8, fondo = 0.65, alto = 1.05, color = '#2f3b35', encimera = '#c8a47e' }) {
    const zocalo = 0.1, tapa = 0.04, cuerpo = alto - zocalo - tapa
    const frente = [caja(ancho, cuerpo, fondo - 0.04, 0, zocalo, -0.02)]
    const paso = 0.075, n = Math.floor(ancho / paso), inicio = (-(n - 1) * paso) / 2
    for (let i = 0; i < n; i++) frente.push(caja(0.04, cuerpo - 0.02, 0.025, inicio + i * paso, zocalo + 0.01, fondo / 2 - 0.028))
    return grupo(
      malla(caja(ancho - 0.06, zocalo, fondo - 0.14, 0, 0, -0.04), mat('#1b1b1a', 0.8)),
      malla(frente, mat(color, 0.6)),
      malla(caja(ancho + 0.04, tapa, fondo, 0, alto - tapa, 0), mat(encimera, 0.45)),
    )
  },

  estanteria({ ancho = 2, fondo = 0.4, alto = 2.2, baldas = 5, color = '#e3ddd3', productos = true, x = 0, y = 0 }) {
    const e = 0.025, partes = [], modulos = Math.max(1, Math.round(ancho / 1.0))
    for (let i = 0; i <= modulos; i++) partes.push(caja(e, alto, fondo, -ancho / 2 + e / 2 + (i * (ancho - e)) / modulos))
    partes.push(caja(ancho, alto, 0.012, 0, 0, -fondo / 2 + 0.006))
    const alturas = []
    for (let k = 0; k < baldas; k++) {
      const h = 0.08 + (k * (alto - 0.08 - e)) / (baldas - 1)
      alturas.push(h)
      partes.push(caja(ancho - e, e, fondo - 0.015, 0, h, 0.0075))
    }
    const g = grupo(malla(partes, mat(color, 0.7)))
    if (productos) g.add(objetosEnBaldas(ancho, fondo, alturas, e, Math.floor(Math.abs(x * 1000 + y * 37)) + 1))
    return g
  },

  mesa({ forma = 'rectangular', ancho = 1.6, fondo = 0.8, alto = 0.75, color = '#c8a47e', patas = METAL, sillas = 0, colorSillas }) {
    const g = new THREE.Group()
    if (forma === 'redonda') {
      g.add(malla(cilindro(ancho / 2, ancho / 2, 0.03, 0, alto - 0.03, 0, 48), mat(color, 0.5)))
      g.add(malla([cilindro(0.03, 0.03, alto - 0.03), cilindro(0.2, 0.22, 0.02)], mat(patas, 0.4, 0.6)))
    } else {
      g.add(malla(caja(ancho, 0.035, fondo, 0, alto - 0.035), mat(color, 0.5)))
      const px = ancho / 2 - 0.06, pz = fondo / 2 - 0.06
      const pies = [[px, pz], [-px, pz], [px, -pz], [-px, -pz]].map(([x, z]) => caja(0.04, alto - 0.035, 0.04, x, 0, z))
      g.add(malla(pies, mat(patas, 0.4, 0.6)))
    }
    for (let i = 0; i < sillas; i++) {
      const s = tipos.silla({ color: colorSillas })
      if (forma === 'redonda') {
        const a = (i / sillas) * Math.PI * 2, d = ancho / 2 + 0.12
        s.position.set(Math.sin(a) * d, 0, Math.cos(a) * d)
        s.rotation.y = a + Math.PI
      } else {
        const delante = i % 2 === 0, porLado = Math.ceil(sillas / 2), k = Math.floor(i / 2)
        const xs = (-(porLado - 1) / 2 + k) * Math.min(0.6, ancho / porLado)
        s.position.set(xs, 0, (delante ? 1 : -1) * (fondo / 2 + 0.12))
        s.rotation.y = delante ? Math.PI : 0
      }
      g.add(s)
    }
    return g
  },

  silla({ color = '#3d4a42', patas = METAL }) {
    const pies = [[0.19, 0.17], [-0.19, 0.17], [0.19, -0.17], [-0.19, -0.17]].map(([x, z]) => cilindro(0.012, 0.012, 0.44, x, 0, z, 8))
    return grupo(
      malla(pies, mat(patas, 0.4, 0.6)),
      malla([caja(0.44, 0.04, 0.42, 0, 0.44), caja(0.44, 0.36, 0.03, 0, 0.5, -0.2)], mat(color, 0.85)),
    )
  },

  sofa({ ancho = 1.8, fondo = 0.85, color = '#8c9a8a' }) {
    const tela = mat(color, 0.95)
    return grupo(
      malla(caja(ancho - 0.1, 0.08, fondo - 0.1), mat(METAL, 0.5)),
      malla(
        [
          caja(ancho, 0.2, fondo, 0, 0.08),
          caja(0.16, 0.34, fondo, ancho / 2 - 0.08, 0.28),
          caja(0.16, 0.34, fondo, -ancho / 2 + 0.08, 0.28),
          caja(ancho, 0.5, 0.2, 0, 0.28, -fondo / 2 + 0.1),
        ],
        tela,
      ),
      malla(caja(ancho - 0.34, 0.14, fondo - 0.22, 0, 0.28, 0.1), tela),
    )
  },

  banco({ ancho = 1.6, fondo = 0.4, color = '#c8a47e' }) {
    return grupo(
      malla(caja(ancho, 0.05, fondo, 0, 0.4), mat(color, 0.5)),
      malla([caja(0.05, 0.4, fondo - 0.04, ancho / 2 - 0.12), caja(0.05, 0.4, fondo - 0.04, -ancho / 2 + 0.12)], mat(METAL, 0.4, 0.6)),
    )
  },

  expositor({ ancho = 1.2, fondo = 0.6, alto = 0.9, color = '#e8e3da', tapa = '#c8a47e' }) {
    return grupo(malla(caja(ancho, alto - 0.03, fondo), mat(color, 0.8)), malla(caja(ancho, 0.03, fondo, 0, alto - 0.03), mat(tapa, 0.5)))
  },

  planta({ alto = 1.4, maceta = '#b5694b' }) {
    const hojas = mat('#4f6b45', 0.9, 0, { flatShading: true })
    const g = grupo(
      malla(cilindro(0.19, 0.15, 0.38), mat(maceta, 0.9)),
      malla(cilindro(0.015, 0.02, alto - 0.5, 0, 0.38, 0, 6), mat('#5b4632', 0.9)),
    )
    const r = azar(Math.round(alto * 1000))
    for (let i = 0; i < 6; i++) {
      const radio = 0.16 + r() * 0.12
      const m = malla(new THREE.IcosahedronGeometry(radio, 1), hojas)
      m.position.set((r() - 0.5) * 0.35, 0.55 + r() * (alto - 0.65), (r() - 0.5) * 0.35)
      g.add(m)
    }
    return g
  },

  alfombra({ ancho = 2, fondo = 1.4, color = '#d8cdbb' }) {
    const m = malla(caja(ancho, 0.012, fondo), mat(color, 1))
    m.castShadow = false
    return grupo(m)
  },

  inodoro() {
    const loza = mat('#f4f3ef', 0.2)
    return grupo(
      malla(
        [
          cilindro(0.19, 0.15, 0.4, 0, 0, 0, 32).scale(1, 1, 1.25).translate(0, 0, 0.04),
          caja(0.38, 0.38, 0.16, 0, 0.4, -0.2),
        ],
        loza,
      ),
      malla(cilindro(0.195, 0.195, 0.025, 0, 0.4, 0, 32).scale(1, 1, 1.25).translate(0, 0, 0.04), mat('#fbfbf9', 0.3)),
    )
  },

  lavabo({ ancho = 0.6 }) {
    return grupo(
      malla([caja(ancho, 0.14, 0.45, 0, 0.72), caja(0.22, 0.72, 0.18, 0, 0, -0.12)], mat('#f4f3ef', 0.2)),
      malla([cilindro(0.015, 0.015, 0.18, 0, 0.86, -0.15, 12), caja(0.03, 0.02, 0.14, 0, 1.02, -0.09)], mat('#c9c9c9', 0.15, 1)),
      malla(caja(ancho, 0.8, 0.01, 0, 1.05, -0.22), mat('#e8eef0', 0.03, 1)),
    )
  },

  colgante({ altura = 2.0, color = METAL }, { techo }) {
    const pantalla = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.22, 32, 1, true).translate(0, altura + 0.11, 0),
      mat(color, 0.5, 0.3, { side: THREE.DoubleSide }),
    )
    pantalla.castShadow = true
    return grupo(
      new THREE.Mesh(cilindro(0.004, 0.004, techo - altura - 0.2, 0, altura + 0.2, 0, 6), mat(METAL)),
      pantalla,
      new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12).translate(0, altura + 0.05, 0), new THREE.MeshBasicMaterial({ color: '#fff3dc', toneMapped: false })),
    )
  },

  // cuadro eléctrico de obra colgado en la pared, con su manguera hasta el suelo
  cuadro({ altura = 0.65 }) {
    return grupo(
      malla(caja(0.3, 0.36, 0.1, 0, altura, -0.05), mat('#e9e8e4', 0.5)),
      malla(cilindro(0.008, 0.008, altura, -0.12, 0, -0.06, 6), mat(METAL, 0.6)),
    )
  },

  bombilla(_, { techo }) {
    return grupo(
      new THREE.Mesh(cilindro(0.005, 0.005, 0.6, 0, techo - 0.6, 0, 6), mat(METAL)),
      new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12).translate(0, techo - 0.64, 0), new THREE.MeshBasicMaterial({ color: '#fff1d6', toneMapped: false })),
    )
  },
}

// Mercancía genérica en las baldas, en un solo InstancedMesh.
function objetosEnBaldas(ancho, fondo, alturas, e, semilla) {
  const r = azar(semilla), piezas = []
  for (let k = 0; k < alturas.length - 1; k++) {
    const hueco = alturas[k + 1] - alturas[k] - e
    let x = -ancho / 2 + 0.05
    while (x < ancho / 2 - 0.1) {
      const w = 0.06 + r() * 0.14
      if (x + w > ancho / 2 - 0.04) break
      if (r() > 0.18) {
        const h = 0.08 + r() * Math.min(0.24, hueco - 0.08), d = 0.1 + r() * (fondo - 0.18)
        piezas.push({ x: x + w / 2, y: alturas[k] + e, w, h, d, color: PRODUCTOS[Math.floor(r() * PRODUCTOS.length)] })
      }
      x += w + 0.01 + r() * 0.03
    }
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat('#ffffff', 0.8), piezas.length)
  const m = new THREE.Matrix4(), c = new THREE.Color()
  piezas.forEach((p, i) => {
    m.makeScale(p.w, p.h, p.d).setPosition(p.x, p.y, 0.02)
    im.setMatrixAt(i, m)
    im.setColorAt(i, c.set(p.color))
  })
  im.castShadow = im.receiveShadow = true
  return im
}

// Lo que se cuelga del techo: se oculta junto con él en maqueta y planta.
export const DEL_TECHO = new Set(['colgante', 'bombilla'])
export const SIN_COLISION = new Set(['alfombra', 'colgante', 'bombilla'])

export function crearMueble(def, contexto) {
  const constructor = tipos[def.tipo]
  let objeto
  if (constructor) {
    objeto = constructor(def, contexto)
  } else {
    console.warn(`Mueble desconocido: "${def.tipo}"`)
    objeto = grupo(malla(caja(0.5, 0.5, 0.5), mat('#ff00aa')))
  }
  objeto.position.copy(aMundo([def.x, def.y]))
  objeto.rotation.y = THREE.MathUtils.degToRad(def.rot ?? 0)
  objeto.name = def.tipo
  return objeto
}
