# @zixcel/local-registry

Validate imported artifacts and record where they may be distributed and what publication evidence exists.

## What you can do

- Check bounded artifact and publication inputs.
- Represent destinations and publication receipts through a common interface.

## Current scope

Consumer-specific interpretation belongs to the calling application. A publication record does not upload an artifact by itself.

Package distribution is not activated by this documentation. Use the checked-in source and the declared dependency versions; published availability must be verified separately.

## Getting started

Install Rust 1.97 or newer and make the declared dependencies available. Use the configured private registry when a dependency is not distributed publicly. Run from this repository:

```sh
npm install
```

## Documentation and source

[Interface reference](docs/interface-reference.md)

[Usage guide](docs/getting-started.md)

[Implementation and public interfaces](src) · [Verification cases](tests) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [License](LICENSE) · [Attribution notices](NOTICE)
