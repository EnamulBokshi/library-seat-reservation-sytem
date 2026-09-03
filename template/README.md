# Universal DIU FYDP / Thesis LaTeX Template (Standalone Package)

A complete, self-contained, publication-ready **Daffodil International University (DIU)** Final Year Design Project (FYDP) / Undergraduate Thesis template package.

---

## 🌟 What Makes This Standalone?
- **Zero External Path Dependencies**: Everything is self-contained within this folder (including `media/` assets, modular `chapters/`, and build tools).
- **Built-in `compiler.py`**: A cross-platform CLI tool to compile to **PDF** and **Word (.docx)** with 2-pass execution and automatic cleanup.
- **Century Font Family (`tgschola`)**: Pre-configured to match official DIU typography.
- **BAETE / Washington Accord Compliant**: Pre-formatted tables for **Complex Engineering Problems (EP1–EP7)**, **Knowledge Profile (K1–K8)**, and **Complex Engineering Activities (EA1–EA5)**.
- **IEEE Reference Format**: Standard IEEE bibliography structure.

---

## 📁 Package Directory Layout

```
template/
├── main.tex                                  # Master Compiler Driver
├── compile.py                                # Standalone PDF & DOCX Builder
├── README.md                                 # Guide & instructions
├── media/                                    # Local Images & Logos
│   ├── image1.jpeg                           # DIU Crest Logo
│   ├── image2.png                            # Architecture Diagram Placeholder
│   └── final_ERD.png                         # Database ERD Placeholder
└── chapters/                                 # Official DIU 6-Chapter Modules
    ├── 00_frontmatter.tex                    # Title Page, Approval, Declaration, Abstract, TOC
    ├── 01_introduction.tex                   # Chapter 1: Introduction
    ├── 02_background_literature.tex          # Chapter 2: Background & Literature Review
    ├── 03_research_methodology_system_design.tex # Chapter 3: Research Methodology & System Design
    ├── 04_implementation_results.tex         # Chapter 4: Implementation, Testing, and Results
    ├── 05_engineering_standards_design_challenges.tex # Chapter 5: Engineering Standards (EP/K/EA)
    ├── 06_conclusion.tex                     # Chapter 6: Conclusion (Summary, Limitation, Future Work)
    └── 07_references.tex                     # References (Strict IEEE Format)
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Copy this folder
Copy the `template/` folder to your workspace and rename it to your project name:
```bash
cp -r latex/template/ my_thesis_project/
cd my_thesis_project/
```

### Step 2: Edit your details
1. Open `chapters/00_frontmatter.tex` and replace:
   - `[PROJECT TITLE LINE 1]`
   - `[Student 1 Full Name]`, `[Student 1 ID]`
   - `[Supervisor Full Name]`, `[Supervisor's Academic Designation]`
2. Fill in your project content in each file inside `chapters/`.

### Step 3: Compile to PDF / DOCX
```bash
# 1. Compile to PDF (Default 2 passes with auto-cleanup):
python3 compile.py

# 2. Compile to Microsoft Word (.docx via Pandoc):
python3 compile.py --format docx

# 3. Compile both PDF and DOCX simultaneously:
python3 compile.py --format all
```

---

## 🛠️ Requirements & Troubleshooting
- **To compile to PDF**: Requires TeX Live (`pdflatex` or `xelatex`):
  - Ubuntu/Debian: `sudo apt install texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-science tex-gyre`
- **To convert to Word (.docx)**: Requires Pandoc:
  - Ubuntu/Debian: `sudo apt install pandoc`
  - macOS: `brew install pandoc`
  - Windows: `winget install JohnMacFarlane.Pandoc`
