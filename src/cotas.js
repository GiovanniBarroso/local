// Cotas exteriores de cada muro y rótulos de zonas (nombre + superficie).
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { aMundo, muros, area, centroide, formato, cotaEn } from './geometria.js'

function etiqueta(clase, html, posicion) {
  const el = document.createElement('div')
  el.className = clase
  el.innerHTML = html
  const o = new CSS2DObject(el)
  o.position.copy(posicion)
  return o
}

const mas = ([x, y], [dx, dy], k) => [x + dx * k, y + dy * k]

const material = new THREE.LineBasicMaterial({ color: '#3b3a37' })

// Se dibujan sobre la acera, que puede quedar por encima del suelo del local.
export function construirCotas(local) {
  const grupo = new THREE.Group(), y = (local.cotaCalle ?? 0) + 0.02
  for (const m of muros(local)) {
    const t = m.t, distancia = t + 0.8
    const puntos = []
    const linea = (p, q) => puntos.push(aMundo(p, y), aMundo(q, y))
    const a = mas(m.a, m.normal, distancia), b = mas(m.b, m.normal, distancia)
    linea(a, b)
    // líneas de referencia desde el muro
    linea(mas(m.a, m.normal, t + 0.15), mas(m.a, m.normal, distancia + 0.15))
    linea(mas(m.b, m.normal, t + 0.15), mas(m.b, m.normal, distancia + 0.15))
    // trazos oblicuos en los extremos
    const oblicuo = [(m.dir[0] + m.normal[0]) * 0.09, (m.dir[1] + m.normal[1]) * 0.09]
    for (const p of [a, b]) linea(mas(p, oblicuo, -1), mas(p, oblicuo, 1))
    const medio = mas(m.a, m.dir, m.L / 2)
    const cota = new THREE.Group()
    cota.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntos), material))
    cota.add(etiqueta('cota', formato(m.L), aMundo(mas(medio, m.normal, distancia), y)))
    cota.userData = { centro: aMundo(mas(medio, m.normal, t)), normal: new THREE.Vector3(m.normal[0], 0, -m.normal[1]) }
    grupo.add(cota)
  }
  return grupo
}

// En la maqueta, las cotas de los muros que siguen en pie quedarían detrás de ellos:
// solo se muestran las de los muros recortados (los que miran a la cámara).
export function actualizarCotas(cotas, vista, camara) {
  for (const c of cotas.children) {
    const { centro, normal } = c.userData
    c.visible = vista !== 'maqueta' || camara.position.clone().sub(centro).dot(normal) > 0
  }
}

// Con el comparador, los rótulos de la propuesta solo en su mitad de la pantalla.
export function actualizarZonas(zonas, corte, camara) {
  for (const z of zonas.children) z.visible = (z.position.clone().project(camara).x + 1) / 2 >= corte
}

// Nivel como en los planos: +1,20 / ±0,00
const nivel = (c) => (c > 0 ? `+${formato(c)}` : c < 0 ? `−${formato(-c)}` : '±0,00')

export function construirZonas(propuesta) {
  const grupo = new THREE.Group()
  for (const z of propuesta?.zonas ?? []) {
    const centro = centroide(z.poligono), cota = cotaEn(propuesta, centro)
    const html = `<strong>${z.nombre}</strong><span>${formato(area(z.poligono))} m² · ${nivel(cota)}</span>`
    grupo.add(etiqueta('zona', html, aMundo(centro, cota + 0.05)))
  }
  return grupo
}
