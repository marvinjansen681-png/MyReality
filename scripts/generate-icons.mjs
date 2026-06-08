// Generates minimal valid PNG icons for the PWA
// Uses only Node built-ins — no canvas dependency needed
import { createWriteStream } from 'fs'
import { deflateSync } from 'zlib'

function createPNG(width, height) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crcData = Buffer.concat([typeBytes, data])
    const crc = crc32(crcData)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc >>> 0, 0)
    return Buffer.concat([len, typeBytes, data, crcBuf])
  }

  // CRC32
  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      t[i] = c
    }
    return t
  })()

  function crc32(buf) {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff)
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Build raw pixel rows
  // Background: #0a0a0a, draw a centred circle in gold #c9a84c for the "MR" icon
  const rows = []
  const cx = width / 2, cy = height / 2
  const r = width * 0.42  // circle radius
  const gold = [201, 168, 76]
  const bg = [10, 10, 10]
  const ring = [40, 40, 40]

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3)
    row[0] = 0  // filter type None
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      let color
      if (dist < r) {
        // Inside circle — gold
        color = gold
      } else if (dist < r + width * 0.04) {
        // Ring border
        color = ring
      } else {
        color = bg
      }
      const off = 1 + x * 3
      row[off] = color[0]
      row[off + 1] = color[1]
      row[off + 2] = color[2]
    }
    rows.push(row)
  }

  const rawData = Buffer.concat(rows)
  const compressed = deflateSync(rawData)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const sizes = [
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
]

for (const { file, size } of sizes) {
  const png = createPNG(size, size)
  const ws = createWriteStream(file)
  ws.write(png)
  ws.end()
  console.log(`Generated ${file} (${size}x${size})`)
}
