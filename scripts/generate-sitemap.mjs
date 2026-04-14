import fs from 'node:fs'
import path from 'node:path'

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://stephen-taipei.github.io/awesome-wasm-tools-1000').replace(/\/$/, '')
const today = new Date().toISOString().split('T')[0]
const rootDir = process.cwd()
const publicDir = path.join(rootDir, 'public')

const urls = []

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'public') return
      walk(fullPath)
      return
    }

    if (entry.name === 'index.html') {
      const relative = path.relative(rootDir, fullPath).replace(/\\/g, '/')
      urls.push(relative === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${relative}`)
    }
  })
}

walk(rootDir)

const byMtime = urls
  .map((url) => {
    const relativePath = url === `${siteUrl}/` ? 'index.html' : url.replace(`${siteUrl}/`, '')
    const stats = fs.statSync(path.join(rootDir, relativePath))
    return { url, mtime: stats.mtimeMs }
  })
  .sort((a, b) => b.mtime - a.mtime)

const toXml = (items) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items
    .map((item) => `  <url>\n    <loc>${item.url || item}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join('\n')}\n</urlset>\n`

fs.mkdirSync(publicDir, { recursive: true })
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), toXml(urls), 'utf8')
fs.writeFileSync(path.join(publicDir, 'news-sitemap.xml'), toXml(byMtime.slice(0, 50)), 'utf8')

console.log(`Generated sitemap.xml with ${urls.length} URLs.`)

