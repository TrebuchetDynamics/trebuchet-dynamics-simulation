# Research-forge provenance

Task correlation: `run_id=40a1bd5f`. Human scientific review: **pending**.

## Reproduction

The CLI was available at `/home/xel/.local/bin/rforge`. See `version.json` and `capabilities.json` for the actual version/build and successful capability check. The installed research-forge skill and `rforge --help` were read. No project approval, scientific-review or screening gate was marked as human-approved.

Exact search calls (outputs were private during collection):

```sh
rforge search batch --out .orbi/search --query 'counterweight trebuchet dynamics hinged counterweight sling release equations motion experimental range efficiency' --sources openalex,crossref --limit 12
rforge search batch --out .orbi/focused --queries .orbi/queries.txt --sources openalex,crossref --depth standard --limit 8 --stats
rforge search stats --dir .orbi/search
rforge search stats --dir .orbi/focused
rforge citations expand --source openalex --paper W4323076413 --direction references --depth 1 --out .orbi/expansion/graph.json
rforge --json version
rforge capabilities --json --min-rforge-version 0.1.22 --require search=1 --require paper=1 --require brief=1 --require compare=1 --require provenance=1
```

`queries.txt` preserves all exact queries in execution order: its first line is the initial query; the remaining lines were `.orbi/queries.txt` for the focused batch. The first search used the tool's default standard depth, confirmed by its receipt. OpenAlex and Crossref were deliberately selected rather than a broader source preset. Title screening selected the directly relevant Horsdal mechanics/optimization and experimental papers for full-text reading; discovery results are not an included/approved bibliography. Citation expansion corroborated relevant mechanics references. No exhaustive-coverage claim is made.

## Retained outputs and limitations

| Bundle | Records / deduped | Requests | Stop | Coverage |
| --- | --- | --- | --- | --- |
| `initial/` | 16 / 16 | 2 of 50 | `completed` | One successful query; not saturated |
| `focused/` | 90 / 62 | 12 of 50 | `completed` | Six successful queries; not saturated |
| `graph.json` | Five nodes, four reference edges | At most 1 by expansion budget | Completed successfully | One seed, reference direction, depth 1 |

Each search batch had standard caps of 10 query variants, 5 sources and 50 requests; neither exhausted its budget or reached coverage saturation. The result JSONL files retain the identifiers and source references exactly as emitted. Counts are engine-reported discovery/deduplication counts, not counts of scientifically relevant or full-text-reviewed papers; identical DOIs may remain in the result list. There were no search connector failures. `manifest.json`, `batch-state.json` and `search-stats.txt` retain coverage and stopping evidence.

Original immutable search receipts/events are retained inside each bundle's `provenance/`. Their engine-generated identifiers are tool provenance, not replacement task correlation IDs. Deliberate exclusions: `raw/`, `pdfs/`, PDFs, full texts, duplicate result exports, and transient jobs. **The archived search receipts refer to omitted outputs and are therefore not advertised as independently `engine_verified` exports.** Do not edit them to erase their original checksums. The top-level `provenance.json` instead indexes the retained subset by SHA-256, labels the export/synthesis `agent_reported`, and references only the complete expansion receipt (whose graph and event are retained). Mechanical validation does not approve any scientific claim.

## Reading / acquisition ledger

Full texts were fetched only for selected sources and kept in the excluded run directory; none is committed. Each equation or numeric claim in the model points to the read source or an explicit derivation. Acquisition and interpretation are agent-reported, not human approvals.

| Source / locator | Acquisition and use |
| --- | --- |
| arXiv `2303.01306` / DOI `10.48550/arXiv.2303.01306`, OpenAlex `W4323076413` | Read PDF v1, including geometry, Tables 1–3 and Appendix A. Dimensional presets and phase-model basis. |
| arXiv `2502.19442` / DOI `10.48550/arXiv.2502.19442`, OpenAlex `W4416154417` | Read PDF v2, experimental setup, Tables 1–4, §§3.5–3.7, Appendix B. Complete-machine computed benchmark, measured-motion flight cross-check, friction and release limitations. |
| Cline, LibreTexts §6.3 | Read HTML equations 6.30–6.31, 6.43, 6.45 and constraint/generalized-force discussion; principle for Derived equations. |
| OpenStax, University Physics Volume 1 §6.2 | Read HTML friction laws, Table 6.1, authors/publication metadata and empirical-law limitations. |
| Wikipedia, Friction, revision `1384795959` | Read coefficient table and underlying attribution; secondary wood-on-wood kinetic range only. NASA primary attribution remains unread, explicitly disclosed. |
| NIST, standard acceleration of gravitation, 2022 CODATA | Read numerical value and exact/conventional designation. |
| Denny, DOI `10.1088/0143-0807/26/4/002` | Research-forge discovery and publisher metadata read; not used as full-text evidence. |
| Siano lead, `https://www.algobeautytreb.com/trebmath35.pdf` | Fetch hit the 20-second network guard without receiving bytes. Not retried unchanged and no equation used. |

Ancillary lookups not used as evidence: a LibreTexts mirror friction URL and a guessed Engineering Statics chapter URL returned HTTP 404; USDA Wood Handbook PDF/landing page returned HTTP 403; a NASA NTRS primary-report landing page hit its 20-second network guard. Engineering ToolBox's material table was read but **not** used for a kinetic trough interval because the relevant stone/wood range appeared in the static column. Wikipedia then supplied an explicitly secondary kinetic interval. These acquisition failures are not evidence that the corresponding literature does not exist.

## Verification

```sh
rforge provenance validate docs/research/rforge/provenance.json
```

The expected export level is `agent_reported`. Rendering, structural/link checks and two source-to-claim checks are run evidence, not human scientific review. The model explicitly exposes unsupported slack/recontact states and unset preset fields so a solver author can repair a missing assumption by sourcing, measuring or labelling a tuning value rather than silently inserting a number.
