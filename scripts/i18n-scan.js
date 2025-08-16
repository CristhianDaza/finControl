import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd(), 'src')
const exts = ['.vue', '.js']
const results = []

const isBinary = (p) => /\.(png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/i.test(p)

const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) walk(p)
    else if (stat.isFile() && exts.includes(path.extname(p)) && !isBinary(p)) scanFile(p)
  }
}

const literalRx = /([>\"])([^<>{}\n]{2,}?)(<|\"|$)/g

const ignore = [
  'aria-hidden', 'role', 'type', 'id', 'name', 'class', 'href', 'src', 'alt="Logo"', 'lang="', 'title-modal', 'show-modal', 'show-modal-'
]

const scanFile = (file) => {
  const src = fs.readFileSync(file, 'utf8')
  if (/t\s*\(/.test(src)) {}
  const lines = src.split(/\r?\n/)
  lines.forEach((line, i) => {
    if (/t\s*\('/.test(line) || /:\s*t\(\'/.test(line)) return
    if (/^\s*\/\//.test(line)) return
    if (/console\.(log|warn|error)/.test(line)) return
    let m
    literalRx.lastIndex = 0
    while ((m = literalRx.exec(line))) {
      const txt = (m[2] || '').trim()
      if (!txt) continue
      if (/^[A-Za-z]{1,3}$/.test(txt)) continue
      if (/^[_\-\w]+$/.test(txt)) continue
      if (/\{\{\s*t\(/.test(line)) continue
      if (ignore.some(k => line.includes(k))) continue
      results.push({ file, line: i + 1, text: txt.slice(0, 120) })
    }
  })
}

walk(root)

if (!results.length) {
  console.log('i18n-scan: No hardcoded strings found.')
  process.exit(0)
}

console.log('Hardcoded strings candidates:')
for (const r of results) {
  console.log(`${r.file}:${r.line}: ${r.text}`)
}
process.exit( results.length ? 1 : 0 )

