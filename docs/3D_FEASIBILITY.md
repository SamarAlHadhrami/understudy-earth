# 3D view: feasibility note (nothing built; for your decision)

**Is it easy?** A simple orbit-and-zoom 3D terrain for one 10 km square is easy-to-medium; a nice-looking, phone-safe, two-panel "twin 3D" (target and Earth square) is medium. Everything below is my estimate; library facts marked UNVERIFIED were not opened in this session.

**Library.** three.js (MIT, UNVERIFIED licence text not reopened) loaded from cdnjs/jsdelivr as an exact pinned version, or the lighter option of drawing the existing 64 x 64 shaded-relief pictures as a height field with a plain WebGL mesh. three.js: one PlaneGeometry with 64 x 64 vertices per square, heights from a small height file, OrbitControls for rotate/zoom.

**Where the terrain comes from.** We already hold what is needed: the 500 m cells (20 x 20) or, better, the 64 x 64 grid that `pipeline/relief.py` reads for the twin pictures (156 m per pixel). Today only the shaded PNG is saved, so we would also save a small 64 x 64 height array per window (about 4 KB each as 16-bit values; 644 windows is about 2.6 MB, or only the target windows plus the top matches, under 0.5 MB). No new data and no new licence beyond the existing ones (Copernicus DEM, LOLA, MOLA). Mars is bilinearly upsampled from 463 m, so its 3D surface would look smoother than reality and needs a label.

**Risks.** (1) Phones: two WebGL canvases at once can be slow or lose the context on older phones; mitigate with one canvas, 64 x 64 vertices, no shadows, and a fallback to the pictures. (2) Memory: small (a few MB). (3) Honesty: height exaggeration can mislead; label it and keep the same exaggeration on both sides. (4) Extra load from an external CDN script on every page view; could be self-hosted (about 600 KB minified, UNVERIFIED).
**Estimate.** 6 to 10 hours for one square pair with orbit controls, labels, phone fallback and tests; 3 to 4 hours for a minimal version (single canvas, toggle between target and Earth). Not recommended before the 14:00 cut-off.
