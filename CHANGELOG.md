# Change Log

## `v1.1.1` - 2026-07-13

### Fixed

- Normalize `git://` repository URLs for Discord links in `npm` command
- Optimize `run` command and expand its judge0 language alias map
- Harden `http` command against SSRF and DoS
- Fix reDoS risk from unrestricted user-controlled RegExp

### Contributors

- [@calebephrem](https://github.com/calebephrem)
- [@gitcommit90](https://github.com/gitcommit90)

## `v1.1.0` - 2026-07-02

### Added

- Full interaction handler system with file-based routing
- New `man` command for viewing Unix/Linux manual pages for command documentation
- New `crate` command to search Rust crates
- New `gem` command to search Ruby gems
- New `base64` command encode or decode Base64 strings

### Changed

- Updated the `changelog` command to use a `StringSelectMenuBuilder` instead of just showing the latest version
- Both the command and interaction handler now parse `CHANGELOG.md` dynamically
- Updated `profile` command to include a visual GitHub contribution activity graph in the embed response

## `v1.0.0` - 2026-07-01

### Added

- **Initial Release**: Launched Quill, an advanced TypeScript and Bun-powered developer assistant bot for Discord.
- **Code Execution Sandbox**: Integrated an isolated runtime environment to compile and execute snippets in dozens of programming languages directly within text channels.
- **AI Coding Intelligence**: Added AI-driven features for calculating algorithmic complexity, generating code optimizations, and analyzing syntax errors.
- **Documentation & Package Search**: Implemented direct reference lookups for web documentation, encyclopedia summaries, and major software package registries.
- **GitHub Integrations**: Added capabilities to fetch user profiles, review repository metadata, and generate visual directory trees.
- **Developer Utility Suite**: Introduced a robust collection of tools for code formatting, HTTP response parsing, regex testing, cryptographic ID generation, color validation, and metadata decoding.
- **Security Auditing**: Embedded a URL inspection utility to evaluate links for potential safety risks.
- **Community-Tier Access**: Implemented a server-membership verification system to seamlessly unlock premium commands for community supporters.

### Contributors

- [@calebephrem](https://github.com/calebephrem)
- [@joshdegr8](https://github.com/joshdegr8)
- [@louiszn](https://github.com/louiszn)
- [@skullvension](https://github.com/skullvension)
