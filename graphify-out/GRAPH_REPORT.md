# Graph Report - Apotek  (2026-11-08)

## Corpus Check
- Large corpus: 164 files · ~3,851,088 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 875 nodes · 1493 edges · 65 communities (63 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 60

## God Nodes (most connected - your core abstractions)
1. `formatMoney()` - 23 edges
2. `formatMoney()` - 23 edges
3. `switchView()` - 22 edges
4. `switchView()` - 22 edges
5. `getPonytailInstructions()` - 15 edges
6. `closeModal()` - 14 edges
7. `closeModal()` - 14 edges
8. `_fail()` - 13 edges
9. `_ok()` - 13 edges
10. `ponytailExtension()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `readMode()` --calls--> `normalizePersistedMode()`  [EXTRACTED]
  .opencode/plugins/ponytail.mjs → hooks/ponytail-config.js
- `parsePonytailCommand()` --calls--> `normalizeMode()`  [EXTRACTED]
  pi-extension/index.js → hooks/ponytail-config.js
- `resolveMode()` --calls--> `normalizeMode()`  [EXTRACTED]
  ponytail-mcp/instructions.js → hooks/ponytail-config.js
- `ponytailExtension()` --calls--> `isDeactivationCommand()`  [EXTRACTED]
  pi-extension/index.js → hooks/ponytail-config.js
- `ponytailExtension()` --calls--> `getDefaultMode()`  [EXTRACTED]
  pi-extension/index.js → hooks/ponytail-config.js

## Import Cycles
- None detected.

## Communities (65 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (36): allPasienList, calcAddMargin(), calculateTagihanRemainingDisplay(), cart, closeCameraScanner(), currentLaporanData, currentPatientCheckupData, currentReturItems (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (36): allPasienList, calcAddMargin(), calculateTagihanRemainingDisplay(), cart, closeCameraScanner(), currentLaporanData, currentPatientCheckupData, currentReturItems (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (40): assert, claudeEnv, codexData, codexEnv, codexState, copilotData, customConfigDir, { DEFAULT_MODE, getDefaultMode, isShellSafe, writeDefaultMode } (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (31): aggregate(), chat_code_loc(), _claude_version(), code_stats(), _count(), _git(), git_diff_stats(), _git_snapshot() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): { checkPy, pyBlock, TASKS }, email, fs, kv, MODELS, path, skill, { checkPy, pyBlock, TASKS } (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (28): _contained(), _fail(), _find(), _find_class(), _import(), _import_pkg(), _ok(), Path (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (17): CHECKS, correctnessTimeoutMs(), exec(), { execSync }, fs, os, path, python() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (21): Any, build_injected_context(), _config_dir(), _default_mode(), _fallback_instructions(), _filter_skill_body_for_mode(), _handle_mode_command(), _make_skill_command_handler() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (22): calculateReturTotal(), escapeHtml(), formatMoney(), loadCekHargaList(), loadDokumentasiFaktur(), loadKasLedger(), loadRiwayatPenjualan(), loadTagihanData() (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (22): calculateReturTotal(), escapeHtml(), formatMoney(), loadCekHargaList(), loadDokumentasiFaktur(), loadKasLedger(), loadRiwayatPenjualan(), loadTagihanData() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (21): calcEditMargin(), closeModal(), deleteObat(), deletePelanggan(), deleteSupplier(), editObat(), getExpBadge(), getLocalObatEd() (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (19): main(), parse_complete(), _rank_ok(), scores: {(task_id, label): {SCORE_KEY: int}}. For each task the 'complete'…, Live: the judge model must rank each complete ref above its stub., No API, no key: prove the GATE catches under-delivery. A well-ordered matrix…, run(), selftest() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (14): getQuietStartup(), normalizeConfigMode(), normalizePersistedMode(), RUNTIME_MODES, {
  DEFAULT_MODE,
  RUNTIME_MODES,
  getDefaultMode,
  getQuietStartup,
  getHideStatus,
  normalizeMode,
  normalizePersistedMode,
  isDeactivationCommand,
  writeDefaultMode,
}, { getPonytailInstructions, filterSkillBodyForMode }, parsePonytailCommand(), ponytailExtension() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (21): calcEditMargin(), closeModal(), deleteObat(), deletePelanggan(), deleteSupplier(), editObat(), getExpBadge(), getLocalObatEd() (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (18): assert, claudeDir, configDir, configPath, env, flagPath, fs, home (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (17): isDeactivationCommand(), writeDefaultMode(), { clearMode, isQoder, readMode, setMode, writeHookOutput }, finish(), { getDefaultMode, isDeactivationCommand, writeDefaultMode }, { getPonytailInstructions }, clearMode(), fs (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (17): checkSession(), clearPin(), closeMobileSidebar(), getInitialDefaultView(), initLaporanView(), loadAllDropdowns(), loadDashboard(), loadInfoStats() (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (17): checkSession(), clearPin(), closeMobileSidebar(), getInitialDefaultView(), initLaporanView(), loadAllDropdowns(), loadDashboard(), loadInfoStats() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (16): addToCart(), changeCartQty(), changeCartUnit(), clearCart(), getPriceForLevel(), initPOS(), posChangeCustomer(), posCheckout() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (14): normalizeMode(), { DEFAULT_MODE, normalizeMode, normalizePersistedMode }, filterSkillBodyForMode(), fs, getFallbackInstructions(), getPonytailInstructions(), INDEPENDENT_MODES, path (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (16): addToCart(), changeCartQty(), changeCartUnit(), clearCart(), getPriceForLevel(), initPOS(), posChangeCustomer(), posCheckout() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (12): fs, getClaudeDir(), getConfigDir(), getConfigPath(), getHideStatus(), os, path, VALID_MODES (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (13): @modelcontextprotocol/sdk, dependencies, @modelcontextprotocol/sdk, zod, description, license, name, private (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (12): DESCRIPTIONS, fs, NAMES, outPath(), path, render(), ROOT, sourceBody() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (10): isHaiku(), j, meta, pick(), rows, tbl, assert, cases (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (12): checkSupabaseConfig(), deleteUser(), filterUserManagementTable(), filterUserRole(), hideSupabaseConfigForm(), loadLoginUsers(), loadUserManagement(), renderUserManagementTable() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): getDefaultMode(), __dirname, parseCommandFile(), { getDefaultMode, normalizePersistedMode }, { getPonytailInstructions }, { parseCommandFile }, readMode(), require (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (9): modeArg, server, { version }, buildInstructions(), { getDefaultMode, normalizeMode }, { getPonytailInstructions }, MODES, require (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (12): checkSupabaseConfig(), deleteUser(), filterUserManagementTable(), filterUserRole(), hideSupabaseConfigForm(), loadLoginUsers(), loadUserManagement(), renderUserManagementTable() (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (9): agents, canonical, copies, fs, INVARIANTS, path, root, skill (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (11): assert, fs, loadManifest(), path, read(), REUSED_COMMANDS, REUSED_SKILLS, root (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (11): assert, commands, fs, os, path, python(), pythonExe(), root (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (10): claudeDir, {
  clearMode,
  isCodex,
  isCopilot,
  setMode,
  writeHookOutput,
}, fs, { getDefaultMode, getClaudeDir, isShellSafe }, { getPonytailInstructions }, mode, output, path (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.20
Nodes (9): app, { DatabaseSync }, db, dbPath, express, fs, path, queryAll() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (7): fs, passthrough, path, root, skillsDir, slugs, { spawnSync }

### Community 35 - "Community 35"
Cohesion: 0.20
Nodes (8): assert, fs, os, path, { pathToFileURL }, statePath, test, tmp

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (9): addPurchaseItemToGrid(), initPembelian(), initStokOpname(), populateObatDropdown(), removePurchaseItem(), renderPurchaseGrid(), submitPurchaseInvoice(), submitStokOpname() (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (9): addPurchaseItemToGrid(), initPembelian(), initStokOpname(), populateObatDropdown(), removePurchaseItem(), renderPurchaseGrid(), submitPurchaseInvoice(), submitStokOpname() (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (7): assert, fs, HOST_PLUGIN_MANIFESTS, path, root, { spawn }, test

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (8): checkupChangePasien(), filterCheckupHistoryList(), filterCheckupPasienDropdown(), initCekKesehatan(), populatePasienDropdown(), renderCheckupHistoryCards(), submitAddPasien(), submitCheckup()

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (5): CHECKS, assert, behavior, check(), test

### Community 41 - "Community 41"
Cohesion: 0.39
Nodes (7): call_ollama(), count_loc(), load_arms(), main(), Ponytail local benchmark — runs the same 5 tasks against any Ollama model. No…, Non-blank, non-comment lines of code: fenced blocks, or the whole response when…, run()

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): description, name, owner, name, url, plugins, $schema

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (8): checkupChangePasien(), filterCheckupHistoryList(), filterCheckupPasienDropdown(), initCekKesehatan(), populatePasienDropdown(), renderCheckupHistoryCards(), submitAddPasien(), submitCheckup()

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (7): distinct, fs, path, readVersion(), root, VERSION_FILES, versions

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (7): assert, commands, fs, path, piSource, root, test

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (6): assert, fs, path, REQUIRED_COMMAND_FILES, root, test

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (6): assert, fs, path, root, SKILL_DIRS, test

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (5): name, private, scripts, build, version

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): name, private, scripts, test, type

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): assert, fs, path, root, test

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (5): assert, fs, path, root, test

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): fs, path, system

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): fs, path, system

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): plugin, $schema, ./.opencode/plugins/ponytail.mjs

## Knowledge Gaps
- **300 isolated node(s):** `$schema`, `name`, `description`, `name`, `url` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDefaultMode()` connect `Community 26` to `Community 32`, `Community 2`, `Community 12`, `Community 15`, `Community 21`, `Community 27`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `getPonytailInstructions()` connect `Community 19` to `Community 32`, `Community 12`, `Community 15`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `ponytailExtension()` connect `Community 12` to `Community 26`, `Community 19`, `Community 21`, `Community 15`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `$schema`, `name`, `description` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04935064935064935 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04935064935064935 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._