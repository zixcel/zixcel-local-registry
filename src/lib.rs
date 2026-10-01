#![forbid(unsafe_code)]
#![doc = "Local-first registry contracts without server, credential or package-manager coupling."]

mod model;
mod validation;

pub use model::{
    ArtifactKind, ImportReceipt, ImportRequest, ImportSource, ImportSourceKind, PublicationTarget,
    RegistryInterfaceKind, RegistryPurpose, VerificationState,
};
pub use validation::{ValidationReport, validate_import_receipt, validate_import_request};

pub const IMPORT_REQUEST_SCHEMA: &str = "zixcel://local-registry/import-request/v2";
pub const IMPORT_RECEIPT_SCHEMA: &str = "zixcel://local-registry/import-receipt/v2";
