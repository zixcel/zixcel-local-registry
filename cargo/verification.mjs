import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { cargoIndexPath } from './cargo-index.mjs'
import { cargoConfiguration } from './configuration.mjs'

export function verifyLocalRegistry({ store, registry, packageEntries }) {
  trusted(store, true)
  trusted(path.join(store, 'generations'), true)
  const pointer = path.join(store, 'active')
  trusted(pointer, false)
  const generation = fs.readFileSync(pointer, 'utf8').trim()
  if (!/^g-[0-9a-f]{64}$/u.test(generation)) invalid('active')
  const root = path.join(store, 'generations', generation)
  verifyGeneration(root, registry, packageEntries)
  return path.join(root, 'cargo-config.toml')
}

export function verifyGeneration(root, registry, packageEntries) {
  verifyGenerationWithVersions(root, registry, packageEntries, false)
}

export function verifyHistoricalGeneration(root, registry, packageEntries) {
  verifyGenerationWithVersions(root, registry, packageEntries, true)
}

function verifyGenerationWithVersions(root, registry, packageEntries, historical) {
  trustedTree(root)
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))
  if (Object.keys(manifest).sort().join(',') !== 'generation,index,packages,registry,schema'
    || manifest.schema !== 'wonderland://rust/private-cargo-registry/v1'
    || path.basename(root) !== manifest.generation || manifest.registry !== registry.name
    || manifest.index !== registry.index || !Array.isArray(manifest.packages)
    || (!historical && manifest.packages.length !== packageEntries.length)
    || (historical && (manifest.packages.length === 0
      || manifest.packages.length > packageEntries.length))) invalid('manifest')
  const entries = historical ? manifest.packages.map(record => {
    const entry = packageEntries.find(value => value.name === record.name)
    if (!entry) invalid('manifest')
    return entry
  }) : packageEntries
  if (new Set(manifest.packages.map(record => record.name)).size !== manifest.packages.length) {
    invalid('manifest')
  }
  for (const entry of entries) {
    const record = manifest.packages.find(value => value.name === entry.name)
    const effective = historical && typeof record?.version === 'string'
      ? { ...entry, version: record.version } : entry
    verifyPackage(root, effective, manifest.packages)
  }
  const expectedConfig = cargoConfiguration(registry, path.join(root, 'registry'))
  if (fs.readFileSync(path.join(root, 'cargo-config.toml'), 'utf8') !== expectedConfig) {
    invalid('config')
  }
  verifyGenerationDigest(manifest, historical)
}

function verifyPackage(root, entry, records) {
  const record = records.find(value => value.name === entry.name)
  const archive = path.join(root, 'registry', `${entry.name}-${entry.version}.crate`)
  const checksum = createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
  const index = path.join(root, 'registry/index', cargoIndexPath(entry.name))
  const indexBytes = fs.readFileSync(index)
  const indexChecksum = createHash('sha256').update(indexBytes).digest('hex')
  const indexed = JSON.parse(indexBytes)
  if (!record
    || Object.keys(record).sort().join(',') !== 'checksum,indexChecksum,name,rustVersion,version'
    || record.version !== entry.version || record.checksum !== checksum
    || record.indexChecksum !== indexChecksum
    || compareVersion(record.rustVersion, entry.maximumRustVersion) > 0
    || indexed.name !== entry.name || indexed.vers !== entry.version
    || indexed.cksum !== checksum || indexed.rust_version !== record.rustVersion) invalid('digest')
}
function verifyGenerationDigest(manifest, historical) {
  const expected = `g-${createHash('sha256').update(JSON.stringify({
    registry: manifest.registry, index: manifest.index, packages: manifest.packages
  })).digest('hex')}`
  const legacy = manifest.packages.some(record => manifest.generation === `g-${record.checksum}`)
  if (manifest.generation !== expected && !(historical && legacy)) invalid('generation')
}
function trustedTree(current) {
  trusted(current, true)
  for (const name of fs.readdirSync(current)) {
    const child = path.join(current, name); const entry = fs.lstatSync(child)
    if (entry.isDirectory()) trustedTree(child)
    else trusted(child, false)
  }
}
function trusted(current, directory) {
  const entry = fs.lstatSync(current)
  if (entry.isSymbolicLink() || entry.uid !== process.getuid?.()
    || (entry.mode & 0o777) !== (directory ? 0o700 : 0o600)
    || (directory ? !entry.isDirectory() : !entry.isFile())) {
    invalid('ownership')
  }
}
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
