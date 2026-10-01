import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { cargoIndexPath, cargoIndexRecord } from './cargo-index.mjs'
import { cargoConfiguration } from './configuration.mjs'
import { verifyGeneration, verifyLocalRegistry } from './verification.mjs'

export { verifyLocalRegistry }

/** Activates an immutable digest generation; existing readers keep their tree. */
export function stageLocalRegistry({ store, registry, packages, availablePackages }) {
  prepareStore(store, registry, packages)
  const temporary = fs.mkdtempSync(path.join(store, 'staging/g-'))
  fs.chmodSync(temporary, 0o700)
  try {
    const privatePackages = availablePackages ?? packages.map(value => value.entry)
    const internalPackages = new Map(privatePackages.map(value => [value.name, {
      ...value, source: value.registry === registry.name ? registry.index : value.source,
      sameRegistry: value.registry === registry.name
    }]))
    const records = packages.map(value => stagePackage(temporary, value, internalPackages))
    const generation = `g-${createHash('sha256').update(JSON.stringify({
      registry: registry.name, index: registry.index, packages: records
    })).digest('hex')}`
    const destination = path.join(store, 'generations', generation)
    writeConfig(temporary, registry, path.join(destination, 'registry'))
    write(path.join(temporary, 'manifest.json'), `${JSON.stringify({
      schema: 'wonderland://rust/private-cargo-registry/v1', generation,
      registry: registry.name, index: registry.index, packages: records
    }, null, 2)}\n`)
    syncTree(temporary)
    if (fs.existsSync(destination)) {
      verifyGeneration(destination, registry, packages.map(value => value.entry))
      fs.rmSync(temporary, { recursive: true, force: false })
    } else {
      fs.renameSync(temporary, destination)
      sync(path.join(store, 'generations'))
    }
    activate(store, generation)
    return { config: verifyLocalRegistry({ store, registry,
      packageEntries: packages.map(value => value.entry) }), packages: records }
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true })
    throw error
  }
}

function stagePackage(root, { entry, metadata, archive }, internalPackages) {
  const expected = `${entry.name}-${entry.version}.crate`
  const source = fs.lstatSync(archive)
  if (!source.isFile() || source.isSymbolicLink() || path.basename(archive) !== expected
    || metadata.name !== entry.name || metadata.version !== entry.version
    || compareVersion(metadata.rust_version, entry.maximumRustVersion) > 0) invalid('package')
  const bytes = fs.readFileSync(archive)
  const checksum = createHash('sha256').update(bytes).digest('hex')
  const registryRoot = path.join(root, 'registry')
  fs.mkdirSync(registryRoot, { recursive: true, mode: 0o700 })
  fs.writeFileSync(path.join(registryRoot, expected), bytes, { mode: 0o600, flag: 'wx' })
  const index = path.join(registryRoot, 'index', cargoIndexPath(entry.name))
  fs.mkdirSync(path.dirname(index), { recursive: true, mode: 0o700 })
  const indexBytes = `${JSON.stringify(cargoIndexRecord(
    metadata, checksum, internalPackages
  ))}\n`
  write(index, indexBytes)
  return { name: entry.name, version: entry.version, checksum,
    indexChecksum: createHash('sha256').update(indexBytes).digest('hex'),
    rustVersion: metadata.rust_version }
}

function writeConfig(root, registry, local) {
  write(path.join(root, 'cargo-config.toml'), cargoConfiguration(registry, local))
}

function prepareStore(store, registry, packages) {
  if (!path.isAbsolute(store) || store === '/' || !Array.isArray(packages) || !packages.length
    || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(registry?.name ?? '')
    || !validSource(registry?.index)) {
    invalid('input')
  }
  fs.mkdirSync(store, { recursive: true, mode: 0o700 })
  const storeEntry = fs.lstatSync(store)
  if (!storeEntry.isDirectory() || storeEntry.isSymbolicLink()
    || storeEntry.uid !== process.getuid?.() || (storeEntry.mode & 0o777) !== 0o700) {
    invalid('store')
  }
  for (const name of ['generations', 'staging']) {
    const directory = path.join(store, name)
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
    const entry = fs.lstatSync(directory)
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.uid !== process.getuid?.()
      || (entry.mode & 0o777) !== 0o700) invalid('store')
  }
}
function validSource(value) {
  if (typeof value !== 'string' || !value.startsWith('sparse+https://')
    || /[\s"\\]/u.test(value) || !value.endsWith('/')) return false
  try {
    const url = new URL(value.slice(7))
    return Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash
  } catch { return false }
}
function activate(store, generation) {
  const temporary = path.join(store, `active.new-${process.pid}`)
  write(temporary, `${generation}\n`); fs.renameSync(temporary, path.join(store, 'active'))
  sync(path.join(store, 'active')); sync(store)
}
function syncTree(current) {
  const entry = fs.lstatSync(current)
  if (entry.isDirectory()) for (const name of fs.readdirSync(current)) syncTree(path.join(current, name))
  sync(current)
}
function sync(value) { const descriptor = fs.openSync(value, fs.statSync(value).isDirectory() ? 'r' : 'r');
  try { fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) } }
function write(file, value) { fs.writeFileSync(file, value, { mode: 0o600, flag: 'wx' }) }
function compareVersion(left, right) {
  const version = /^\d+\.\d+(?:\.\d+)?$/u
  if (typeof left !== 'string' || typeof right !== 'string'
    || !version.test(left) || !version.test(right)) return 1
  const a = left.split('.').map(Number); const b = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0)
  }
  return 0
}
function invalid(reason) { throw new Error(`zixcel-private-registry-${reason}-invalid`) }
