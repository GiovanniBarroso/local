// Construye una escena completa (estado actual o propuesta) a partir de los datos.
// Todas las alturas se miden desde la solera original del local (cota 0).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { aMundo, muros, limites, dentro, enRect, falsoTecho, cotaEn } from './geometria.js'
import { materialesActual, materialesPropuesta } from './materiales.js'
import { crearMueble, DEL_TECHO, SIN_COLISION } from './mobiliario.js'

const SECCION = 1.1 // corte de la vista en planta, sobre el suelo principal
const ZOCALO = 0.2 // lo que asoma un muro recortado en la maqueta, sobre la acera

// UV en metros proyectando cada cara sobre su plano dominante.
function uvEnMetros(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i), p.getY(i))
    else if (ay >= az) uv.setXY(i, p.getX(i), p.getZ(i))
    else uv.setXY(i, p.getX(i), p.getY(i))
  }
  return geo
}

const prisma = (x0, x1, y0, y1, z0, z1) =>
  uvEnMetros(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))

// Prisma dado en planta: [x0, x1] × [y0, y1] y alturas [h0, h1].
const prismaPlanta = ([x0, x1], [y0, y1], [h0, h1]) => prisma(x0, x1, h0, h1, -y1, -y0)

function sombras(objeto, proyecta = true) {
  objeto.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = proyecta
      o.receiveShadow = true
    }
  })
  return objeto
}

// Tramos macizos de un muro de longitud L y altura h, descontando huecos.
// Se trocea en franjas verticales para admitir huecos uno encima de otro
// (por ejemplo una celosía sobre una puerta).
function tramos(L, h, huecos) {
  const cortes = [...new Set([0, L, ...huecos.flatMap((o) => [o.desde, o.desde + o.ancho])])]
    .filter((x) => x >= 0 && x <= L)
    .sort((a, b) => a - b)
  const r = []
  for (let i = 0; i < cortes.length - 1; i++) {
    const x0 = cortes[i], x1 = cortes[i + 1], xm = (x0 + x1) / 2
    if (x1 - x0 < 1e-6) continue
    const vanos = huecos
      .filter((o) => o.desde < xm && xm < o.desde + o.ancho)
      .map((o) => [o.antepecho ?? 0, (o.antepecho ?? 0) + o.alto])
      .sort((a, b) => a[0] - b[0])
    let y = 0
    for (const [pie, cabeza] of vanos) {
      if (pie > y) r.push([x0, x1, y, Math.min(pie, h)])
      y = Math.max(y, cabeza)
      if (y >= h) break
    }
    if (y < h) r.push([x0, x1, y, h])
  }
  return r
}

// Muro en coordenadas locales: x a lo largo del muro, y vertical, z de z0 a z1 (espesor).
// Se construye tres veces (completo, cortado por el plano de sección para la planta
// y como zócalo para la maqueta) y se alterna con setModo().
function construirMuro({ L, h, z0, z1, huecos, material, poche, extras, seccion, zocalo }) {
  const objeto = new THREE.Group()
  const modos = {}
  for (const [modo, altura] of [['completo', h], ['seccion', Math.min(seccion, h)], ['zocalo', Math.min(zocalo, h)]]) {
    const piezas = tramos(L, altura, huecos)
    // en sección, lo que llega al plano de corte va relleno; lo que queda por debajo
    // (antepechos) se ve en proyección con su acabado
    const cortado = (p) => modo === 'seccion' && p[3] >= altura - 1e-6
    const capa = new THREE.Group()
    for (const [lista, mat] of [[piezas.filter(cortado), poche], [piezas.filter((p) => !cortado(p)), material]]) {
      if (!lista.length) continue
      const malla = new THREE.Mesh(mergeGeometries(lista.map(([xa, xb, ya, yb]) => prisma(xa, xb, ya, yb, z0, z1))), mat)
      malla.castShadow = malla.receiveShadow = true
      capa.add(malla)
    }
    capa.visible = modo === 'completo'
    modos[modo] = capa
    objeto.add(capa)
  }
  if (extras) modos.completo.add(extras)
  return {
    objeto,
    colision: modos.completo,
    setModo(modo) {
      for (const k in modos) modos[k].visible = k === modo
    },
  }
}

function colocarEnTramo(objeto, a, b, cota = 0) {
  objeto.position.copy(aMundo(a, cota))
  objeto.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0])
}

// Celosías (respiración): paño de ladrillo calado dentro del hueco.
function celosias(huecos, zc, m) {
  const g = new THREE.Group()
  for (const o of huecos.filter((h) => h.tipo === 'celosia')) {
    const y0 = o.antepecho ?? 0
    g.add(new THREE.Mesh(prisma(o.desde, o.desde + o.ancho, y0, y0 + o.alto, zc - 0.005, zc + 0.005), m.celosia))
  }
  return sombras(g)
}

// Acabados distintos sobre la cara interior del muro (ladrillo rojo, enfoscado, zunchos).
// zInt es la cara interior del muro y s el sentido hacia el interior del local.
function parches(lista, zInt, s, m) {
  const g = new THREE.Group()
  for (const p of lista) {
    const material = m.acabados?.[p.acabado]
    if (!material) continue
    const e = p.saliente ?? 0.006
    const [za, zb] = s > 0 ? [zInt, zInt + e] : [zInt - e, zInt]
    g.add(new THREE.Mesh(prisma(p.desde, p.hasta, p.de, p.a, za, zb), material))
  }
  return sombras(g)
}

// Bajante vertical con su recorrido colgado del techo.
function bajante(b, h, m, techo) {
  const pie = aMundo([b.x, b.y])
  const r = 0.055, cota = h - 0.12
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, cota, 16).translate(0, cota / 2, 0), m.pvc)
  tubo.position.copy(pie)
  let anterior = pie.clone().setY(cota)
  for (const p of b.recorrido ?? []) {
    const siguiente = aMundo(p, cota)
    const largo = anterior.distanceTo(siguiente)
    const tramo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, largo, 16).rotateX(Math.PI / 2), m.pvc)
    tramo.position.lerpVectors(anterior, siguiente, 0.5)
    tramo.lookAt(siguiente)
    const codo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.15, 12, 8), m.pvc)
    codo.position.copy(anterior)
    techo.add(sombras(tramo), sombras(codo))
    anterior = siguiente
  }
  return sombras(tubo)
}

// Losa con la forma de la planta, de y = 0 a y = espesor.
function losa(poligono, espesor, material) {
  const forma = new THREE.Shape(poligono.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(forma, { depth: espesor, bevelEnabled: false }).rotateX(-Math.PI / 2)
  return new THREE.Mesh(geo, material)
}

// Contorno exterior de los muros (el interior desplazado el espesor de cada muro).
function contornoExterior(local) {
  const lista = muros(local), n = lista.length
  return lista.map((m, i) => {
    const prev = lista[(i - 1 + n) % n]
    const p = [prev.a[0] + prev.normal[0] * prev.t, prev.a[1] + prev.normal[1] * prev.t]
    const q = [m.a[0] + m.normal[0] * m.t, m.a[1] + m.normal[1] * m.t]
    const cruz = prev.dir[0] * m.dir[1] - prev.dir[1] * m.dir[0]
    if (Math.abs(cruz) < 1e-9) return q
    const s = ((q[0] - p[0]) * m.dir[1] - (q[1] - p[1]) * m.dir[0]) / cruz
    return [p[0] + prev.dir[0] * s, p[1] + prev.dir[1] * s]
  })
}

// Terreno exterior a la cota de la acera, con el hueco del local.
function terreno(local, material) {
  const forma = new THREE.Shape([[-200, -200], [200, -200], [200, 200], [-200, 200]].map(([x, y]) => new THREE.Vector2(x, y)))
  forma.holes.push(new THREE.Path(contornoExterior(local).map(([x, y]) => new THREE.Vector2(x, y))))
  const malla = new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2), material)
  malla.position.y = (local.cotaCalle ?? 0) - 0.005
  malla.receiveShadow = true
  return malla
}

// n+1 posiciones repartidas entre a y b, separadas como mucho "maximo".
function repartir(a, b, maximo) {
  const n = Math.max(1, Math.ceil((b - a) / maximo))
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
}

// Estructura de acero bajo una tarima: pilares con placa de anclaje, vigas
// paralelas a la fachada y viguetas hacia el fondo. Encima, tablero + acabado (6 cm).
function estructuraTarima({ cota, poligono, separacionPilares = 2.2, separacionViguetas = 0.6 }, local, m) {
  const { minX, minY, maxX, maxY } = limites(poligono)
  const topVigueta = cota - 0.06, topViga = topVigueta - 0.12, pieViga = topViga - 0.16
  const piezas = []
  const filas = repartir(minY + 0.2, maxY - 0.2, separacionPilares)
  const columnas = repartir(minX + 0.35, maxX - 0.35, separacionPilares)
  for (const y of filas) piezas.push(prismaPlanta([minX + 0.02, maxX - 0.02], [y - 0.04, y + 0.04], [pieViga, topViga]))
  for (const x of repartir(minX + 0.08, maxX - 0.08, separacionViguetas)) {
    piezas.push(prismaPlanta([x - 0.03, x + 0.03], [minY + 0.02, maxY - 0.02], [topViga, topVigueta]))
  }
  for (const x of columnas) {
    for (const y of filas) {
      if (!dentro([x, y], poligono)) continue
      const choca =
        local.pilares.some((p) => Math.abs(x - p.x) < p.ancho / 2 + 0.12 && Math.abs(y - p.y) < p.fondo / 2 + 0.12) ||
        (local.bajantes ?? []).some((b) => Math.hypot(x - b.x, y - b.y) < 0.3)
      if (choca) continue
      piezas.push(prismaPlanta([x - 0.05, x + 0.05], [y - 0.05, y + 0.05], [0.015, pieViga]))
      piezas.push(prismaPlanta([x - 0.12, x + 0.12], [y - 0.12, y + 0.12], [0, 0.015]))
    }
  }
  return sombras(new THREE.Mesh(mergeGeometries(piezas), m.acero))
}

const SENTIDOS = { izquierda: Math.PI, derecha: 0, fondo: Math.PI / 2, fachada: -Math.PI / 2 }

// Geometría de la escalera: recorrido, ancho y punto de arranque (centro del borde alto).
function trazaEscalera(e) {
  const [[x0, y0], [x1, y1]] = e.tramo
  const lateral = e.baja === 'izquierda' || e.baja === 'derecha'
  const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2
  return {
    recorrido: lateral ? x1 - x0 : y1 - y0,
    ancho: lateral ? y1 - y0 : x1 - x0,
    arranque: { izquierda: [x1, ym], derecha: [x0, ym], fondo: [xm, y0], fachada: [xm, y1] }[e.baja],
    // distancia bajada desde el borde alto, para un punto del tramo
    avance: ([x, y]) => ({ izquierda: x1 - x, derecha: x - x0, fondo: y - y0, fachada: y1 - y })[e.baja],
  }
}

// Altura de la línea de peldaños en un punto (para apoyar la barandilla).
function alturaEscalera(e, cota, p) {
  if (enRect(p, e.rellano)) return cota
  if (!enRect(p, e.tramo)) return 0
  const { recorrido, avance } = trazaEscalera(e)
  return cota * (1 - THREE.MathUtils.clamp(avance(p) / recorrido, 0, 1))
}

// Escalera de zancas de acero, con barandilla metálica en el lado abierto.
function construirEscalera(e, cota, local, m) {
  const { recorrido, ancho, arranque } = trazaEscalera(e)
  const g = new THREE.Group()
  const tramo = new THREE.Group() // eje x local = sentido de bajada
  tramo.position.copy(aMundo(arranque))
  tramo.rotation.y = SENTIDOS[e.baja]
  g.add(tramo)
  const n = e.peldanos, tabica = cota / n, huella = recorrido / (n - 1)
  const peldanos = []
  for (let k = 1; k < n; k++) {
    const arriba = cota - k * tabica
    const p = new THREE.Mesh(prisma((k - 1) * huella - 0.02, k * huella, arriba - 0.04, arriba, -ancho / 2 + 0.03, ancho / 2 - 0.03), m.tablero)
    peldanos.push(p)
    tramo.add(p)
  }
  const largo = Math.hypot(recorrido, cota), pendiente = Math.atan2(cota, recorrido)
  for (const z of [-ancho / 2 + 0.015, ancho / 2 - 0.015]) {
    const zanca = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.22, 0.02), m.acero)
    zanca.position.set(recorrido / 2, cota / 2 - 0.1, z)
    zanca.rotation.z = -pendiente
    tramo.add(zanca)
  }

  // Meseta: tarima pequeña con su estructura
  const [[rx0, ry0], [rx1, ry1]] = e.rellano
  const poligonoRellano = [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]]
  const rellano = losa(poligonoRellano, 0.06, m.tablero)
  rellano.position.y = cota - 0.06
  g.add(estructuraTarima({ cota, poligono: poligonoRellano, separacionPilares: 1.2 }, local, m))

  // Barandilla metálica siguiendo la escalera: montantes, pasamanos y travesaño
  const obstaculos = []
  if (e.barandilla?.length > 1) {
    const linea = (dh) => {
      const puntos = []
      for (let i = 0; i < e.barandilla.length - 1; i++) {
        const [a, b] = [e.barandilla[i], e.barandilla[i + 1]]
        const pasos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1))
        for (let j = i ? 1 : 0; j <= pasos; j++) {
          const p = [a[0] + ((b[0] - a[0]) * j) / pasos, a[1] + ((b[1] - a[1]) * j) / pasos]
          puntos.push(aMundo(p, alturaEscalera(e, cota, p) + dh))
        }
      }
      return puntos
    }
    const tubo = (puntos, r) => {
      const curva = new THREE.CurvePath()
      for (let i = 1; i < puntos.length; i++) curva.add(new THREE.LineCurve3(puntos[i - 1], puntos[i]))
      return new THREE.Mesh(new THREE.TubeGeometry(curva, puntos.length * 2, r, 8), m.acero)
    }
    const arriba = linea(0.95), base = linea(0.05)
    g.add(sombras(tubo(arriba, 0.022)), sombras(tubo(linea(0.5), 0.012)))
    const cada = Math.max(1, Math.round(0.9 / 0.1))
    for (let i = 0; i < arriba.length; i += cada) {
      const alto = arriba[i].y - base[i].y
      const montante = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, alto, 8), m.acero)
      montante.position.copy(base[i]).setY(base[i].y + alto / 2)
      g.add(sombras(montante))
    }
    // paño invisible entre pasamanos y peldaños, solo para no atravesarla en el recorrido
    const pos = [], indices = []
    base.forEach((v, i) => {
      pos.push(v.x, v.y, v.z, arriba[i].x, arriba[i].y, arriba[i].z)
      if (i) indices.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i)
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(indices)
    const pano = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    pano.visible = false
    g.add(pano)
    obstaculos.push(pano)
  }
  sombras(tramo)
  return { objeto: g, rellano: sombras(rellano), peldanos, obstaculos }
}

export function construirEscena({ local, propuesta = null, entorno, aniso }) {
  const escena = new THREE.Scene()
  escena.environment = entorno
  escena.environmentIntensity = 0.45
  // la propuesta conserva los acabados actuales; solo añade lo nuevo
  const m = propuesta ? materialesPropuesta(local, aniso) : materialesActual(local, aniso)
  const h = local.alturaLibre
  const ft = propuesta ? falsoTecho(local, propuesta) : null
  const cotaPrincipal = propuesta?.tarima?.cota ?? 0 // suelo sobre el que se corta la planta
  const corteSeccion = cotaPrincipal + SECCION
  const corteZocalo = (local.cotaCalle ?? 0) + ZOCALO
  const techo = new THREE.Group() // se oculta en maqueta y planta
  const sobreTarima = new THREE.Group() // se oculta para ver la estructura
  const suelos = [] // superficies pisables (para el recorrido)
  const obstaculos = []
  const paredes = []
  escena.add(techo, sobreTarima)

  // Terreno exterior, solera y forjado
  escena.add(terreno(local, m.exterior))

  const solera = losa(local.planta, 0.2, m.suelo)
  solera.position.y = -0.2
  solera.receiveShadow = true
  escena.add(solera)
  suelos.push(solera)

  const forjado = losa(local.planta, 0.3, m.techo)
  forjado.position.y = h
  forjado.castShadow = forjado.receiveShadow = true
  techo.add(forjado)

  // Falso techo, dejando el plénum para instalaciones
  if (ft) {
    const placas = losa(local.planta, 0.04, m.falsoTecho)
    placas.position.y = ft
    placas.castShadow = placas.receiveShadow = true
    techo.add(placas)
  }

  // Tarima elevada con su estructura, y escalera al nivel original
  if (propuesta?.tarima) {
    const t = propuesta.tarima
    escena.add(estructuraTarima(t, local, m))
    const tablero = sombras(losa(t.poligono, 0.06, m.tablero))
    tablero.position.y = t.cota - 0.06
    sobreTarima.add(tablero)
    suelos.push(tablero)
    if (propuesta.escalera) {
      const esc = construirEscalera(propuesta.escalera, t.cota, local, m)
      escena.add(esc.objeto)
      sobreTarima.add(esc.rellano)
      suelos.push(esc.rellano, ...esc.peldanos)
      obstaculos.push(...esc.obstaculos)
    }
  }

  // Muros perimetrales (el muro va por fuera del contorno interior)
  for (const muro of muros(local)) {
    const t = muro.t
    const huecos = local.huecos.filter((o) => o.muro === muro.i)
    const lado = Math.sign(
      // ¿la z local del muro apunta al exterior?
      muro.dir[1] * muro.normal[0] - muro.dir[0] * muro.normal[1],
    )
    const [z0, z1] = lado > 0 ? [0, t] : [-t, 0]
    const extras = new THREE.Group()
    extras.add(celosias(huecos, (z0 + z1) / 2, m))
    extras.add(parches((local.parches ?? []).filter((p) => p.muro === muro.i), lado > 0 ? z0 : z1, -lado, m))
    const pared = construirMuro({
      L: muro.L + muro.extension,
      h,
      z0,
      z1,
      huecos,
      material: m.pared(muro.i),
      poche: m.poche,
      extras,
      seccion: corteSeccion,
      zocalo: corteZocalo,
    })
    colocarEnTramo(pared.objeto, muro.a, muro.b)
    escena.add(pared.objeto)
    obstaculos.push(pared.colision)
    const n = new THREE.Vector3(muro.normal[0], 0, -muro.normal[1])
    const centro = aMundo([muro.a[0] + (muro.dir[0] * muro.L) / 2, muro.a[1] + (muro.dir[1] * muro.L) / 2], h / 2)
    paredes.push({ ...pared, perimetral: true, normal: n, centro: centro.addScaledVector(n, t / 2) })
  }

  for (const b of local.bajantes ?? []) {
    const tubo = bajante(b, h, m, techo)
    escena.add(tubo)
    obstaculos.push(tubo)
  }

  // Tabiques nuevos (el panelado): arrancan de la tarima o de la solera y llegan al falso techo
  for (const tab of propuesta?.tabiques ?? []) {
    const e = tab.espesor ?? 0.1
    const L = Math.hypot(tab.a[0] - tab.de[0], tab.a[1] - tab.de[1])
    const base = tab.cota ?? cotaEn(propuesta, [(tab.de[0] + tab.a[0]) / 2, (tab.de[1] + tab.a[1]) / 2])
    const pared = construirMuro({
      L,
      h: ft + 0.04 - base,
      z0: -e / 2,
      z1: e / 2,
      huecos: tab.huecos ?? [],
      material: tab.acabado === 'panelado' ? m.panelado : m.pared(),
      poche: m.poche,
      seccion: corteSeccion - base,
      zocalo: corteZocalo - base,
    })
    colocarEnTramo(pared.objeto, tab.de, tab.a, base)
    ;(base > 0 ? sobreTarima : escena).add(pared.objeto)
    obstaculos.push(pared.colision)
    paredes.push({ ...pared, perimetral: false })
  }

  // Pilares: un muro sin huecos, de modo que también se cortan en planta
  for (const p of local.pilares) {
    const pilar = construirMuro({
      L: p.ancho,
      h,
      z0: -p.fondo / 2,
      z1: p.fondo / 2,
      huecos: [],
      material: m.pilar,
      poche: m.poche,
      seccion: corteSeccion,
      zocalo: corteZocalo,
    })
    pilar.objeto.position.copy(aMundo([p.x - p.ancho / 2, p.y]))
    escena.add(pilar.objeto)
    obstaculos.push(pilar.colision)
    paredes.push({ ...pilar, perimetral: false })
  }

  // Lo que hay ahora en el local (cuadro eléctrico…): sigue en su sitio, sobre la solera
  for (const def of local.existentes ?? []) {
    const base = def.cota ?? 0
    const objeto = sombras(crearMueble(def, { techo: (ft ?? h) - base }))
    objeto.position.y = base
    ;(DEL_TECHO.has(def.tipo) ? techo : escena).add(objeto)
    if (!SIN_COLISION.has(def.tipo)) obstaculos.push(objeto)
  }

  // Luz: cielo + sol que entra por la fachada
  const { centro, ancho, fondo } = limites(local.planta)
  const c = aMundo(centro)
  // el color "de suelo" del hemisferio hace de rebote de la solera sobre el techo
  escena.add(new THREE.HemisphereLight('#f3f1ec', '#c9bfae', 0.9))
  const sol = new THREE.DirectionalLight('#fff1dc', 2.0)
  // en perspectiva entra en diagonal por la fachada; en planta va casi cenital
  // para que las sombras no ensucien el plano
  const posicionSol = {
    perspectiva: c.clone().add(new THREE.Vector3(-0.5 * ancho - 4, 14, 0.5 * fondo + 8)),
    planta: c.clone().add(new THREE.Vector3(-1.2, 14, 1.8)),
  }
  sol.target.position.copy(c)
  sol.castShadow = true
  const r = Math.hypot(ancho, fondo) / 2 + 2
  Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 60 })
  sol.shadow.mapSize.set(2048, 2048)
  sol.shadow.bias = -0.0004
  sol.shadow.normalBias = 0.03
  sol.shadow.radius = 3
  escena.add(sol, sol.target)

  // el recorrido hace raycasting antes del primer render
  escena.updateMatrixWorld(true)

  return {
    escena,
    suelos,
    obstaculos,
    // Recorta la geometría según la vista: en maqueta se quita el techo y se bajan
    // los muros que tapan la cámara; en planta todo se corta por el plano de sección.
    aplicarVista(vista, camara, { estructura = false } = {}) {
      techo.visible = vista === 'recorrido'
      sobreTarima.visible = !(estructura && vista !== 'recorrido')
      sol.position.copy(vista === 'planta' ? posicionSol.planta : posicionSol.perspectiva)
      for (const p of paredes) {
        if (vista === 'planta') p.setModo('seccion')
        else if (vista === 'recorrido' || !p.perimetral) p.setModo('completo')
        else {
          const delante = camara.position.clone().sub(p.centro).dot(p.normal) > 0
          p.setModo(delante ? 'zocalo' : 'completo')
        }
      }
    },
  }
}
