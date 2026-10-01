use zixcel_local_registry::{
    ArtifactKind, IMPORT_RECEIPT_SCHEMA, IMPORT_REQUEST_SCHEMA, ImportReceipt, ImportRequest,
    ImportSource, ImportSourceKind, PublicationTarget, RegistryInterfaceKind, RegistryPurpose,
    VerificationState, validate_import_receipt, validate_import_request,
};

const DIGEST: &str = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

#[test]
fn one_contract_covers_development_and_artifact_acquisition_interfaces() {
    let mut request = request(RegistryPurpose::Development);
    assert!(validate_import_request(&request).valid);
    request.purpose = RegistryPurpose::ArtifactAcquisition;
    assert!(validate_import_request(&request).valid);
}

#[test]
fn receipt_must_match_the_requested_artifact_and_targets() {
    let request = request(RegistryPurpose::Development);
    let receipt = receipt(&request);
    assert!(validate_import_receipt(&receipt, &request).valid);
    let mut changed = receipt;
    changed.digest_sha256 =
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee".into();
    assert!(!validate_import_receipt(&changed, &request).valid);
}

#[test]
fn secret_bearing_sources_never_enter_the_local_registry_contract() {
    let mut request = request(RegistryPurpose::Development);
    request.source.reference = "https://example.invalid/artifact?token=hidden".into();
    assert!(!validate_import_request(&request).valid);
}

fn request(purpose: RegistryPurpose) -> ImportRequest {
    ImportRequest {
        schema: IMPORT_REQUEST_SCHEMA.into(),
        request_id: "import-one".into(),
        purpose,
        artifact_kind: ArtifactKind::ApplicationPackage,
        source: ImportSource {
            kind: ImportSourceKind::GithubActionsArtifact,
            reference: "github://owner/repo/actions/runs/1/artifacts/2".into(),
            source_schema: Some("zixcel://github/actions-artifact/v1".into()),
            source_digest_sha256: Some(DIGEST.into()),
        },
        expected_digest_sha256: Some(DIGEST.into()),
        expected_size_bytes: Some(2048),
        publish_targets: vec![
            PublicationTarget {
                interface: RegistryInterfaceKind::FilesystemCas,
                reference: "local-cas://sha256/dddddddd".into(),
            },
            PublicationTarget {
                interface: RegistryInterfaceKind::ArtifactCatalog,
                reference: "artifact-catalog://local/catalog/v2/index.json".into(),
            },
        ],
    }
}

fn receipt(request: &ImportRequest) -> ImportReceipt {
    ImportReceipt {
        schema: IMPORT_RECEIPT_SCHEMA.into(),
        request_id: request.request_id.clone(),
        purpose: request.purpose,
        artifact_kind: request.artifact_kind,
        artifact_id: "application-package-one".into(),
        digest_sha256: DIGEST.into(),
        size_bytes: 2048,
        local_ref: "local-cas://sha256/dddddddd".into(),
        verification_state: VerificationState::Verified,
        reason_id: None,
        publication_targets: request.publish_targets.clone(),
    }
}

#[test]
fn caller_reason_namespaces_are_opaque_and_old_contracts_fail_closed() {
    let request = request(RegistryPurpose::ArtifactAcquisition);
    let mut rejected = receipt(&request);
    rejected.verification_state = VerificationState::Rejected;
    rejected.reason_id = Some("consumer://reason/artifact-rejected/v1".into());
    assert!(validate_import_receipt(&rejected, &request).valid);
    rejected.reason_id = Some("consumer://reason/bad\nreference".into());
    assert!(!validate_import_receipt(&rejected, &request).valid);
    let mut old = request;
    old.schema = "zixcel://local-registry/import-request/v1".into();
    assert!(!validate_import_request(&old).valid);
    assert!(serde_json::from_str::<RegistryInterfaceKind>("\"hatter-ledger\"").is_err());
    assert!(serde_json::from_str::<ArtifactKind>("\"hat-package\"").is_err());
}
