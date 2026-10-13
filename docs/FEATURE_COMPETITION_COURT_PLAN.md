# Feature plan: Competition-standard badminton court in 2D and 3D

**Status:** Reference JSON, SVG, and data unit tests exist in `reference/badminton/`. The responsive bilingual 2D/3D court viewer is implemented on the homepage.
**Rule reference:** Standard indoor badminton under BWF Laws of Badminton, Section 4.1, Law 1 and Diagram A. Confirm the effective version before release.

## Goal

Show the same standard court in 2D and 3D without changing any dimensions or line positions when switching views. Allow a singles/doubles selection that highlights the relevant boundaries.

Dimensions come from [BWF Statutes, Section 4.1 — Laws of Badminton, version 5.0 (1), effective 26 April 2025](https://www.badminton.no/contentassets/c0b5fd676d9a4a10bd7a14c673a7bad0/section-4.1---laws-of-badminton---26-april-2025-v5.0-1--1.pdf). Check the [BWF Statutes portal](https://corporate.bwfbadminton.com/statutes/) for a newer version. The latest effective version has not been confirmed.

## Standard-court scope

This feature models the playing court and its equipment under Law 1. It does not certify a tournament venue. Run-off space, ceiling height, lighting, floor materials, and multi-court layouts are separate venue requirements.

- Outer court: **13.400 m × 6.100 m**. Singles area: **13.400 m × 5.180 m**.
- Every court line is **40 mm** wide and belongs to the area it bounds. Include singles and doubles sidelines, back boundaries, short service lines, doubles long service lines, and centre service lines.
- The short service line is **1.980 m** from the net on each side. The doubles long service line is **0.760 m** from the back boundary when measured centre to centre; the back boundary is the singles long service line.
- Interpret every dimension using the measured edges shown in Diagram A. Do not treat all dimensions as centreline distances.
- Posts are **1.55 m** high and stand on the doubles sidelines. The net top is **1.524 m at centre** and **1.55 m at the doubles sidelines**; net depth is **760 mm** and width is at least **6.10 m**.

The first viewer covers ordinary singles and doubles. Para badminton variants, half courts, and venue certification are outside this feature.

## User experience

- Provide **2D | 3D** view controls and **Singles | Doubles** mode controls. Keep all standard lines visible; emphasize the boundaries for the selected mode.
- Open in a top-down, correctly proportioned 2D view with dimension labels and zoom. This is the faster, clearer initial view on phones.
- The 3D view includes the floor, markings, net, and posts, with orbit, zoom, and camera reset.
- Use text labels and visible keyboard focus. Do not rely on colour alone to distinguish modes.

## Architecture

The viewer belongs in `frontend/`. The static standard court needs no backend endpoint. Both renderers must consume the canonical `reference/badminton/court.json` `CourtSpec` in metres and must not duplicate dimension constants. Pure coordinate transforms map that specification into 2D screen and 3D world coordinates.

The implementation uses locally served Three.js with an import map and its OrbitControls addon. It keeps the HTML + Node foundation without a build tool. UI labels are Vietnamese by default with an English switch; all reference data remains English.

## Unit tests and completion

Use `node:test` for reference geometry and pure transforms; no WebGL is needed for those tests. Check the BWF dimensions and equipment, 40 mm line rectangles, mirrored sides, service-line positions, singles/doubles boundary emphasis, 2D aspect ratio, and view switching without changing `CourtSpec` or the selected mode. Add browser-level checks when the viewer exists.

The feature is complete when users can switch 2D/3D and Singles/Doubles, both views agree on all court dimensions, the marked court and equipment match the pinned Law 1/Diagram A source, the 2D aspect ratio survives resizing, and the repository tests pass. It does not require accounts, lesson persistence, or a backend court API.
