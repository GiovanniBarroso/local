// Instalaciones del techo: tiras LED empotradas, cassette de aire acondicionado y
// regletas. Se construyen colgando del plano del falso techo (y = ft es la cara vista)
// o, las regletas con "cota", de otro techo (bajo el altillo). Para el plano de techo
// se vuelven a montar volteadas en su sitio, para leer su cara inferior desde arriba.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { aMundo } from './geometria.js'

const caja = (ancho, alto, fondo, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(ancho, alto, fondo).translate(x, y, z)

function malla(geometrias, material, sombra = true) {
  const m = new THREE.Mesh(Array.isArray(geometrias) ? mergeGeometries(geometrias) : geometrias, material)
  m.castShadow = sombra
  m.receiveShadow = true
  return m
}

const emisivo = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false })

// Tira LED empotrada a lo largo de un polígono: perfil con dos alas y difusor luminoso.
function tiras(led, ft, m) {
  const g = new THREE.Group(), luces = new THREE.Group()
  const perfil = [], difusor = []
  const p = led.poligono
  for (let i = 0; i < p.length; i++) {
    const a = aMundo(p[i]), b = aMundo(p[(i + 1) % p.length])
    const L = a.distanceTo(b), c = a.clone().lerp(b, 0.5)
    const ang = Math.atan2(-(b.z - a.z), b.x - a.x)
    const rot = (geo) => geo.rotateY(ang).translate(c.x, 0, c.z)
    perfil.push(rot(caja(L + 0.05, 0.01, 0.01, 0, ft - 0.005, 0.025)))
    perfil.push(rot(caja(L + 0.05, 0.01, 0.01, 0, ft - 0.005, -0.025)))
    difusor.push(rot(caja(L + 0.03, 0.006, 0.04, 0, ft - 0.003, 0)))
    const luz = new THREE.RectAreaLight(led.color ?? '#ffd7a3', led.intensidad ?? 14, L, 0.08)
    luz.position.set(c.x, ft - 0.02, c.z)
    luz.lookAt(c.x, 0, c.z)
    luz.rotation.z = ang
    luces.add(luz)
  }
  g.add(malla(perfil, m.perfil))
  g.add(malla(difusor, emisivo(led.color ?? '#ffd7a3'), false))
  return { objeto: g, luces }
}

// Cassette de aire acondicionado: panel cuadrado, rejilla central y cuatro lamas.
function cassette({ x, y, lado = 0.84 }, ft, m) {
  const g = new THREE.Group()
  const c = aMundo([x, y])
  g.position.set(c.x, 0, c.z)
  g.add(malla(caja(lado, 0.04, lado, 0, ft - 0.02, 0), m.blanco))
  g.add(malla(caja(lado * 0.46, 0.012, lado * 0.46, 0, ft - 0.042, 0), m.rejillaOscura, false))
  const lamas = []
  const largo = lado * 0.74, ancho = 0.09, d = lado / 2 - 0.1
  for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    lamas.push(caja(largo, 0.01, ancho).rotateX(-0.45).translate(0, ft - 0.058, d).rotateY(ang))
  }
  g.add(malla(lamas, m.lama))
  return g
}

// Regleta estanca (almacén), colgada del falso techo o a la cota que se indique.
function regleta({ x, y, largo = 1.2, rot = 0, cota }, ft, m) {
  ft = cota ?? ft
  const g = new THREE.Group()
  const c = aMundo([x, y])
  g.position.set(c.x, 0, c.z)
  g.rotation.y = THREE.MathUtils.degToRad(rot)
  g.add(malla(caja(largo, 0.05, 0.09, 0, ft - 0.025, 0), m.blanco))
  g.add(malla(caja(largo - 0.06, 0.03, 0.06, 0, ft - 0.06, 0), emisivo('#fff6e6'), false))
  const luz = new THREE.PointLight('#fff2dc', 12, 6, 2)
  luz.position.set(c.x, ft - 0.1, c.z)
  return { objeto: g, luz }
}

// Copia de un elemento volteada sobre sí misma: ocupa el mismo sitio, bajo su techo,
// pero enseña hacia arriba la cara que mira al suelo.
function volteado(objeto) {
  const { min, max } = new THREE.Box3().setFromObject(objeto)
  const copia = objeto.clone()
  copia.scale.y = -1
  copia.position.y = min.y + max.y
  return copia
}

// Monta las instalaciones del techo. Devuelve los elementos colgados, sus luces y el
// plano de techo (maqueta y planta): los mismos elementos volteados en su sitio, para
// verlos desde arriba a través del falso techo como se verían desde abajo.
export function construirInstalaciones(techo, ft, m) {
  const colgado = new THREE.Group(), luces = new THREE.Group()
  if (techo.led) {
    const t = tiras(techo.led, ft, m)
    colgado.add(t.objeto)
    luces.add(t.luces)
  }
  for (const a of techo.aire ?? []) colgado.add(cassette(a, ft, m))
  for (const r of techo.regletas ?? []) {
    const reg = regleta(r, ft, m)
    colgado.add(reg.objeto)
    luces.add(reg.luz)
  }
  const volteados = new THREE.Group()
  for (const o of colgado.children) volteados.add(volteado(o))
  return { colgado, luces, volteados }
}
