# Security policy

## Supported version

Security fixes target the latest code on `main`. Before reporting an issue, check whether it also occurs in the current build; a hosted deployment can lag behind the repository.

## Report a vulnerability privately

Use GitHub's **Report a vulnerability** option in the repository's Security tab when available. If private reporting is unavailable, open an issue requesting a private contact channel without including exploit details or sensitive data.

Include the affected version or commit, browser and operating system, reproduction steps using a small synthetic project, and the expected security impact. Do not include credentials, private repositories, or source code you cannot share.

There is no guaranteed response time. Please give maintainers time to investigate before publishing details.

## Security boundaries

- Local folders and ZIPs are analyzed in the browser. File content is not uploaded by those flows.
- Public GitHub imports make explicit requests to GitHub's API and raw-content host.
- Browser history stores paths, hashes, counts, and comment-marker snippets. Treat exported reports and screenshots as potentially sensitive.
- Source previews display project content as text with syntax highlighting. Scanned code must never be executed.
- ZIP limits, path validation, file-size limits, and default ignore rules reduce resource consumption; scanning arbitrary large projects still uses local memory and CPU.

Dependency auditing is part of CI. A clean audit does not establish that every application behavior is free of vulnerabilities.
