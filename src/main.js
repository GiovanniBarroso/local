import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { local } from './data/local.js'
import { propuesta } from './data/propuesta.js'
import { construirEscena } from './escena.js'
import { construirCotas, construirZonas, actualizarCotas, actualizarZonas } from './cotas.js'
import { Recorrido } from './recorrido.js'
import { aMundo, aPlanta, muros, limites, dentro, distanciaAlBorde, superficieUtil, formato, falsoTecho } from './geometria.js'

const FONDO = new THREE.Color('#e7e4de')
const MODOS = ['actual', 'propuesta', 'comparar']
const VISTAS = ['maqueta', 'planta', 'recorrido']
const AYUDA = {
  maqueta: 'Arrastra para girar · rueda para acercar · clic derecho o dos dedos para desplazar',
  planta: 'Arrastra para desplazar · rueda o pellizco para acercar',
  recorrido: 'Arrastra para mirar · clic en el suelo para ir · WASD o flechas para caminar (Mayús para correr)',
}

const [modoHash, vistaHash] = location.hash.slice(1).split('/')
const estado = {
  modo: MODOS.includes(modoHash) ? modoHash : 'propuesta',
  vista: VISTAS.includes(vistaHash) ? vistaHash : 'maqueta',
  cotas: true,
  estructura: false, // ocultar tarima y muebles para ver el acero
  corte: 0.5,
}

// Render
const visor = document.getElementById('visor')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.95
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.autoClear = false
visor.append(renderer.domElement)

const etiquetas = new CSS2DRenderer()
etiquetas.domElement.className = 'etiquetas'
visor.append(etiquetas.domElement)

const entorno = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
const escenas = {
  actual: construirEscena({ local, entorno, aniso }),
  propuesta: construirEscena({ local, propuesta, entorno, aniso }),
}

// Capa superpuesta común a las dos escenas: cotas, rótulos y marcador del recorrido
const superpuesta = new THREE.Scene()
const cotas = construirCotas(local)
const zonas = construirZonas(propuesta)
const marcador = new THREE.Mesh(
  new THREE.RingGeometry(0.17, 0.22, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }),
)
marcador.visible = false
superpuesta.add(cotas, zonas, marcador)

// Cámaras
const lim = limites(local.planta)
const centro = aMundo(lim.centro)
const radio = Math.hypot(lim.ancho, lim.fondo, local.alturaLibre) / 2

const camMaqueta = new THREE.PerspectiveCamera(40, 1, 0.1, 400)
const orbita = new OrbitControls(camMaqueta, renderer.domElement)
orbita.enableDamping = true
orbita.maxPolarAngle = Math.PI * 0.49
orbita.minDistance = 2
orbita.maxDistance = radio * 8
orbita.target.copy(centro)

const camPlanta = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
camPlanta.up.set(0, 0, -1) // en pantalla, arriba = fondo del local
camPlanta.position.copy(centro).setY(60)
const plano = new OrbitControls(camPlanta, renderer.domElement)
plano.enableRotate = false
plano.zoomToCursor = true
plano.minZoom = 0.5
plano.maxZoom = 12
plano.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
plano.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
plano.target.copy(centro)

const camRecorrido = new THREE.PerspectiveCamera(65, 1, 0.05, 400)
const recorrido = new Recorrido(camRecorrido, renderer.domElement, {
  objetivos: () => escenaInteractiva(),
  libre: (v) => dentro(aPlanta(v), local.planta) && distanciaAlBorde(aPlanta(v), local.planta) > 0.3,
  marcador,
})

const camaras = { maqueta: camMaqueta, planta: camPlanta, recorrido: camRecorrido }

// acceso para pruebas automáticas; no llega al build de producción
if (import.meta.env.DEV) window.visor = { recorrido, camRecorrido, estado }

function encuadrarMaqueta() {
  const vfov = THREE.MathUtils.degToRad(camMaqueta.fov)
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camMaqueta.aspect)
  const distancia = (radio * 1.15) / Math.sin(Math.min(vfov, hfov) / 2)
  const direccion = new THREE.Vector3(-0.55, 0.85, 0.75).normalize()
  camMaqueta.position.copy(centro).addScaledVector(direccion, distancia)
  orbita.target.copy(centro)
  orbita.update()
}

// Entrada: recién cruzada la puerta principal, mirando hacia el centro del local
function situarEnEntrada() {
  const puerta = local.huecos.find((o) => o.principal) ?? local.huecos.find((o) => o.tipo === 'puerta')
  if (!puerta) return recorrido.situar(centro, 0)
  const m = muros(local)[puerta.muro]
  const medio = puerta.desde + puerta.ancho / 2
  const p = [m.a[0] + m.dir[0] * medio - m.normal[0] * 0.7, m.a[1] + m.dir[1] * medio - m.normal[1] * 0.7]
  recorrido.situar(aMundo(p), Math.atan2(-(lim.centro[0] - p[0]), lim.centro[1] - p[1]))
}

function ajustarPlanta() {
  const aspecto = innerWidth / innerHeight
  const margen = Math.max(...muros(local).map((m) => m.t)) + 1.6
  const w = lim.ancho + 2 * margen, h = lim.fondo + 2 * margen
  const alto = Math.max(h, w / aspecto) * 1.18
  Object.assign(camPlanta, { top: alto / 2, bottom: -alto / 2, left: (-alto * aspecto) / 2, right: (alto * aspecto) / 2 })
  camPlanta.updateProjectionMatrix()
}

function redimensionar() {
  renderer.setSize(innerWidth, innerHeight)
  etiquetas.setSize(innerWidth, innerHeight)
  for (const c of [camMaqueta, camRecorrido]) {
    c.aspect = innerWidth / innerHeight
    c.updateProjectionMatrix()
  }
  ajustarPlanta()
}

// La escena con la que se interactúa en el recorrido (en comparar, la propuesta)
function escenaInteractiva() {
  return estado.modo === 'actual' ? escenas.actual : escenas.propuesta
}

// Interfaz
const $ = (s) => document.querySelector(s)
const botonesModo = document.querySelectorAll('[data-modo]')
const botonesVista = document.querySelectorAll('[data-vista]')
const comparador = $('#comparador')

$('#nombre').textContent = local.nombre
if (matchMedia('(max-width: 720px)').matches) $('#ficha').open = false

function pintarFicha() {
  const aprox = local.alturaEstimada ? '≈ ' : ''
  const filas = [
    ['Superficie útil', `${formato(superficieUtil(local))} m²`],
    ['Altura libre', `${aprox}${formato(local.alturaLibre)} m`],
    ['Acera sobre el suelo', `${aprox}+${formato(local.cotaCalle ?? 0)} m`],
  ]
  if (estado.modo !== 'actual') {
    const t = propuesta.tarima?.cota ?? 0
    filas.push(['Altura útil sobre tarima', `${aprox}${formato(falsoTecho(local, propuesta) - t)} m`])
  }
  $('#datos').innerHTML = filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')
}

function aplicar() {
  const { modo, vista } = estado
  orbita.enabled = vista === 'maqueta'
  plano.enabled = vista === 'planta'
  recorrido.enabled = vista === 'recorrido'
  if (vista !== 'recorrido') marcador.visible = false

  botonesModo.forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === modo))
  botonesVista.forEach((b) => b.setAttribute('aria-pressed', b.dataset.vista === vista))
  $('#btn-cotas').setAttribute('aria-pressed', estado.cotas)
  $('#btn-cotas').disabled = vista === 'recorrido'
  $('#btn-estructura').setAttribute('aria-pressed', estado.estructura)
  $('#btn-estructura').disabled = vista === 'recorrido' || modo === 'actual' || !propuesta.tarima
  comparador.hidden = modo !== 'comparar'
  cotas.visible = estado.cotas && vista !== 'recorrido'
  zonas.visible = cotas.visible && modo !== 'actual'
  $('#ayuda').textContent = AYUDA[vista]
  document.body.dataset.vista = vista
  pintarFicha()
  history.replaceState(null, '', `#${modo}/${vista}`)
}

botonesModo.forEach((b) =>
  b.addEventListener('click', () => {
    estado.modo = b.dataset.modo
    aplicar()
    // en el recorrido, la cámara se apoya en el suelo de la escena nueva (tarima o solera)
    if (estado.vista === 'recorrido') recorrido.asentar()
  }),
)
botonesVista.forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.vista === estado.vista && estado.vista === 'maqueta') encuadrarMaqueta()
    estado.vista = b.dataset.vista
    aplicar()
  }),
)
$('#btn-cotas').addEventListener('click', () => ((estado.cotas = !estado.cotas), aplicar()))
$('#btn-estructura').addEventListener('click', () => ((estado.estructura = !estado.estructura), aplicar()))
$('#btn-captura').addEventListener('click', capturar)

// Divisor del comparador
const divisor = $('#comparador .divisor')
divisor.addEventListener('pointerdown', (e) => {
  divisor.setPointerCapture(e.pointerId)
  const mover = (ev) => {
    estado.corte = THREE.MathUtils.clamp(ev.clientX / innerWidth, 0.04, 0.96)
    comparador.style.setProperty('--corte', estado.corte)
  }
  mover(e)
  divisor.addEventListener('pointermove', mover)
  divisor.addEventListener('pointerup', () => divisor.removeEventListener('pointermove', mover), { once: true })
})
comparador.style.setProperty('--corte', estado.corte)

// Dibujo
function pintarEscena(e, camara, x, ancho) {
  renderer.setScissor(x, 0, ancho, innerHeight)
  renderer.setClearColor(FONDO)
  renderer.clear()
  renderer.render(e.escena, camara)
  renderer.render(superpuesta, camara)
}

function dibujar() {
  const camara = camaras[estado.vista]
  for (const e of Object.values(escenas)) e.aplicarVista(estado.vista, camara, { estructura: estado.estructura })
  actualizarCotas(cotas, estado.vista, camara)
  actualizarZonas(zonas, estado.modo === 'comparar' ? estado.corte : 0, camara)
  renderer.setScissorTest(true)
  if (estado.modo === 'comparar') {
    const x = Math.round(innerWidth * estado.corte)
    pintarEscena(escenas.actual, camara, 0, x)
    pintarEscena(escenas.propuesta, camara, x, innerWidth - x)
  } else {
    pintarEscena(escenas[estado.modo], camara, 0, innerWidth)
  }
  renderer.setScissorTest(false)
  etiquetas.render(superpuesta, camara)
}

// Los rótulos son HTML encima del canvas: para la captura se redibujan en la imagen.
function rotularEnLienzo(ctx, el) {
  const r = el.getBoundingClientRect(), estilo = getComputedStyle(el)
  ctx.fillStyle = estilo.backgroundColor
  ctx.beginPath()
  ctx.roundRect(r.x, r.y, r.width, r.height, parseFloat(estilo.borderRadius) || 0)
  ctx.fill()
  for (const t of el.children.length ? el.children : [el]) {
    const rt = t.getBoundingClientRect(), et = getComputedStyle(t)
    ctx.font = `${et.fontWeight} ${et.fontSize} ${et.fontFamily}`
    ctx.fillStyle = et.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t.textContent, rt.x + rt.width / 2, rt.y + rt.height / 2)
  }
}

function capturar() {
  dibujar()
  const fuente = renderer.domElement
  const lienzo = document.createElement('canvas')
  lienzo.width = fuente.width
  lienzo.height = fuente.height
  const ctx = lienzo.getContext('2d')
  ctx.drawImage(fuente, 0, 0)
  ctx.scale(fuente.width / innerWidth, fuente.height / innerHeight)
  if (estado.modo === 'comparar') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(Math.round(innerWidth * estado.corte) - 1, 0, 2, innerHeight)
    document.querySelectorAll('#comparador .lado').forEach((el) => rotularEnLienzo(ctx, el))
  }
  for (const el of etiquetas.domElement.children) if (el.style.display !== 'none') rotularEnLienzo(ctx, el)
  const a = document.createElement('a')
  a.href = lienzo.toDataURL('image/png')
  a.download = `${local.nombre} - ${estado.modo} - ${estado.vista}.png`
  a.click()
}

// Arranque
redimensionar()
encuadrarMaqueta()
situarEnEntrada()
addEventListener('resize', redimensionar)
aplicar()
for (const e of Object.values(escenas)) renderer.compile(e.escena, camMaqueta)

const reloj = new THREE.Timer()
reloj.connect(document)
renderer.setAnimationLoop((t) => {
  reloj.update(t)
  const dt = Math.min(reloj.getDelta(), 0.1)
  if (estado.vista === 'maqueta') orbita.update()
  if (estado.vista === 'planta') plano.update()
  recorrido.update(dt)
  dibujar()
})
