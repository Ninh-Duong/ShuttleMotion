# Badminton Lesson Domain Model

This document defines the content concepts the product needs. It does not prescribe coaching technique; a coach must supply or review technical guidance.

## Lesson

A lesson is a focused teaching unit with:

- title and learning objective;
- learner level and starting situation;
- ordered movement or stroke steps;
- concise coaching cues;
- coach-reviewed common errors, when available;
- references to 3D assets or video, when available;
- one practice prompt or drill.

## Step

A step represents one explainable moment in the lesson. It may describe the player's court position, movement direction, body orientation, stroke phase, and recovery destination, using the court coordinates below.

## Shuttle state

A shuttle is a position and a velocity vector in court coordinates (m and m/s). Side A is z > 0 and side B is z < 0. Flight is computed from `reference/badminton/shuttle.json`; see `FEATURE_SHUTTLE_SANDBOX_PLAN.md`. Candidate paths are physics results, not coaching advice.

## Coaching cue and common error

A cue is a short instruction tied to a particular step. An error describes a specific observable action and the coach-approved correction. Keep these attached to the relevant step rather than as a general, unstructured paragraph.

## Asset reference

An asset reference identifies a model, animation, image, or video and its intended use. Lesson data stores the reference and metadata; the binary file is stored separately.

## Court coordinates

Court coordinate convention is fixed by `reference/badminton/court.json`: metres, centre/net origin, x across, y up, z longitudinal. Use the reference README for line edges and service-region semantics.

## Open domain questions

- What age and level should the first lesson target?
- Which skill is the best first example for teaching movement in 3D?
- Will the first lesson use a rigged 3D avatar, simpler markers and paths, or both? The sandbox currently uses a primitive mannequin.
- What launch speeds suit the target learners, and for which strokes beyond smash, clear and drop?
- What body and jump heights should the player figure use for the target learners? The shot lab estimates the jump from sex, height, mass and level unless a measured jump is entered.

## Lesson data in use

The first lessons are stored in `backend/lessons/doubles.json` and served by the lesson API.

- **Lesson:** `id`, `category`, `status` (`draft-source-derived` until a coach reviews it, then `coach-reviewed`), bilingual `title` and `objective`, cited `sources` with pages, and four players with teams and optional roles.
- **Step:** every player's position in player-view coordinates, a shot (`by`, `type`, `to`, `arc`, optional `contactHeight` and `speed`) or a final `receivedBy`, a bilingual caption, and a verbatim source quote with pages.
- **Shuttle flight:** computed from these fields, not stored.

See `FEATURE_DOUBLES_TRAINING_PLAN.md`.

## Shot scenario

The shot lab has two scenarios.

- **Fixed shuttle.** The coach types the contact point.
- **Incoming shuttle.** The contact is derived from three inputs:
  - the incoming flight: B's position, contact height, speed, landing spot and arc;
  - A's stand position;
  - A's reach and jump.

A hit has a launch speed, a racket-face tilt and a direction. Scenarios are local page inputs and are not stored.

## Player profile

A player in the shot lab has a sex, height (m), body mass (kg), jump fitness level (weak / average / good) and an optional measured jump (cm). When no jump is entered, it is estimated from `reference/badminton/player.json` `jumpModel`. Profiles are local page inputs and are not stored.
