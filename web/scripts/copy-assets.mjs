import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const publicDir = path.resolve(__dirname, '../public')

const dataFiles = [
  'data/champions/reg-mb/pokemon.json',
  'data/champions/reg-mb/meta-usage.json',
  'data/champions/reg-mb/type-chart.json',
  'data/champions/reg-mb/i18n/en/ui.json',
  'data/champions/reg-mb/i18n/en/pokemon.json',
  'data/champions/reg-mb/i18n/en/types.json',
  'data/champions/reg-mb/i18n/zh-Hans/ui.json',
  'data/champions/reg-mb/i18n/zh-Hans/pokemon.json',
  'data/champions/reg-mb/i18n/zh-Hans/types.json',
  'data/champions/reg-mb/i18n/zh-Hant/ui.json',
  'data/champions/reg-mb/i18n/zh-Hant/pokemon.json',
  'data/champions/reg-mb/i18n/zh-Hant/types.json',
  'data/champions/reg-mb/i18n/ja/ui.json',
  'data/champions/reg-mb/i18n/ja/pokemon.json',
  'data/champions/reg-mb/i18n/ja/types.json',
]

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

ensureDir(publicDir)

for (const rel of dataFiles) {
  const src = path.join(root, rel)
  const dest = path.join(publicDir, rel)
  ensureDir(path.dirname(dest))
  cpSync(src, dest)
}

const pokemon = JSON.parse(
  readFileSync(path.join(root, 'data/champions/reg-mb/pokemon.json'), 'utf8'),
)

const spriteSrcDir = path.join(root, 'assets/sprites/pokemon')
const spriteDestDir = path.join(publicDir, 'assets/sprites/pokemon')
ensureDir(spriteDestDir)

for (const mon of pokemon) {
  const file = `${mon.id}.png`
  const src = path.join(spriteSrcDir, file)
  if (existsSync(src)) {
    cpSync(src, path.join(spriteDestDir, file))
  }
}

const typeSrcDir = path.join(root, 'assets/sprites/types')
const typeDestDir = path.join(publicDir, 'assets/sprites/types')
ensureDir(typeDestDir)
cpSync(typeSrcDir, typeDestDir, { recursive: true })

console.log('Copied data and sprites into web/public')
