use crate::{
    IMPORT_RECEIPT_SCHEMA, IMPORT_REQUEST_SCHEMA, ImportReceipt, ImportRequest, VerificationState,
};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ValidationReport {
    pub valid: bool,
    pub findings: Vec<String>,
}

#[must_use]
pub fn validate_import_request(value: &ImportRequest) -> ValidationReport {
    let mut findings = Vec::new();
    if value.schema != IMPORT_REQUEST_SCHEMA || !stable_token(&value.request_id) {
        findings.push("import request identity is invalid".to_owned());
    }
    if !safe_reference(&value.source.reference)
        || value
            .source
            .source_schema
            .as_ref()
            .is_some_and(|schema| !schema_ref(schema))
        || value
            .source
            .source_digest_sha256
            .as_ref()
            .is_some_and(|digest| !lower_hex_32(digest))
        || value
            .expected_digest_sha256
            .as_ref()
            .is_some_and(|digest| !lower_hex_32(digest))
        || value.expected_size_bytes.is_some_and(|size| size == 0)
    {
        findings.push("import request source or expectation is invalid".to_owned());
    }
    validate_targets(&value.publish_targets, &mut findings);
    report(findings)
}

#[must_use]
pub fn validate_import_receipt(value: &ImportReceipt, request: &ImportRequest) -> ValidationReport {
    let mut findings = validate_import_request(request).findings;
    if value.schema != IMPORT_RECEIPT_SCHEMA
        || value.request_id != request.request_id
        || value.purpose != request.purpose
        || value.artifact_kind != request.artifact_kind
        || !stable_token(&value.artifact_id)
        || !lower_hex_32(&value.digest_sha256)
        || value.size_bytes == 0
        || !safe_reference(&value.local_ref)
    {
        findings.push("import receipt identity is invalid".to_owned());
    }
    if request
        .expected_digest_sha256
        .as_ref()
        .is_some_and(|digest| digest != &value.digest_sha256)
        || request
            .expected_size_bytes
            .is_some_and(|size| size != value.size_bytes)
    {
        findings.push("import receipt differs from requested artifact expectation".to_owned());
    }
    if matches!(value.verification_state, VerificationState::Rejected) != value.reason_id.is_some()
    {
        findings.push("import receipt reason state is invalid".to_owned());
    }
    if value
        .reason_id
        .as_ref()
        .is_some_and(|reason| !schema_ref(reason))
    {
        findings.push("import receipt reason is invalid".to_owned());
    }
    if value.publication_targets != request.publish_targets {
        findings.push("import receipt publication targets differ from request".to_owned());
    }
    validate_targets(&value.publication_targets, &mut findings);
    report(findings)
}

fn validate_targets(values: &[crate::PublicationTarget], findings: &mut Vec<String>) {
    if values.is_empty() || values.len() > 16 {
        findings.push("publication targets must contain 1..=16 entries".to_owned());
    }
    let mut targets = std::collections::BTreeSet::new();
    for target in values {
        if !safe_reference(&target.reference)
            || !targets.insert((target.interface, target.reference.as_str()))
        {
            findings.push("publication targets are invalid".to_owned());
        }
    }
}

fn report(mut findings: Vec<String>) -> ValidationReport {
    findings.sort();
    findings.dedup();
    ValidationReport {
        valid: findings.is_empty(),
        findings,
    }
}

fn stable_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 96
        && value
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        && value
            .bytes()
            .last()
            .is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn lower_hex_32(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn schema_ref(value: &str) -> bool {
    let Some((scheme, reference)) = value.split_once("://") else {
        return false;
    };
    !reference.is_empty()
        && safe_reference(value)
        && !scheme.is_empty()
        && scheme.len() <= 32
        && scheme
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_lowercase())
        && scheme.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'+' | b'-' | b'.')
        })
}

fn safe_reference(value: &str) -> bool {
    !value.trim().is_empty()
        && value == value.trim()
        && value.len() <= 512
        && !value.chars().any(char::is_control)
        && !contains_secret_word(value)
}

fn contains_secret_word(value: &str) -> bool {
    let normalized = value.to_ascii_lowercase();
    ["token", "secret", "password", "private-key", "access-key"]
        .iter()
        .any(|word| normalized.contains(word))
}
