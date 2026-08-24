# Deep Interview Transcript — Yesterday Icon / Figma Audit

- Profile: standard
- Context: brownfield
- Final ambiguity: 0.18 (threshold 0.20)
- Date boundary: 2026-08-12 Asia/Shanghai

## Q&A

1. **Figma source** — User supplied `https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Yakit-Design-System-V1.0?node-id=37148-15299&m=dev`.
2. **Meaning of 乱码** — User selected visual blank/broken/misaligned glyphs only; naming fallback such as `FigmaIcon...` is excluded.
3. **Scope** — User confirmed the URL targets the whole icon set (`Basic Icons`).
4. **Decision boundary** — User confirmed report-only; do not modify SVG, indexes, or Figma.

## Pressure pass

The initial “乱码” wording was challenged against repository behavior. The codebase has semantic fallback names and numeric Figma-node filenames, but the user explicitly excluded naming anomalies. Figma metadata and screenshot were then used to pressure-test the visual criterion: Figma separates Outline 24×24 and Solid 20×20 glyphs, while 188 local SVGs contain a full-canvas `#E7E7F5` rectangle.
