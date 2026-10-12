# Badminton court and rules reference

[court.json](court.json) is the sole court geometry source for future 2D and 3D renderers. [court.svg](court.svg) and [RULES.en.md](RULES.en.md) are generated artifacts; edit the JSON source and regenerate them.

## Source and version

[sources.json](sources.json) records the publisher, hosted PDF, URL, SHA-256 of the PDF read, effective date, check date, and pages used. The dataset was checked against BWF 5.0 (1), effective 26 April 2025 and hosted by the Norwegian Badminton Federation. The latest effective version has **not** been confirmed. Do not label this dataset “current Laws.” Check dates use the Asia/Saigon timezone.

Page numbers are the numbers printed on the PDF, starting at 1. Each sourced geometry group and rule entry names a `sourceId`, clauses, and pages. Project conventions, model choices, and project-authored examples are identified separately from BWF requirements.

## Coordinate and boundary semantics

- Units are metres. The origin is at floor centre on the net plane; `x` runs across the court, `y` points up, and `z` runs along the court. Painted court lines lie on `y=0`.
- Each line `bounds` is a closed painted rectangle from `xMin` to `xMax` and `zMin` to `zMax`, not a centreline with a stroke extending either side.
- The SVG maps `+z` to the right and `+x` upward, preserving the same scale on both axes.
- On the `z>0` side, a player faces `-z`, so their right service court is at `x>0`. The opposite side reverses this. `diagonalReceiverId` identifies the matching receiving court.
- `rallyAreas` are whole-court regions for highlighting. A shuttle must land on the opponent's side; this dataset is not a match adjudication engine.
- `serviceAreas.landing` includes applicable lines. `standing` is an open region that excludes painted line widths. Check the whole floor-contact area of both feet, not merely a point. The separate rule requiring both feet to remain stationary still applies.

## Diagram A edge measurements

Outer court dimensions including lines are 13.40 × 6.10 m; singles width is 5.18 m. Line width is 0.04 m.

Across `x`, the Diagram A chain is `0.04 + 0.42 + 0.04 + 2.53 + 0.04 + 2.53 + 0.04 + 0.42 + 0.04 = 6.10`.

From a back edge to the net, the chain is `0.04 + 0.72 + 0.04 + 3.88 + 0.04 + 1.98 = 6.70`.

On the positive `z` side, the short service line occupies `[1.98, 2.02]`, the doubles long service line `[5.90, 5.94]`, and the back line `[6.66, 6.70]`. The usual 0.76 m doubles long service distance is centre to centre (`6.68 − 5.92`); the clear gap between painted areas is 0.72 m.

The positive `x` singles sideline occupies `[2.55, 2.59]`, and the doubles sideline `[3.01, 3.05]`. The centre service line occupies `[-0.02, 0.02]`. These painted edges matter when judging service and foot contact.

The Laws specify net height at centre and at the doubles sidelines. Any curve between those points, post cross-section, and post-base shape are illustrative model choices. Optional shuttle speed testing marks are not drawn.

## Regenerate and test

Use Node.js 22 or newer from the repository root:

```sh
npm run reference:generate
npm test
```

The tests check geometry, source references, and boundary examples. Rule summaries and project-authored examples are interpretive; the tests do not certify every umpire decision. When changing the source version, recheck the PDF, update date/version/checksum and data, revise independent expected values, then regenerate the SVG and rule document.
