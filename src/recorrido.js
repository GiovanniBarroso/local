// Recorrido a pie: arrastrar para mirar, clic en el suelo para ir, WASD/flechas para caminar.
import * as THREE from 'three'

export const ALTURA_OJOS = 1.6
const RADIO = 0.3
const ESCALON = 0.35 // lo más que se sube de un paso: un peldaño sí, la tarima no
const ABAJO = new THREE.Vector3(0, -1, 0)
const ARRIBA = new THREE.Vector3(0, 1, 0)

const TECLAS = {
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA', 'ArrowLeft'],
  derecha: ['KeyD', 'ArrowRight'],
}

export class Recorrido {
  enabled = false
  yaw = 0
  pitch = -0.08
  suelo = 0 // cota del suelo que se pisa
  #teclas = new Set()
  #viaje = null
  #puntero = null
  #rayo = new THREE.Raycaster()

  // objetivos(): { suelos, obstaculos } de la escena visible
  // libre(punto): si el punto (en mundo) está dentro del local
  constructor(camara, elemento, { objetivos, libre, marcador }) {
    Object.assign(this, { camara, elemento, objetivos, libre, marcador })
    elemento.addEventListener('pointerdown', (e) => this.#abajo(e))
    elemento.addEventListener('pointermove', (e) => this.#mover(e))
    elemento.addEventListener('pointerup', (e) => this.#arriba(e))
    elemento.addEventListener('pointerleave', () => (marcador.visible = false))
    elemento.addEventListener('wheel', (e) => this.#rueda(e), { passive: false })
    addEventListener('keydown', (e) => {
      if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return
      if (Object.values(TECLAS).flat().includes(e.code)) e.preventDefault()
      this.#teclas.add(e.code)
    })
    addEventListener('keyup', (e) => this.#teclas.delete(e.code))
    addEventListener('blur', () => this.#teclas.clear())
  }

  situar(posicion, yaw) {
    this.suelo = this.#cotaSuelo(posicion, 50) ?? 0
    this.camara.position.set(posicion.x, this.suelo + ALTURA_OJOS, posicion.z)
    this.yaw = yaw
    this.pitch = -0.08
    this.#viaje = null
    this.#orientar()
  }

  // Al cambiar de escena (actual ↔ propuesta) el suelo bajo la cámara cambia de cota.
  asentar() {
    this.#viaje = null
    const cota = this.#cotaSuelo(this.camara.position, this.camara.position.y + 0.2)
    if (cota === null) return
    this.suelo = cota
    this.camara.position.y = cota + ALTURA_OJOS
  }

  #orientar() {
    this.camara.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }

  // Cota del primer suelo por debajo de "desde" en la vertical de pos.
  #cotaSuelo(pos, desde) {
    this.#rayo.set(new THREE.Vector3(pos.x, desde, pos.z), ABAJO)
    this.#rayo.far = Infinity
    const [impacto] = this.#rayo.intersectObjects(this.objetivos().suelos, false)
    return impacto ? impacto.point.y : null
  }

  // ¿Cabe una persona de pie? (no meterse bajo la meseta, la escalera o una mesa)
  #cabe(pos, cota) {
    this.#rayo.set(new THREE.Vector3(pos.x, cota + 0.3, pos.z), ARRIBA)
    this.#rayo.far = ALTURA_OJOS
    const { suelos, obstaculos } = this.objetivos()
    return !this.#rayo.intersectObjects(suelos, false).length && !this.#rayo.intersectObjects(obstaculos, true).length
  }

  // Punto del suelo bajo el cursor, si es alcanzable.
  #sueloBajo(e) {
    const r = this.elemento.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.#rayo.setFromCamera(ndc, this.camara)
    this.#rayo.far = Infinity
    const { suelos, obstaculos } = this.objetivos()
    const [impacto] = this.#rayo.intersectObjects([...suelos, ...obstaculos], true)
    if (!impacto || !suelos.includes(impacto.object) || !this.libre(impacto.point)) return null
    // solo caras horizontales (no el canto de la tarima ni de un peldaño)
    const normal = impacto.face.normal.clone().transformDirection(impacto.object.matrixWorld)
    return normal.y > 0.7 ? impacto.point : null
  }

  #abajo(e) {
    if (!this.enabled || e.button !== 0) return
    this.#puntero = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, arrastre: false }
    this.elemento.setPointerCapture(e.pointerId)
  }

  #mover(e) {
    if (!this.enabled) return
    const p = this.#puntero
    if (p) {
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 5) p.arrastre = true
      const k = 0.0045 * (this.camara.fov / 65)
      this.yaw += (e.clientX - p.x) * k
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - p.y) * k, -1.3, 1.3)
      p.x = e.clientX
      p.y = e.clientY
      this.#orientar()
      this.marcador.visible = false
    } else if (e.pointerType === 'mouse') {
      const punto = this.#sueloBajo(e)
      this.marcador.visible = !!punto
      if (punto) this.marcador.position.set(punto.x, punto.y + 0.012, punto.z)
    }
  }

  #arriba(e) {
    const p = this.#puntero
    this.#puntero = null
    if (!this.enabled || !p || p.arrastre) return
    const punto = this.#sueloBajo(e)
    if (punto) this.ir(punto)
  }

  #rueda(e) {
    if (!this.enabled) return
    e.preventDefault()
    this.camara.fov = THREE.MathUtils.clamp(this.camara.fov + e.deltaY * 0.03, 35, 80)
    this.camara.updateProjectionMatrix()
  }

  ir(punto) {
    const desde = this.camara.position.clone()
    const hasta = new THREE.Vector3(punto.x, punto.y + ALTURA_OJOS, punto.z)
    this.#viaje = { desde, hasta, suelo: punto.y, t: 0, duracion: THREE.MathUtils.clamp(desde.distanceTo(hasta) / 3, 0.35, 1.2) }
  }

  // Cota del suelo tras dar este paso, o null si no se puede: fuera del local,
  // un desnivel mayor que un peldaño, sin altura libre o algo en medio.
  #pisada(paso) {
    const destino = this.camara.position.clone().add(paso)
    if (!this.libre(destino)) return null
    const cota = this.#cotaSuelo(destino, this.suelo + ESCALON + 0.05)
    if (cota === null || cota - this.suelo > ESCALON || !this.#cabe(destino, cota)) return null
    const dir = paso.clone().normalize()
    const { obstaculos } = this.objetivos()
    for (const altura of [0.3, 0.7, 1.2]) {
      this.#rayo.set(new THREE.Vector3(this.camara.position.x, this.suelo + altura, this.camara.position.z), dir)
      this.#rayo.far = paso.length() + RADIO
      if (this.#rayo.intersectObjects(obstaculos, true).length) return null
    }
    return cota
  }

  update(dt) {
    if (!this.enabled) return
    const pulsada = (accion) => TECLAS[accion].some((k) => this.#teclas.has(k))
    const avance = pulsada('adelante') - pulsada('atras')
    const lateral = pulsada('derecha') - pulsada('izquierda')

    if (avance || lateral) {
      this.#viaje = null
      const velocidad = this.#teclas.has('ShiftLeft') || this.#teclas.has('ShiftRight') ? 3.2 : 1.6
      const frente = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
      const derecha = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
      const paso = frente.multiplyScalar(avance).add(derecha.multiplyScalar(lateral)).normalize().multiplyScalar(velocidad * dt)
      // si choca, intenta deslizar a lo largo del obstáculo
      for (const intento of [paso, new THREE.Vector3(paso.x, 0, 0), new THREE.Vector3(0, 0, paso.z)]) {
        if (intento.lengthSq() < 1e-10) continue
        const cota = this.#pisada(intento)
        if (cota !== null) {
          this.camara.position.add(intento)
          this.suelo = cota
          break
        }
      }
    } else if (this.#viaje) {
      const v = this.#viaje
      v.t = Math.min(1, v.t + dt / v.duracion)
      const k = v.t < 0.5 ? 2 * v.t * v.t : 1 - (-2 * v.t + 2) ** 2 / 2
      this.camara.position.lerpVectors(v.desde, v.hasta, k)
      if (v.t === 1) {
        this.suelo = v.suelo
        this.#viaje = null
      }
    }
    if (!this.#viaje) {
      // al subir o bajar peldaños, la vista se acomoda suavemente
      const y = this.suelo + ALTURA_OJOS
      this.camara.position.y += (y - this.camara.position.y) * Math.min(1, dt * 12)
    }
    this.#orientar()
  }
}
