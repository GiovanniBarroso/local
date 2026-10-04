// Texturas generadas por código (canvas): sin imágenes externas ni licencias.
// Cada textura cubre un tamaño real en metros y las UV de la escena van en metros,
// así que la escala es siempre la real.
import * as THREE from 'three'

const TAM = 1024

function azar(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lienzo() {
  const c = document.createElement('canvas')
  c.width = c.height = TAM
  return [c, c.getContext('2d', { willReadFrequently: true })]
}

function textura(c, [mx, my], esColor, aniso) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / mx, 1 / my)
  t.anisotropy = aniso
  if (esColor) t.colorSpace = THREE.SRGBColorSpace
  return t
}

function ruido(ctx, cantidad, r) {
  const img = ctx.getImageData(0, 0, TAM, TAM), d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * cantidad
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

// Dibuja también las copias desplazadas para que la textura se repita sin costuras.
function enMosaico(x, y, radio, dibujar) {
  for (const dx of [-TAM, 0, TAM]) {
    for (const dy of [-TAM, 0, TAM]) {
      const cx = x + dx, cy = y + dy
      if (cx + radio > 0 && cx - radio < TAM && cy + radio > 0 && cy - radio < TAM) dibujar(cx, cy)
    }
  }
}

function variar(hex, r, cuanto) {
  const n = parseInt(hex.slice(1), 16), f = 1 + (r() - 0.5) * cuanto
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}

export function hormigon({ base, manchas = 0.06, poros = true, metros = 2, semilla = 1 }, aniso) {
  const [c, ctx] = lienzo(), r = azar(semilla)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, TAM, TAM)
  // manchas grandes y suaves + grano medio
  for (let i = 0; i < 700; i++) {
    const grande = i < 120
    const x = r() * TAM, y = r() * TAM
    const radio = grande ? 40 + r() * 140 : 4 + r() * 22
    const a = (grande ? manchas : manchas * 0.8) * r()
    const tono = r() > 0.5 ? '255,255,255' : '0,0,0'
    enMosaico(x, y, radio, (cx, cy) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio)
      g.addColorStop(0, `rgba(${tono},${a})`)
      g.addColorStop(1, `rgba(${tono},0)`)
      ctx.fillStyle = g
      ctx.fillRect(cx - radio, cy - radio, radio * 2, radio * 2)
    })
  }
  if (poros) {
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.35})`
      ctx.beginPath()
      ctx.arc(r() * TAM, r() * TAM, 0.6 + r() * 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ruido(ctx, 22, r)
  const mapa = textura(c, [metros, metros], true, aniso)
  return { mapa, relieve: mapa }
}

// Fábrica de ladrillo o de bloque, con su mapa de relieve (llagas hundidas).
export function fabrica({ pieza: [pw, ph], junta, colores, mortero, piezasX, hiladas, semilla = 2, variacion = 0.14 }, aniso) {
  const mx = piezasX * (pw + junta), my = hiladas * (ph + junta)
  const [c, ctx] = lienzo(), [cr, rctx] = lienzo(), r = azar(semilla)
  const sx = TAM / mx, sy = TAM / my
  ctx.fillStyle = mortero
  ctx.fillRect(0, 0, TAM, TAM)
  rctx.fillStyle = '#000'
  rctx.fillRect(0, 0, TAM, TAM)
  for (let j = 0; j < hiladas; j++) {
    const desfase = ((j % 2) * (pw + junta)) / 2
    const y = j * (ph + junta) + junta / 2
    for (let i = 0; i < piezasX; i++) {
      const color = variar(colores[Math.floor(r() * colores.length)], r, variacion)
      const x = i * (pw + junta) + desfase + junta / 2
      for (const ox of [0, -mx]) {
        ctx.fillStyle = color
        ctx.fillRect((x + ox) * sx, y * sy, pw * sx, ph * sy)
        rctx.fillStyle = '#c8c8c8'
        rctx.fillRect((x + ox) * sx, y * sy, pw * sx, ph * sy)
      }
    }
  }
  ruido(ctx, 30, r)
  ruido(rctx, 50, r)
  return { mapa: textura(c, [mx, my], true, aniso), relieve: textura(cr, [mx, my], false, aniso) }
}

// Ladrillo perforado amarillento de las medianeras
export const LADRILLO = {
  pieza: [0.24, 0.095],
  junta: 0.012,
  piezasX: 4,
  hiladas: 10,
  colores: ['#d6a672', '#cf9d68', '#dbae7e', '#cc9963'],
  mortero: '#cdbfa9',
  variacion: 0.08,
}

export const LADRILLO_ROJO = {
  pieza: [0.24, 0.095],
  junta: 0.012,
  piezasX: 4,
  hiladas: 10,
  colores: ['#b5603f', '#a8553a', '#c06c4a', '#9a4a33', '#7e3d2e', '#c9805c'],
  mortero: '#c4b39c',
  semilla: 11,
}

export const BLOQUE = {
  pieza: [0.39, 0.19],
  junta: 0.01,
  piezasX: 3,
  hiladas: 6,
  colores: ['#9e9b95', '#a8a59f', '#96938d'],
  mortero: '#87847d',
}

// Forjado reticular visto: nervios de hormigón y casetones de bloque aligerante.
export function reticular({ modulo = 0.8, nervio = 0.12, piezas = 3, semilla = 6 }, aniso) {
  const n = 2, m = modulo * n
  const [c, ctx] = lienzo(), [cr, rctx] = lienzo(), r = azar(semilla)
  const px = TAM / m
  ctx.fillStyle = '#bcb7ae'
  ctx.fillRect(0, 0, TAM, TAM)
  rctx.fillStyle = '#000'
  rctx.fillRect(0, 0, TAM, TAM)
  const lado = (modulo - nervio) * px
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i * modulo + nervio / 2) * px, y = (j * modulo + nervio / 2) * px
      for (let k = 0; k < piezas; k++) {
        const h = lado / piezas
        ctx.fillStyle = variar('#e4e1da', r, 0.05)
        ctx.fillRect(x, y + k * h + 1, lado, h - 2)
        rctx.fillStyle = '#d0d0d0'
        rctx.fillRect(x, y + k * h + 1, lado, h - 2)
      }
    }
  }
  // rebabas de hormigón sobre los bloques
  for (let i = 0; i < 90; i++) {
    const x = r() * TAM, y = r() * TAM, radio = 6 + r() * 26
    enMosaico(x, y, radio, (cx, cy) => {
      ctx.fillStyle = `rgba(175, 170, 160, ${0.12 + r() * 0.2})`
      ctx.beginPath()
      ctx.ellipse(cx, cy, radio, radio * (0.3 + r() * 0.5), r() * 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  ruido(ctx, 18, r)
  return { mapa: textura(c, [m, m], true, aniso), relieve: textura(cr, [m, m], false, aniso) }
}

// Celosía de ladrillo calado: los huecos son transparentes (dejan pasar la luz).
export function celosia(aniso) {
  const [c, ctx] = lienzo()
  const pieza = [0.24, 0.11], junta = 0.012, piezasX = 4, hiladas = 8
  const mx = piezasX * (pieza[0] + junta), my = hiladas * (pieza[1] + junta)
  const sx = TAM / mx, sy = TAM / my
  ctx.fillStyle = '#c99a6c'
  ctx.fillRect(0, 0, TAM, TAM)
  for (let j = 0; j < hiladas; j++) {
    const desfase = ((j % 2) * (pieza[0] + junta)) / 2
    for (let i = -1; i <= piezasX; i++) {
      const x = i * (pieza[0] + junta) + desfase + junta / 2, y = j * (pieza[1] + junta) + junta / 2
      // 3 × 2 agujeros por pieza
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 2; b++) {
          ctx.clearRect((x + 0.02 + a * 0.075) * sx, (y + 0.015 + b * 0.045) * sy, 0.055 * sx, 0.035 * sy)
        }
      }
    }
  }
  return textura(c, [mx, my], true, aniso)
}

// Paneles lisos con sus juntas (por defecto 1,20 × 2,40 m).
export function paneles({ color = '#d9d4ca', ancho = 1.2, alto = 2.4, semilla = 8 }, aniso) {
  const [c, ctx] = lienzo(), [cr, rctx] = lienzo(), r = azar(semilla)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, TAM, TAM)
  rctx.fillStyle = '#c8c8c8'
  rctx.fillRect(0, 0, TAM, TAM)
  for (const [cc, tono] of [[ctx, 'rgba(60, 55, 48, 0.45)'], [rctx, '#000']]) {
    cc.fillStyle = tono
    cc.fillRect(0, 0, 3, TAM)
    cc.fillRect(0, 0, TAM, 3)
  }
  ruido(ctx, 6, r)
  return { mapa: textura(c, [ancho, alto], true, aniso), relieve: textura(cr, [ancho, alto], false, aniso) }
}
