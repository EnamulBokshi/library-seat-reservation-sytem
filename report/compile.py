#!/usr/bin/env python3
"""
Universal LaTeX to PDF / DOCX Compiler for DIU Thesis Report
============================================================
Compiles LaTeX source files (.tex) to PDF (.pdf) or Word (.docx).
Works standalone in this report directory.

Usage:
  python3 compile.py                       # Compiles main.tex to main.pdf
  python3 compile.py --format pdf          # Compiles to PDF (2 passes + auto-cleanup)
  python3 compile.py --format docx         # Compiles to Word (.docx) via Pandoc
  python3 compile.py --format all          # Compiles both PDF and DOCX
"""

import os
import sys
import shutil
import subprocess
import argparse
import re
from pathlib import Path

# ANSI colors for terminal feedback
GREEN = "\033[92m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

TEMP_EXTENSIONS = [
    ".aux", ".log", ".out", ".toc", ".lof", ".lot",
    ".bbl", ".blg", ".synctex.gz", ".fdb_latexmk", ".fls"
]

def find_latex_compiler():
    """Detect available LaTeX compiler on PATH."""
    for comp in ["pdflatex", "xelatex", "lualatex", "tectonic"]:
        if shutil.which(comp):
            return comp
    return None

def create_image_placeholder(filepath: Path):
    """Generate a clean image placeholder if a referenced image is missing."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    try:
        import importlib
        Image = importlib.import_module("PIL.Image")
        ImageDraw = importlib.import_module("PIL.ImageDraw")
        img = Image.new("RGB", (800, 400), color=(240, 243, 246))
        d = ImageDraw.Draw(img)
        text = f"Placeholder Image:\n{filepath.name}"
        d.text((40, 180), text, fill=(100, 110, 120))
        img.save(str(filepath))
        print(f"  {YELLOW}📷 Created placeholder image:{RESET} {filepath}")
    except Exception:
        ext = filepath.suffix.lower()
        if ext in ['.jpg', '.jpeg']:
            filepath.write_bytes(bytes.fromhex('ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f00d2cf20ffd9'))
        elif ext == '.png':
            filepath.write_bytes(bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2d0b0000000049454e44ae426082'))
        else:
            filepath.touch(exist_ok=True)
        print(f"  {YELLOW}📄 Created dummy placeholder file:{RESET} {filepath}")

def scan_and_fix_missing_images(tex_path: Path):
    """Scan .tex files for \\includegraphics and ensure target files exist."""
    base_dir = tex_path.parent
    tex_files = [tex_path] + list(base_dir.rglob("*.tex"))
    pattern = re.compile(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}')
    for tf in tex_files:
        try:
            content = tf.read_text(encoding="utf-8", errors="ignore")
            for m in pattern.findall(content):
                img_path = (base_dir / m).resolve()
                if not img_path.exists() and not img_path.with_suffix(".png").exists() and not img_path.with_suffix(".jpeg").exists() and not img_path.with_suffix(".jpg").exists():
                    target = img_path if img_path.suffix else img_path.with_suffix(".png")
                    create_image_placeholder(target)
        except Exception:
            pass

def clean_temporary_files(base_dir: Path, stem: str):
    """Clean auxiliary LaTeX compilation files."""
    cleaned_count = 0
    for ext in TEMP_EXTENSIONS:
        temp_file = base_dir / f"{stem}{ext}"
        if temp_file.exists():
            try:
                temp_file.unlink()
                cleaned_count += 1
            except Exception:
                pass
    return cleaned_count

def compile_to_pdf(tex_path: Path, compiler: str, passes: int = 2, keep_temp: bool = False) -> bool:
    """Run multi-pass LaTeX compilation to generate PDF."""
    base_dir = tex_path.parent.resolve()
    tex_filename = tex_path.name
    stem = tex_path.stem
    pdf_file = base_dir / f"{stem}.pdf"

    print(f"\n{BOLD}{BLUE}======================================================{RESET}")
    print(f"{BOLD}⚙️  Compiling PDF using {compiler} ({passes} passes)...{RESET}")
    print(f"📄 Source File: {BOLD}{tex_path.resolve()}{RESET}")
    print(f"{BOLD}{BLUE}======================================================{RESET}\n")

    scan_and_fix_missing_images(tex_path)

    for p in range(1, passes + 1):
        print(f"[{p}/{passes}] Running {compiler} on {tex_filename}...")
        if compiler == "tectonic":
            cmd = ["tectonic", tex_filename]
        else:
            cmd = [
                compiler,
                "-interaction=nonstopmode",
                "-halt-on-error",
                tex_filename
            ]
        
        result = subprocess.run(cmd, cwd=str(base_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            print(f"\n{RED}❌ Compilation failed on pass {p}!{RESET}")
            log_lines = result.stdout.splitlines()
            error_snippet = [l for l in log_lines if l.startswith("!") or "Error" in l or "Fatal" in l]
            if error_snippet:
                print(f"{YELLOW}--- LaTeX Error Summary ---{RESET}")
                for err in error_snippet[:15]:
                    print(f"  {err}")
            else:
                print("\n".join(log_lines[-30:]))
            return False

    if not keep_temp:
        cleaned = clean_temporary_files(base_dir, stem)
        clean_msg = f" | 🧹 Cleaned {cleaned} temporary build files."
    else:
        clean_msg = " | 💾 Temporary files kept."

    size_kb = pdf_file.stat().st_size / 1024 if pdf_file.exists() else 0
    print(f"\n{GREEN}✅ PDF successfully generated:{RESET} {BOLD}{pdf_file}{RESET}")
    print(f"📦 Size: {size_kb:.2f} KB{clean_msg}\n")
    return True

def compile_to_docx(tex_path: Path) -> bool:
    """Compile LaTeX document to Word (.docx) using Pandoc."""
    base_dir = tex_path.parent.resolve()
    stem = tex_path.stem
    docx_file = base_dir / f"{stem}.docx"

    pandoc = shutil.which("pandoc")
    if not pandoc:
        print(f"\n{YELLOW}⚠️  Pandoc is not installed on this system.{RESET}")
        print(f"   To compile directly to Word (.docx), install pandoc:")
        print(f"   - Ubuntu/Debian: {BOLD}sudo apt install pandoc{RESET}")
        print(f"   - macOS:         {BOLD}brew install pandoc{RESET}")
        print(f"   - Windows:       {BOLD}winget install JohnMacFarlane.Pandoc{RESET}\n")
        return False

    print(f"\n{BOLD}{BLUE}======================================================{RESET}")
    print(f"{BOLD}⚙️  Converting to Word (.docx) via Pandoc...{RESET}")
    print(f"📄 Source File: {BOLD}{tex_path.resolve()}{RESET}")
    print(f"{BOLD}{BLUE}======================================================{RESET}\n")

    cmd = [
        pandoc,
        str(tex_path.name),
        "-o",
        str(docx_file.name),
        "--standalone"
    ]

    result = subprocess.run(cmd, cwd=str(base_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"{RED}❌ Pandoc conversion failed!{RESET}")
        print(result.stderr)
        return False

    size_kb = docx_file.stat().st_size / 1024 if docx_file.exists() else 0
    print(f"{GREEN}✅ Word (.docx) successfully generated:{RESET} {BOLD}{docx_file}{RESET}")
    print(f"📦 Size: {size_kb:.2f} KB\n")
    return True

def resolve_target_file(target: str) -> Path:
    """Resolve target string into a concrete Path object."""
    p = Path(target) if target else Path("main.tex")
    
    if p.exists() and p.is_file():
        return p.resolve()
    
    if Path("main.tex").exists():
        return Path("main.tex").resolve()

    return p.resolve()

def main():
    parser = argparse.ArgumentParser(description="Universal LaTeX to PDF / DOCX Compiler")
    parser.add_argument("target", nargs="?", default="", help="Target .tex file (default: main.tex)")
    parser.add_argument("--format", choices=["pdf", "docx", "doc", "all"], default="pdf", help="Output format (default: pdf)")
    parser.add_argument("--passes", type=int, default=2, help="Number of LaTeX compiler passes (default: 2)")
    parser.add_argument("--keep-temp", action="store_true", help="Keep temporary build files (.aux, .log, .toc)")
    args = parser.parse_args()

    target_path = resolve_target_file(args.target)
    if not target_path.exists():
        print(f"{RED}❌ Error: Target LaTeX file not found: {target_path}{RESET}")
        sys.exit(1)

    fmt = args.format.lower()
    success = True

    if fmt in ["pdf", "all"]:
        compiler = find_latex_compiler()
        if not compiler:
            print(f"{RED}❌ Error: No LaTeX compiler found (pdflatex, xelatex, tectonic).{RESET}")
            print(f"   Install TeX Live: {BOLD}sudo apt install texlive-latex-base texlive-latex-extra{RESET}")
            sys.exit(1)
        success = compile_to_pdf(target_path, compiler, passes=args.passes, keep_temp=args.keep_temp)

    if fmt in ["docx", "doc", "all"]:
        docx_success = compile_to_docx(target_path)
        if fmt != "all":
            success = docx_success

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
