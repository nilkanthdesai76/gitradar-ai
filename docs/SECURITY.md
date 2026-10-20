# SECURITY.md — GitRadar AI Privacy & Security Standard

> Local-first data governance, zero-cloud egress policies, and credential protection for GitRadar AI.

---

## 🔒 1. Zero Cloud Egress Guarantee

GitRadar AI is fundamentally architected to protect intellectual property:
- **No External Network Telemetry**: The application communicates exclusively with `localhost` / `127.0.0.1` endpoints.
- **No Analytics / Tracking**: No usage data, repository names, or telemetry beacons are ever collected or transmitted.
- **Air-Gapped Operation**: Functions completely without active internet connectivity once the local model weights (Qwen 2.5 Coder) are downloaded.

---

## 🛡️ 2. Secret Hygiene & Git Safety

1. **Ignored Sensitive Files**: The workspace scanner and diff analyzer automatically ignore `.env`, `.pem`, `id_rsa`, `.p8`, and common secret files.
2. **Read-Only Stash Safeguard**: Automated repair loops never mutate untracked files or branches without creating a safety rollback stash first.
3. **Execution Sandboxing**: All shell executions are sanitized against command injection by passing arguments as arrays via `child_process.execFile` or `simple-git`.
