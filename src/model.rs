use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RegistryPurpose {
    Development,
    ArtifactAcquisition,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ArtifactKind {
    CargoCrate,
    ApplicationPackage,
    WorkerPackage,
    LocalModelPackage,
    UiModule,
    SourceSnapshot,
    ProviderArtifact,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ImportSourceKind {
    LocalDirectory,
    LocalRegistry,
    Https,
    GithubRepository,
    GithubActionsArtifact,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RegistryInterfaceKind {
    ProvenanceLedger,
    ArtifactCatalog,
    CargoSparseRegistry,
    NpmRegistry,
    OciRegistry,
    FilesystemCas,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VerificationState {
    Verified,
    Unverified,
    Rejected,
    Expired,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ImportSource {
    pub kind: ImportSourceKind,
    pub reference: String,
    pub source_schema: Option<String>,
    pub source_digest_sha256: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PublicationTarget {
    pub interface: RegistryInterfaceKind,
    pub reference: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ImportRequest {
    pub schema: String,
    pub request_id: String,
    pub purpose: RegistryPurpose,
    pub artifact_kind: ArtifactKind,
    pub source: ImportSource,
    pub expected_digest_sha256: Option<String>,
    pub expected_size_bytes: Option<u64>,
    pub publish_targets: Vec<PublicationTarget>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ImportReceipt {
    pub schema: String,
    pub request_id: String,
    pub purpose: RegistryPurpose,
    pub artifact_kind: ArtifactKind,
    pub artifact_id: String,
    pub digest_sha256: String,
    pub size_bytes: u64,
    pub local_ref: String,
    pub verification_state: VerificationState,
    pub reason_id: Option<String>,
    pub publication_targets: Vec<PublicationTarget>,
}
