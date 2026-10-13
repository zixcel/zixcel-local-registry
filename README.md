# @zixcel/local-registry

Validate imported artifacts and record where they may be distributed and what publication evidence exists.

## What you can do

- Check bounded artifact and publication inputs.
- Represent destinations and publication receipts through a common interface.

## Current scope

Consumer-specific interpretation belongs to the calling application. A publication record does not upload an artifact by itself.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

Install Rust 1.97 or newer and make the declared dependencies available. Resolve declared third-party dependencies from public registries and source-only managed components from their fixed public Git revision. No private registry or adjacent checkout is part of the supported OSS source path. Run from this repository:

```sh
cargo test --locked
```

The Rust contracts are source-only (`publish=false`); no private publication route is configured. The separate Node built-in-only exports describe offline artifact generations and do not connect to a private registry service.

## Documentation and source

[Interface reference](docs/interface-reference.md)

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](tests) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)

[OSS responsibility and source completion](docs/oss-source-contract.md) defines the supported package boundary and required acceptance. It does not declare unexecuted source, distribution or production checks complete.
