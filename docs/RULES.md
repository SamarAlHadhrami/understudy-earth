# Rules (travel with the repo)

## Hard rules
1. Read data in small windows only. Never load the 2 GB Mars file or the 1.8 GB Jezero file whole.
2. Compare Earth, Moon and Mars at the SAME scale and baseline (500 m). Never compare 30 m Earth pixels with 463 m Mars pixels directly.
3. Copernicus is a surface model (buildings, plants). LOLA and MOLA are not. State this wherever scores appear.
4. Moon claims cover only the south pole data (80S to 90S).
5. Never invent task limits. Each limit needs a cited source. No source = "limits not sourced", not shipped as final.
6. A terrain match is not a geology or chemistry match. Best among our sites is not the global best.
7. Every result shows what Earth cannot copy and what our data cannot see.
8. No fake or placeholder data shown as real. Report failures honestly.
9. Cite every data set, library and limit source in docs/REFERENCES.md.
10. No NASA logos or mission marks.
11. No images, names or voices of anyone under 18.
12. Everything in English.

## Git rules
- Commits are authored only by the repo owner (git config user.name / user.email already set).
- No co-author lines, no "generated with" lines, no tool or company names in commit messages, branch names, PR text, headers or comments.
- Small plain commit messages. Push after each finished step.
- data/, *.tif, *.tiff, *.img, *.zip are never committed. Check `git status` first. Derived files stay under 20 MB.
- README has an honest "Use of AI" section (disclosure, not author credit).
