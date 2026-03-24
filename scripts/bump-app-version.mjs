import fs from 'node:fs'
import path from 'node:path'

const target = process.argv[2]

if (!['major', 'minor', 'patch'].includes(target)) {
  console.error('Usage: node scripts/bump-app-version.mjs <major|minor|patch>')
  process.exit(1)
}

const rootDir = process.cwd()
const versionFilePath = path.join(rootDir, 'src/config/appVersion.ts')
const packageJsonPath = path.join(rootDir, 'package.json')

const versionFile = fs.readFileSync(versionFilePath, 'utf8')
const match = versionFile.match(/major:\s*(\d+),[\s\S]*minor:\s*(\d+),[\s\S]*patch:\s*(\d+)/)

if (!match) {
  console.error('Could not parse app version file.')
  process.exit(1)
}

let [major, minor, patch] = match.slice(1).map(Number)

if (target === 'major') {
  major += 1
  minor = 0
  patch = 0
} else if (target === 'minor') {
  minor += 1
  patch = 0
} else {
  patch += 1
}

const nextVersionBlock = [
  'export const APP_VERSION = {',
  `  major: ${major},`,
  `  minor: ${minor},`,
  `  patch: ${patch},`,
  '} as const',
  '',
  'export const APP_VERSION_LABEL = `${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.patch}`',
  '',
].join('\n')

fs.writeFileSync(versionFilePath, nextVersionBlock)

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
packageJson.version = `${major}.${minor}.${patch}`
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

console.log(`Bumped version to ${packageJson.version}`)
