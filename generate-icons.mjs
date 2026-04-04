// Generates PNG icons using only built-in Node APIs (no canvas dependency)
// Creates a simple SVG, then converts via sharp if available, else writes SVG as fallback

import fs from 'fs'
import path from 'path'

// Simple SVG icon — blue circle with bike emoji
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#3b82f6"/>
  <text x="50%" y="54%" font-size="${size * 0.55}" text-anchor="middle" dominant-baseline="middle" font-family="Arial">🚴</text>
</svg>`

const publicDir = path.join(process.cwd(), 'public')

fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg(192))
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg(512))
console.log('SVG icons written. Converting to PNG...')

// Try sharp
try {
  const sharp = (await import('sharp')).default
  await sharp(Buffer.from(svg(192))).png().toFile(path.join(publicDir, 'icon-192.png'))
  await sharp(Buffer.from(svg(512))).png().toFile(path.join(publicDir, 'icon-512.png'))
  console.log('PNG icons generated via sharp.')
} catch {
  // Fallback: use sips (macOS built-in) on the SVG
  const { execSync } = await import('child_process')
  try {
    execSync(`sips -s format png public/icon-192.svg --out public/icon-192.png`, { stdio: 'inherit' })
    execSync(`sips -s format png public/icon-512.svg --out public/icon-512.png`, { stdio: 'inherit' })
    console.log('PNG icons generated via sips.')
  } catch {
    console.log('Using SVG icons as fallback (rename .svg to .png or use an online converter).')
    fs.copyFileSync(path.join(publicDir, 'icon-192.svg'), path.join(publicDir, 'icon-192.png'))
    fs.copyFileSync(path.join(publicDir, 'icon-512.svg'), path.join(publicDir, 'icon-512.png'))
  }
}
