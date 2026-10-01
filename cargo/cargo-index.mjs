/** Produces Cargo's closed newline-delimited registry record. */
export function cargoIndexRecord(metadata, checksum, internalPackages = new Map()) {
  if (!identity(metadata?.name) || !version(metadata?.version)
    || !version(metadata?.rust_version) || !/^[0-9a-f]{64}$/u.test(checksum)) invalid()
  // Cargo registry indexes contain runtime/build dependencies. Dev-only
  // fixtures are not part of the install contract and must not become a
  // transitive registry requirement.
  const deps = (metadata.dependencies ?? []).filter(value => value.kind !== 'dev')
    .map(value => dependency(value, internalPackages)).sort(compareDependency)
  return { name: metadata.name, vers: metadata.version, deps, cksum: checksum,
    features: metadata.features ?? {}, yanked: false, links: metadata.links ?? null,
    rust_version: metadata.rust_version, v: 2 }
}

export function cargoIndexPath(name) {
  if (!identity(name)) invalid()
  const value = name.toLowerCase()
  if (value.length === 1) return `1/${value}`
  if (value.length === 2) return `2/${value}`
  if (value.length === 3) return `3/${value[0]}/${value}`
  return `${value.slice(0, 2)}/${value.slice(2, 4)}/${value}`
}

function dependency(value, internalPackages) {
  const cratesIo = 'registry+https://github.com/rust-lang/crates.io-index'
  const internal = internalPackages.get?.(value?.name)
  const privateRegistry = internal !== undefined && value.registry === internal.source
    && value.req === `=${internal.version}`
    && (value.source === internal.source
      || value.source === null && typeof value.path === 'string')
  if (!identity(value?.name) || typeof value.req !== 'string'
    || !(privateRegistry || value.source === cratesIo && value.registry === null)) invalid()
  const renamed = typeof value.rename === 'string' && value.rename !== value.name
  const result = { name: renamed ? value.rename : value.name, req: value.req,
    features: [...(value.features ?? [])].sort(), optional: value.optional === true,
    default_features: value.uses_default_features !== false, target: value.target ?? null,
    kind: value.kind ?? 'normal',
    registry: privateRegistry
      ? (internal.sameRegistry !== false ? null : internal.source)
      : cratesIo.slice('registry+'.length) }
  if (renamed) result.package = value.name
  return result
}

function compareDependency(left, right) {
  return left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind)
}
function identity(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(value)
}
function version(value) {
  return typeof value === 'string' && /^\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?$/u.test(value)
}
function invalid() { throw new Error('zixcel-private-registry-index-invalid') }
