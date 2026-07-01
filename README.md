# 🪶 Quill

![Banner](./assets/banner.png)

![Node.js](https://img.shields.io/badge/Node.js-v20+-6CC24A?style=for-the-badge&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Judge0](https://img.shields.io/badge/code_execution-Judge0-2DA581?style=for-the-badge&logo=codeforces&logoColor=white)
![Inference](https://img.shields.io/badge/inference-Groq-F43E01?style=for-the-badge&logo=lightning&logoColor=white)
![RDAP](https://img.shields.io/badge/network-RDAP-0A66C2?style=for-the-badge&logo=icloud&logoColor=white)
![Firebase](https://img.shields.io/badge/backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/prs-welcome-brightgreen?style=for-the-badge&logo=github&logoColor=white)

Quill is an advanced Discord developer assistant bot built to help programmers code faster, learn better, and debug smarter, directly inside Discord. It combines secure sandboxed code execution, AI insights, instant documentation lookup, and robust developer tooling into one streamlined workflow.

## 🚀 Key Features

- **Sandbox Code Execution:** Compile and run snippets across 60+ languages with live output/error reporting via Judge0.
- **Groq-Powered AI Assistant:** Estimate complexity, patch syntax errors, and receive production-grade code suggestions on demand.
- **Instant Documentation & Package Search:** Query MDN Web Docs, Wikipedia, npm, and PyPI directly within your chat channels.
- **Advanced Dev Utilities:** Format code with Prettier, audit URLs for safety, inspect API responses, and run WHOIS or Snowflake lookups natively.

## 📌 Commands Guide

All commands use the `;` prefix (e.g., `;run`). Premium features are marked with a `★`.

> [!NOTE]
> Premium features are completely free to use! To unlock them anywhere, simply be a member of the official **DevHub** Discord server to support the bot's development.

### 💻 Code Sandbox

| Command       | Description                                                             |
| :------------ | :---------------------------------------------------------------------- |
| `;complexity` | Estimate the Big-O time and space complexity of a code snippet.         |
| `;format`     | Pretty-print and format unorganized code blocks using Prettier.         |
| `;run`        | Execute code snippets instantly in a secure sandbox environment.        |
| `;suggest` ★  | Get concise, AI-driven suggestions and improvements for a code snippet. |
| `;whatlang`   | Automatically detect the programming language of a raw code snippet.    |

### 📚 Documentation & Reference

| Command | Description                                                       |
| :------ | :---------------------------------------------------------------- |
| `;mdn`  | Search the MDN Web Docs for JavaScript, HTML, and CSS references. |
| `;wiki` | Search and retrieve concise abstracts from Wikipedia articles.    |

### 🐙 GitHub Integration

| Command    | Description                                                                  |
| :--------- | :--------------------------------------------------------------------------- |
| `;profile` | Fetch detailed statistics, repository counts, and bios for a GitHub user.    |
| `;repo`    | Get overview metrics (stars, forks, open issues) for a specified repository. |
| `;tree` ★  | Generate a structured visual directory tree for a GitHub repository.         |

### 🔢 Mathematics

| Command           | Description                                                                    |
| :---------------- | :----------------------------------------------------------------------------- |
| `;math-breakdown` | Provides a clear, step-by-step logical breakdown of a mathematical expression. |

### 🔍 Package Search

| Command | Description                                                              |
| :------ | :----------------------------------------------------------------------- |
| `;npm`  | Query the npm registry for package metadata, dependencies, and versions. |
| `;pip`  | Search the PyPI registry for Python package information.                 |

### 🛠️ Developer Tools

| Command      | Description                                                                           |
| :----------- | :------------------------------------------------------------------------------------ |
| `;color`     | Preview exact hexadecimal/RGB colors and custom CSS gradients.                        |
| `;http`      | Perform lightweight HTTP requests and inspect responses (headers, payload).           |
| `;id`        | Generate cryptographic or specific system unique IDs across 60+ formats.              |
| `;regex`     | Test, debug, and break down regular expression match patterns.                        |
| `;scan` ★    | Scan and audit a URL to evaluate if it is suspicious or unsafe.                       |
| `;snowflake` | Decode a Discord Snowflake ID to extract its precise creation timestamp and metadata. |
| `;whois`     | Perform a standard WHOIS lookup on domains to review registrar and ownership info.    |

### ⚙️ System & Support

| Command      | Description                                                                      |
| :----------- | :------------------------------------------------------------------------------- |
| `;changelog` | View the latest updates, bug fixes, and version history for Quill.               |
| `;github`    | View the official open-source GitHub repository details for the Quill bot.       |
| `;help`      | Display interactive menus outlining available commands and exact usage profiles. |
| `;ping`      | Check API latency, processing metrics, and Discord Gateway websocket health.     |
| `;feature`   | Submit an authorized feature request directly to the development team.           |
| `;report`    | File a bug report or performance issue directly from your server.                |

## ⚡ Tech Stack

- **Runtime:** Bun / Node.js (v20+)
- **Framework:** Discord.js (v14)
- **Code Intelligence:** Groq SDK (Llama-3.3-70b-versatile)
- **Execution System:** Judge0 API
- **Data Sources:** MDN REST, Wikipedia API, GitHub REST API, RDAP Network Protocol

## 📄 License

This project is open-source and licensed under the **GPL-3.0 License**. For more terms and conditions, check out the accompanying [LICENSE](./LICENSE) file.

© 2026 DevHub. All rights reserved.
