// Carpinterías y rejillas dentro de los huecos de un muro: puerta de entrada, ventanas,
// rejillas de ventilación y puertas interiores (hojas).
// Todo en coordenadas locales del muro: x a lo largo del muro desde su arranque,
// y vertical, z en el espesor. zInt es la cara interior y zExt la exterior.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const caja = (x0, x1, y0, y1, z0, z1) =>
  new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)

function malla(geometrias, material) {
  const m = new THREE.Mesh(Array.isArray(geometrias) ? mergeGeometries(geometrias) : geometrias, material)
  m.castShadow = m.receiveShadow = true
  return m
}

// Marco perimetral de un hueco: cuatro piezas de anchura "a" y profundidad z0..z1.
function marco(x0, x1, y0, y1, a, z0, z1) {
  return [
    caja(x0, x0 + a, y0, y1, z0, z1),
    caja(x1 - a, x1, y0, y1, z0, z1),
    caja(x0 + a, x1 - a, y1 - a, y1, z0, z1),
    caja(x0 + a, x1 - a, y0, y0 + a, z0, z1),
  ]
}

// Puerta de entrada: marco naranja con tapajuntas en fachada y hoja de madera con
// seis cuarterones y zócalo, cerradura con bocallave de latón. Cerrada.
export function puertaEntrada(o, zInt, zExt, m) {
  const g = new THREE.Group()
  const s = Math.sign(zExt - zInt) // sentido hacia el exterior
  const x0 = o.desde, x1 = o.desde + o.ancho, y0 = o.antepecho ?? 0, y1 = y0 + o.alto
  const fondoMarco = 0.12, a = 0.07
  const zm1 = zExt, zm0 = zExt - s * fondoMarco
  g.add(malla(marco(x0, x1, y0 - 0.001, y1, a, zm0, zm1), m.marco))
  // tapajuntas sobre la fachada (sin pieza inferior)
  const t = 0.09, e = 0.015
  g.add(
    malla(
      [
        caja(x0 - t, x0, y0, y1 + t, zExt, zExt + s * e),
        caja(x1, x1 + t, y0, y1 + t, zExt, zExt + s * e),
        caja(x0, x1, y1, y1 + t, zExt, zExt + s * e),
      ],
      m.marco,
    ),
  )
  // hoja
  const hx0 = x0 + a, hx1 = x1 - a, hy0 = y0, hy1 = y1 - a
  const grosor = 0.045
  const zh1 = zExt - s * 0.03, zh0 = zh1 - s * grosor
  g.add(malla(caja(hx0, hx1, hy0, hy1, zh0, zh1), m.madera))
  // cuarterones realzados (2 columnas × 3 filas) y zócalo
  const margen = 0.09, entre = 0.07
  const W = hx1 - hx0 - 2 * margen - entre, cw = W / 2
  const zocaloAlto = 0.42, H = hy1 - hy0 - 2 * margen - zocaloAlto - entre * 3, ch = H / 3
  const paneles = []
  for (let c = 0; c < 2; c++) {
    for (let f = 0; f < 3; f++) {
      const px = hx0 + margen + c * (cw + entre), py = hy1 - margen - (f + 1) * ch - f * entre
      paneles.push(caja(px, px + cw, py, py + ch, zh1, zh1 + s * 0.012))
      paneles.push(caja(px, px + cw, py, py + ch, zh0 - s * 0.012, zh0))
    }
  }
  paneles.push(caja(hx0 + margen, hx1 - margen, hy0 + margen, hy0 + margen + zocaloAlto, zh1, zh1 + s * 0.012))
  paneles.push(caja(hx0 + margen, hx1 - margen, hy0 + margen, hy0 + margen + zocaloAlto, zh0 - s * 0.012, zh0))
  g.add(malla(paneles, m.cuarteron))
  // cerradura: placa oscura y bocallave de latón, en el lado opuesto a las bisagras
  const cy = y0 + 1.05, cx = hx1 - 0.16
  g.add(malla(caja(cx - 0.04, cx + 0.04, cy - 0.09, cy + 0.09, zh1, zh1 + s * 0.016), m.cerradura))
  g.add(malla(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16).rotateX(Math.PI / 2).translate(cx, cy + 0.02, zh1 + s * 0.02), m.laton))
  g.add(malla(caja(cx - 0.012, cx + 0.012, cy - 0.04, cy + 0.02, zh1 + s * 0.016, zh1 + s * 0.024), m.laton))
  g.add(malla(new THREE.SphereGeometry(0.02, 16, 12).translate(hx0 + 0.16, cy, zh0 - s * 0.03), m.laton)) // pomo interior
  return g
}

// Ventana de aluminio blanco: marco, dos hojas con montante central y travesaño,
// parteluces finos, un vidrio y vierteaguas exterior.
export function ventana(o, zInt, zExt, m) {
  const g = new THREE.Group()
  const s = Math.sign(zExt - zInt)
  const x0 = o.desde, x1 = o.desde + o.ancho, y0 = o.antepecho ?? 0, y1 = y0 + o.alto
  const a = 0.06, fondo = 0.07
  const z1 = zExt - s * 0.1, z0 = z1 - s * fondo
  const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2
  const piezas = marco(x0, x1, y0, y1, a, z0, z1)
  piezas.push(caja(xm - 0.035, xm + 0.035, y0 + a, y1 - a, z0, z1)) // montante
  piezas.push(caja(x0 + a, x1 - a, ym - 0.03, ym + 0.03, z0, z1)) // travesaño
  // parteluz vertical en cada hoja
  const zc = (z0 + z1) / 2
  for (const xc of [(x0 + xm) / 2, (xm + x1) / 2]) piezas.push(caja(xc - 0.012, xc + 0.012, y0 + a, y1 - a, zc - 0.015, zc + 0.015))
  g.add(malla(piezas, m.aluminio))
  const vidrio = new THREE.Mesh(caja(x0 + a, x1 - a, y0 + a, y1 - a, zc - 0.003, zc + 0.003), m.vidrio)
  vidrio.receiveShadow = true
  g.add(vidrio)
  // vierteaguas
  g.add(malla(caja(x0 - 0.03, x1 + 0.03, y0 - 0.035, y0, z1, zExt + s * 0.04), m.aluminio))
  return g
}

// Rejilla de ventilación: cerco y lamas verticales en la cara exterior, fondo oscuro.
export function rejilla(o, zInt, zExt, m) {
  const g = new THREE.Group()
  const s = Math.sign(zExt - zInt)
  const x0 = o.desde, x1 = o.desde + o.ancho, y0 = o.antepecho ?? 0, y1 = y0 + o.alto
  const zc = (zInt + zExt) / 2
  g.add(malla(caja(x0, x1, y0, y1, zc - 0.01, zc + 0.01), m.sombra))
  const piezas = marco(x0, x1, y0, y1, 0.025, zExt - s * 0.02, zExt + s * 0.01)
  const n = Math.max(3, Math.round((x1 - x0) / 0.04))
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    piezas.push(caja(x - 0.006, x + 0.006, y0 + 0.025, y1 - 0.025, zExt - s * 0.02, zExt))
  }
  g.add(malla(piezas, m.rejilla))
  // la misma rejilla por la cara interior
  g.add(malla(marco(x0, x1, y0, y1, 0.025, zInt - s * 0.01, zInt + s * 0.02), m.rejilla))
  return g
}

// Puerta interior: cerco y hoja lisa abatida hacia dentro ("abierta" en grados).
// El tabique es simétrico (z de -e/2 a e/2); la hoja gira sobre la jamba izquierda
// o, con bisagra: 'derecha', sobre la derecha (mirando el tabique desde su arranque).
export function puertaInterior(o, e, m, abierta = 80) {
  const g = new THREE.Group()
  const x0 = o.desde, x1 = o.desde + o.ancho, y0 = o.antepecho ?? 0, y1 = y0 + o.alto
  const a = 0.04
  g.add(malla([...marco(x0, x1, y0 - 0.001, y1, a, -e / 2 - 0.01, e / 2 + 0.01)].slice(0, 3), m.cerco))
  const lado = o.bisagra === 'derecha' ? -1 : 1 // hacia dónde va la hoja desde la bisagra
  const hoja = new THREE.Group()
  hoja.position.set(lado > 0 ? x0 + a : x1 - a, 0, 0)
  const ancho = x1 - x0 - 2 * a - 0.01, alto = y1 - y0 - a - 0.01
  hoja.add(malla(caja(0, lado * ancho, y0 + 0.01, y0 + 0.01 + alto, -0.02, 0.02), m.hoja))
  for (const z of [0.03, -0.03]) {
    hoja.add(malla(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 10).rotateZ(Math.PI / 2).translate(lado * (ancho - 0.1), y0 + 1.05, z), m.laton))
  }
  hoja.rotation.y = lado * THREE.MathUtils.degToRad(abierta)
  g.add(hoja)
  return g
}

// Fabrica la carpintería que corresponde a un hueco, si tiene.
export function carpinteria(o, zInt, zExt, m) {
  if (o.tipo === 'puerta' && o.hoja) return puertaEntrada(o, zInt, zExt, m)
  if (o.tipo === 'ventana') return ventana(o, zInt, zExt, m)
  if (o.tipo === 'rejilla') return rejilla(o, zInt, zExt, m)
  return null
}
