# zixcel-local-registry interface reference

Use the [usage guide](getting-started.md) for the first steps. This reference preserves the current interface details and operational limits. Run command examples from the repository root, after preparing the exact declared dependencies and registered configuration.

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
