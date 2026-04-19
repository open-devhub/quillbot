# 🖋️ Quill Bot

Quill Bot is a versatile assistant designed for developers, students, and problem‑solvers. It can:

- ⚡ Compile code snippets
- 🚩 Detect programming languages from a codeblock
- 💡 Suggest code improvements
- 🔢 Break down mathematical expressions step‑by‑step

## 🚀 Features

- **Code Compilation**: Run code directly from chat using `;run`.
- **Language Detecting**: Detect programming languages from code block using `;whatlang`
- **Code Suggestions**: Get improvements or alternative approaches using `;suggest`.
- **Math Breakdown**: Simplify and explain math expressions step‑by‑step with `;math`.

## 📦 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/quillbot.git
cd quillbot
npm install
```

## 🛠️ Example Usage

### Code Compilation

;run

```py
for i in range(0, 10):
    print(i)
```

### Code Suggestion

;suggest

```c
struct leaf_text_defines {
        size_t tlen;
        size_t nlen;
        const char *text;
        const char *name;
        struct leaf_text_slot slots[];
};

struct leaf_text {
        size_t dlen;
        struct leaf_text_defines defines[];
};
```

> [!NOTE]
> You should specify the language type in the codeblock, ie. ```[lang]

### Math Breakdown

```
;math √3x-1 + (1 + x)²
```

## ⚖️ License

Quill Bot is released under the **DevHub Source-Available License (DSAL)**.

You are free to view, study, modify, and contribute to the code.
Commercial use, re-hosting, and production deployment are **not allowed**

See the `LICENSE` file for full terms.
