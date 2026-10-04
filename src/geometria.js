import * as THREE from 'three'

// Planta (x, y) → mundo three.js (x, altura, -y). Así la vista cenital se lee
// como el plano en papel: fachada abajo, x a la derecha.
export const aMundo = ([x, y], h = 0) => new THREE.Vector3(x, h, -y)
export const aPlanta = (v) => [v.x, -v.z]

export function areaConSigno(poligono) {
  let s = 0
  for (let i = 0; i < poligono.length; i++) {
    const [x0, y0] = poligono[i]
    const [x1, y1] = poligono[(i + 1) % poligono.length]
    s += x0 * y1 - x1 * y0
  }
  return s / 2
}

export const area = (poligono) => Math.abs(areaConSigno(poligono))

export function centroide(poligono) {
  let cx = 0, cy = 0, a = 0
  for (let i = 0; i < poligono.length; i++) {
    const [x0, y0] = poligono[i]
    const [x1, y1] = poligono[(i + 1) % poligono.length]
    const c = x0 * y1 - x1 * y0
    a += c
    cx += (x0 + x1) * c
    cy += (y0 + y1) * c
  }
  return [cx / (3 * a), cy / (3 * a)]
}

export function limites(poligono) {
  const xs = poligono.map((p) => p[0]), ys = poligono.map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, ancho: maxX - minX, fondo: maxY - minY, centro: [(minX + maxX) / 2, (minY + maxY) / 2] }
}

export function dentro([x, y], poligono) {
  let d = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d
  }
  return d
}

export function distanciaASegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

export function distanciaAlBorde(p, poligono) {
  let d = Infinity
  for (let i = 0; i < poligono.length; i++) {
    d = Math.min(d, distanciaASegmento(p, poligono[i], poligono[(i + 1) % poligono.length]))
  }
  return d
}

// espesorMuro puede ser un número o una lista con el espesor de cada muro
export const espesor = (local, i) => (Array.isArray(local.espesorMuro) ? local.espesorMuro[i] : local.espesorMuro)

// Muros perimetrales: tramo, dirección, espesor y normal hacia el exterior.
// En esquinas convexas el muro se alarga el espesor del siguiente para cerrar la
// esquina por fuera; en las cóncavas se acorta para no solaparse con él.
export function muros(local) {
  const p = local.planta, n = p.length
  const antihorario = areaConSigno(p) > 0
  const lista = p.map((a, i) => {
    const b = p[(i + 1) % n]
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy)
    const dir = [dx / L, dy / L]
    const normal = antihorario ? [dir[1], -dir[0]] : [-dir[1], dir[0]]
    return { i, a, b, L, dir, normal, t: espesor(local, i), extension: 0 }
  })
  for (let i = 0; i < n; i++) {
    const actual = lista[i], siguiente = lista[(i + 1) % n]
    const cruz = actual.dir[0] * siguiente.dir[1] - actual.dir[1] * siguiente.dir[0]
    if (Math.abs(cruz) < 1e-6) continue
    actual.extension = (cruz > 0) === antihorario ? siguiente.t : -siguiente.t
  }
  return lista
}

// Recorta un polígono con un rectángulo (Sutherland–Hodgman).
function recortar(poligono, [x0, y0, x1, y1]) {
  const lados = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ]
  let r = poligono
  for (const [dentroLado, corte] of lados) {
    const entrada = r
    r = []
    entrada.forEach((b, i) => {
      const a = entrada[(i + entrada.length - 1) % entrada.length]
      if (dentroLado(b)) {
        if (!dentroLado(a)) r.push(corte(a, b))
        r.push(b)
      } else if (dentroLado(a)) r.push(corte(a, b))
    })
    if (!r.length) return r
  }
  return r
}

// Superficie útil: contorno menos la parte de cada pilar que queda dentro del local.
export function superficieUtil(local) {
  return local.pilares.reduce((s, p) => {
    const dentroDelLocal = recortar(local.planta, [p.x - p.ancho / 2, p.y - p.fondo / 2, p.x + p.ancho / 2, p.y + p.fondo / 2])
    return s - (dentroDelLocal.length > 2 ? area(dentroDelLocal) : 0)
  }, area(local.planta))
}

// Niveles. Todo se mide desde la solera original (cota 0).
export const falsoTecho = (local, p) => local.alturaLibre - (p?.pleno ?? 0)

export const enRect = ([x, y], [[x0, y0], [x1, y1]]) =>
  x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y >= Math.min(y0, y1) && y <= Math.max(y0, y1)

// Cota del suelo terminado en un punto de la planta.
export function cotaEn(p, punto) {
  if (!p?.tarima) return 0
  if (dentro(punto, p.tarima.poligono)) return p.tarima.cota
  if (p.escalera && enRect(punto, p.escalera.rellano)) return p.tarima.cota
  return 0
}

export const formato = (n, decimales = 2) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
