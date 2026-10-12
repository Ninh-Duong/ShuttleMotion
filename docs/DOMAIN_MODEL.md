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

A step represents one explainable moment in the lesson. It may describe the player's court position, movement direction, body orientation, stroke phase, and recovery destination. Coordinate units and court-axis conventions must be decided before implementation so the API and 3D scene agree.

## Coaching cue and common error

A cue is a short instruction tied to a particular step. An error describes a specific observable action and the coach-approved correction. Keep these attached to the relevant step rather than as a general, unstructured paragraph.

## Asset reference

An asset reference identifies a model, animation, image, or video and its intended use. Lesson data stores the reference and metadata; the binary file is stored separately.

## Court coordinates

Court coordinate convention is fixed by `reference/badminton/court.json`: metres, centre/net origin, x across, y up, z longitudinal. Use the reference README for line edges and service-region semantics.

## Open domain questions

- What age and level should the first lesson target?
- Which skill is the best first example for teaching movement in 3D?
- Will the first lesson use a rigged 3D avatar, simpler markers and paths, or both?
