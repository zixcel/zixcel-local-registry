# zixcel-local-registry

`zixcel-local-registry` defines bounded artifact import and publication contracts.
Callers own domain-specific artifact kinds, acquisition policies, provenance
semantics and catalog mappings. Requests distinguish development from artifact
acquisition and describe neutral application, worker, model and source artifacts.
Publication targets identify provenance ledgers, artifact catalogs, Cargo, npm,
OCI or filesystem storage interfaces.

The Rust contract validates requests and matching receipts. Separate workers
own import, storage and publication operations. Reason and source-schema
references are bounded URI identifiers; callers validate their vocabulary and
authorization before invoking the provider.

Contract schemas use version 2. Prior version 1 messages and product-specific
serialized variants are rejected. Callers must explicitly translate their domain
model when constructing new requests; stored data is never reset automatically.

```bash
cargo test
```

## Implemented offline Cargo storage

The separate `@zixcel/local-registry` Node package (0.10.0) owns immutable Cargo
archive/index generations, checksum verification, atomic activation and explicit
cleanup. It uses Node built-ins only. It is not an HTTP registry server.
Development composition supplies packaged archives, explicit logical registry
sources and dependency metadata; source checkout paths never enter consumers.
Consumers install a packed tar archive with an integrity-locked package manager,
not a link to this repository. Cargo itself verifies archive checksums.

Registry source URLs identify Cargo sources; they do not imply an online server.
The generated Cargo configuration replaces each source with its verified local
generation. The caller must serialize mutations to the same store. Existing
readers retain their selected immutable generation; cleanup is a separate action.

The packaged storage API can be verified in temporary stores with offline Cargo consumers, archive integrity checks and deliberate corruption fixtures.

## Package integration

The package is an independently consumable unit. Callers reference its documented
interface through a versioned dependency and own application-specific composition
and integration.
