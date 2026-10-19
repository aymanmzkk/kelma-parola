// Generates the PNG app icons into /public without any dependency.
// Runs automatically before "npm run dev" and "npm run build".
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(out, { recursive: true })

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, pixel) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const A = [244, 63, 94] // rose
const B = [253, 186, 116] // warm orange
const lerp = (a, b, t) => a + (b - a) * t

// A white heart on a diagonal gradient. radius = rounded corners (0 = full square).
function icon(size, { scale = 0.42, radius = 0 } = {}) {
  const S = 3
  const r = radius * size
  return png(size, (x, y) => {
    const t = (x + y) / (2 * size)
    let inside = 0
    let white = 0
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const fx = x + (i + 0.5) / S
        const fy = y + (j + 0.5) / S
        const cx = Math.min(Math.max(fx, r), size - r)
        const cy = Math.min(Math.max(fy, r), size - r)
        if ((fx - cx) ** 2 + (fy - cy) ** 2 > r * r) continue
        inside++
        const u = ((fx / size) * 2 - 1) / scale
        const v = (1 - (fy / size) * 2) / scale + 0.12
        const a = u * u + v * v - 1
        if (a * a * a - u * u * v * v * v <= 0) white++
      }
    }
    if (!inside) return [0, 0, 0, 0]
    const w = white / inside
    const rgb = A.map((c, k) => Math.round(lerp(lerp(c, B[k], t), 255, w)))
    return [rgb[0], rgb[1], rgb[2], Math.round((255 * inside) / (S * S))]
  })
}

writeFileSync(join(out, 'pwa-192.png'), icon(192, { radius: 0.22 }))
writeFileSync(join(out, 'pwa-512.png'), icon(512, { radius: 0.22 }))
writeFileSync(join(out, 'maskable-512.png'), icon(512, { scale: 0.32 }))
writeFileSync(join(out, 'apple-touch-icon.png'), icon(180))
console.log('App icons generated in /public')
