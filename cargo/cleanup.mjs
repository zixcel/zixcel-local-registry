import fs from 'node:fs'
import path from 'node:path'
import { verifyHistoricalGeneration } from './verification.mjs'

/** Removes only closed, verified registry generations while the installer owns its lock. */
export function cleanupLocalRegistry({ store, registry, packageEntries }) {
  const parent = path.dirname(store)
  trusted(parent, true)
  trusted(store, true)
  const generationsRoot = path.join(store, 'generations')
  const stagingRoot = path.join(store, 'staging')
  trusted(generationsRoot, true); trusted(stagingRoot, true)
  trusted(path.join(store, 'install.lock'), false, true)
  const allowed = new Set(['active', 'generations', 'install.lock', 'staging'])
  if (fs.readdirSync(store).some(name => !allowed.has(name))) invalid('store')
  if (fs.readdirSync(stagingRoot).length !== 0) invalid('staging')

  const generations = fs.readdirSync(generationsRoot).sort()
  for (const generation of generations) {
    if (!/^g-[0-9a-f]{64}$/u.test(generation)) invalid('generation')
    verifyHistoricalGeneration(path.join(generationsRoot, generation), registry, packageEntries)
  }
  const active = path.join(store, 'active')
  if (exists(active)) {
    trusted(active, false)
    const selected = fs.readFileSync(active, 'utf8').trim()
    if (!/^g-[0-9a-f]{64}$/u.test(selected)) invalid('active')
  }

  if (exists(active)) fs.unlinkSync(active)
  sync(store)
  for (const generation of generations) {
    fs.rmSync(path.join(generationsRoot, generation), { recursive: true, force: false })
  }
  sync(generationsRoot)
  fs.rmdirSync(stagingRoot); fs.rmdirSync(generationsRoot)
  sync(store)
}

function trusted(current, directory, requireSingleLink = false) {
  const entry = fs.lstatSync(current)
  if (entry.isSymbolicLink() || entry.uid !== process.getuid?.()
    || (entry.mode & 0o777) !== (directory ? 0o700 : 0o600)
    || (directory ? !entry.isDirectory() : !entry.isFile())
    || (requireSingleLink && entry.nlink !== 1)) invalid('ownership')
}
function exists(current) {
  try { fs.lstatSync(current); return true } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}
function sync(current) {
  const descriptor = fs.openSync(current, 'r')
  try { fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
}
function invalid(reason) { throw new Error(`zixcel-private-registry-${reason}-invalid`) }
