/** Cargo sees a stable logical source while the installer supplies local bytes. */
export function cargoConfiguration(registry, local) {
  for (const value of [registry?.name, registry?.index, local]) {
    if (typeof value !== 'string' || value.includes('"') || value.includes('\n')) invalid()
  }
  return `[registries.${registry.name}]\nindex = "${registry.index}"\n\n`
    + `[source.${registry.name}]\nregistry = "${registry.index}"\n`
    + `replace-with = "${registry.name}-local"\n\n`
    + `[source.${registry.name}-local]\nlocal-registry = "${local}"\n`
}
function invalid() { throw new Error('zixcel-private-registry-config-invalid') }
