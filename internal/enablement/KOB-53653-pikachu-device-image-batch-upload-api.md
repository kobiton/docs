<!--
INTERNAL ENABLEMENT NOTE — NOT CUSTOMER-FACING.
Placed under docs/internal/ (outside the Antora build path docs/docs/) so it does
NOT publish to https://docs.kobiton.com. This is a draft for docs-team review via PR.

Robot Ranch classification: Enablement (internal). Ticket KOB-53653 describes an
INTERNAL-ONLY API restricted to the pikachu service account. It is not exposed to
customer/public traffic and has no customer-facing UI, so it does not warrant a
public product-docs page (Ledger skipped) or a customer release note (Town Crier
skipped). See the run report for full routing rationale.

Source evidence: features/KOB-53653-pikachu-upload-device-images-batch/ (feature.md,
blueprint.md) on .ai ref KOB-53653. No Jira MCP fetch and no deployment PR were
available in this run.
-->

# Internal enablement note — batch device-image upload API (pikachu)

**Ticket:** KOB-53653
**Bucket:** Enablement (internal) — Yes, minor
**Audience:** DC / device-lab operations, Technical teams, Support
**Status of feature:** Planned/approved per spec folder. Not confirmed shipped — no deployment PR was available for this note.

## Enablement overview

A new internal API lets the `pikachu` service account upload device images for new device models in a single batch request. Each item maps a device model name to an image. This is internal plumbing for device onboarding — customers never call it directly. Uploaded images surface on the device list through the paired seed/install work (KOB-53652), not through this endpoint alone.

This note exists so device-onboarding, Support, and integrating engineers know the API exists, how it authenticates, and how it reports per-item results.

## Recommended slide sections

- SECTION 1: What shipped and who it's for
- SECTION 2: How it behaves (auth, batch, replace-on-existing, errors)
- SECTION 3: Operational notes and open questions

---

**SECTION 1: What shipped and who it's for**

### Slide 1: New internal API — batch device-image upload

**Audience:**
DC / device-lab operations, Technical teams

**Key message:**
The `pikachu` account can now upload device images for new device models in batches through a single internal API.

**Key capabilities:**
- Batch upload — multiple `{device_name, image_base64, file_name?}` items in one request.
- Maps a device model name to an image; `file_name` is optional and defaults to `<device_name>.png`.
- Accepts `image_base64` as raw base64 or a full `data:` URL; the `data:` prefix is stripped and content type is determined by sniffing the decoded bytes, not the declared type.
- Internal only — not exposed to customer or public traffic, and there is no customer UI.

**Example workflow:**
- During a new-model launch, device-onboarding uploads the model images as one batch. As those models come online, the images join the device list through the paired seed/install work (KOB-53652).

**Suggested visual:**
Request/response envelope (see Slide 3).

**Source tickets:**
KOB-53653 (this API), KOB-53652 (paired seed/install), KOB-53651 (parent epic)

**Open questions:**
- Confirm the endpoint path and method with backend — `POST /v2/device-images` is proposed in the spec, not confirmed shipped.

---

**SECTION 2: How it behaves**

### Slide 2: Authentication and authorization

**Audience:**
Technical teams, Support

**What changed:**
- Authentication accepts Basic Auth or a JWT bearer token.
- Authorization is restricted to the `pikachu` account. Any other authenticated caller is rejected with `403`.

**Why it matters:**
- Support triaging a `403` on this endpoint should first confirm the caller is the `pikachu` account, not another authenticated principal.
- A `401` means missing or invalid credentials (bad Basic Auth, or an invalid/expired JWT).

**Suggested visual:**
None.

**Source tickets:**
KOB-53653

**Open questions:**
- Pikachu credential format is not finalized in the spec (the plan flags a UUID-vs-not decision for the API key). Confirm the exact credential the operator uses before writing an operator runbook.

### Slide 3: Batch behavior, replace-on-existing, and results

**Audience:**
Technical teams, DC

**Key capabilities:**
- Per-item processing: valid items succeed even if others in the same batch fail. There is no all-or-nothing rollback unless the whole request is malformed.
- Replace-on-existing (upsert): uploading for a model that already has an image overwrites it; otherwise the image is created. Both cases are reported as `success`.
- Replacement is per-model and atomic — a failed item never partially overwrites an existing image.

**Response envelope:**
- Every well-formed request returns a `summary` (`total`, `success`, `failed`) plus `results` split into `success` and `failed`.
- `200` when at least one item succeeds (covers all-success and partial-failure).
- `400` when a well-formed request has every item fail (100% per-item failure).
- Per-item failure reasons are `invalid_image` (not an image / unsupported content type) and `storage_error` (object-store upload failed for that item).

**Why it matters:**
- Support and DC reading a batch result should treat a `200` with a populated `failed` array as a partial success, not a full failure.

**Suggested visual:**
Before/after table: partial-failure response vs 100%-failure response.

**Source tickets:**
KOB-53653

**Open questions:**
- None on the documented behavior.

### Slide 4: Wholesale rejection codes

**Audience:**
Technical teams, Support

**Key improvements:**
- `401` — missing or invalid credentials.
- `403` — authenticated but not the `pikachu` account.
- `400` — malformed body, empty `images` array, an item missing `device_name` or `image_base64`, or invalid `image_base64`.
- `413` — batch exceeds the max allowed item count or size.
- `5xx` — systemic failure (for example, object store unavailable) when no items can be processed.

**Operational impact:**
- These codes mean nothing was processed. They are distinct from the per-item `failed` results inside a `200`/`400` envelope.

**Suggested visual:**
None.

**Source tickets:**
KOB-53653

**Open questions:**
- The `413` payload/item-count limit is marked TBD in the spec. Do not publish a specific limit until grooming confirms it.

---

**SECTION 3: Operational notes and open questions**

### Slide 5: What to watch

**Audience:**
DC, Technical teams, Support

**Operational impact:**
- Images uploaded here do not appear on the device list on their own — surfacing depends on the paired seed/install work (KOB-53652) and models coming online.
- Credential handling is a flagged risk: Basic Auth must not leak into logs or response/WebDriver traces. Verify no auth headers echo into responses.

**Speaker notes:**
This is an internal onboarding API, not a customer feature. Frame it for the teams who operate device onboarding and who field Support questions about missing or wrong device images. Avoid presenting it as a customer-facing capability.

**Suggested visual:**
None.

**Source tickets:**
KOB-53653, KOB-53652

**Open questions:**
- Confirmed shipped? No deployment PR was available for this note.
- Final endpoint path/method, pikachu credential format, and the `413` limit are all unconfirmed in the source spec.

## Needs confirmation

- Endpoint path and method (`POST /v2/device-images` is proposed, not confirmed).
- Pikachu credential format used by operators (UUID API key vs Basic Auth).
- Batch item-count / payload-size limit that triggers `413` (marked TBD in the spec).
- Whether the feature has shipped and to which environments — no deployment PR was provided.

## Presenter notes

- Keep this internal. Nothing here is customer-facing; do not repurpose it as public docs or a customer release note without a genuine user-visible surface (that would come from KOB-53652, not this ticket).
- All facts above come from the KOB-53653 spec folder (feature.md, blueprint.md). Items under "Needs confirmation" were flagged as unresolved in that source and need SME review before enablement delivery.
