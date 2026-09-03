# Daffodil International University (DIU) Thesis Report
## Smart Library Management System: Integrated Seat Reservation, Physical Book Indexing, and Digital Circulation Platform

This directory contains the complete, publication-ready LaTeX source for the DIU Undergraduate Thesis / Final Year Design Project (FYDP).

---

## 📁 Directory Layout

```
report/
├── main.tex                                  # Master Compiler Driver
├── compile.py                                # Automated Multi-Pass Builder (PDF & DOCX)
├── README.md                                 # Guide & instructions
├── media/                                    # Local Images, Logos & Architecture Diagrams
│   ├── image1.jpeg                           # DIU Crest Logo
│   ├── image2.png                            # System Architecture Diagram
│   └── final_ERD.png                         # Database ERD
└── chapters/                                 # Official DIU 6-Chapter Modules
    ├── 00_frontmatter.tex                    # Title Page, Approval, Declaration, Abstract, TOC, LOF, LOT
    ├── 01_introduction.tex                   # Chapter 1: Introduction, Problem Statement & Objectives
    ├── 02_background_literature.tex          # Chapter 2: Literature Review, Gap Analysis Matrix
    ├── 03_research_methodology_system_design.tex # Chapter 3: Research Methodology & System Design
    ├── 04_implementation_results.tex         # Chapter 4: Implementation, Core Algorithms & Results
    ├── 05_engineering_standards_design_challenges.tex # Chapter 5: Engineering Standards (EP/K/EA Mappings)
    ├── 06_conclusion.tex                     # Chapter 6: Conclusion, Limitations & Future Work
    └── 07_references.tex                     # IEEE Reference Bibliography
```

---

## 🚀 How to Compile

```bash
# 1. Compile to PDF (Default 2 passes with auto-cleanup):
python3 compile.py

# 2. Compile to Microsoft Word (.docx via Pandoc):
python3 compile.py --format docx

# 3. Compile both PDF and DOCX:
python3 compile.py --format all
```

---

## 🛠️ Required Dependencies
- **TeX Live** (`pdflatex`, `xelatex`, or `tectonic`):
  ```bash
  sudo apt install texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-science tex-gyre
  ```
- **Pandoc** (optional, for `.docx` output):
  ```bash
  sudo apt install pandoc
  ```
