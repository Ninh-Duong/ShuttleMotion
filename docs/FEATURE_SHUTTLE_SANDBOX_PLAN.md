# Feature: Shuttle Vector Sandbox

## Goal

Let a coach place a shuttle and a simple player figure on the court by typed coordinates, and see physics-based candidate flight paths from that point into the opposite half. The sandbox shows what is physically possible. It does not recommend a shot.

## Scope

- **Shuttle input.** The coach enters a court side (A or B), a left offset, a distance from the net and a height. The page converts these to world coordinates and shows them.
- **Candidate paths.** Each path is drawn as a curve with a launch-direction arrow and a landing ring in 3D, and as a projected line in 2D.
- **Path list.** Each candidate shows stroke, zone and lane, launch speed, launch angle and flight time, and can be shown or hidden.
- **Player figure.** A neutral standing mannequin built from primitives, scaled to an entered body height and facing the net.
- **Shuttle model.** Built from the Law 2.2 midpoints: a rounded base of 26.5 mm, 16 feathers of 66 mm, and a 63 mm tip circle. It is drawn life size, so zoom in or use the hitter's view to see it. It is oriented with the cork along the velocity. The cork length is not in the Laws, so it is drawn as one base diameter.
- **Stroke filters.** Smash, clear and drop buttons choose which candidates to compute and draw, for A's shot and separately for B's return. Nothing is drawn until a stroke is chosen. If the chosen stroke has no valid path, the page reports the lowest contact height at the same x and z that would allow one (`minimumHeight`, 5 cm steps). For example, a smash from (-1, 2, 3) needs at least 2.70 m.
- **Failed attempts.** An impossible stroke is still drawn, together with its real outcome, so the coach can show why it fails. `failedAttempts` keeps the stroke's launch-direction limit and, for each target, picks the angle whose shot ends nearest the target. The list then reports one of:
  - into the net, with the height where it hits;
  - out;
  - does not cross the net;
  - in court but in another zone, e.g. "lands rearcourt, misses midcourt".
- **Launch speed override.** An optional launch speed replaces the published speed for the chosen stroke. The zone and launch-direction rules still apply.
- **Reception.** Selecting one of A's paths finds where it descends through a typed contact height on the far side. The readout shows:
  - the contact point and time;
  - arrival speed (m/s and km/h) and descent angle;
  - cork direction;
  - momentum and kinetic energy.
- **Returns.** The same candidate search runs from the reception point back to the hitter's side. Returns are drawn dashed.

## Coordinates

Coordinates follow `reference/badminton/court.json` in metres:

- The origin is the floor centre at the net. x runs across the court, y is up, z runs along the court.
- **Side A** is z > 0. The player there faces -z, so their left is -x.
- **Side B** is z < 0. The player there faces +z, so their left is +x.

Player-view input maps to world coordinates as follows:

| Side | x | y | z |
|---|---|---|---|
| A | `-left` | `height` | `+fromNet` |
| B | `+left` | `height` | `-fromNet` |

For example, a shuttle on side A that is 1 m to the player's left, 3 m from the net and 2 m high is at `(-1, 2, 3)`.

## Physics model

`reference/badminton/shuttle.json` holds every constant, each with its source.

- **Equation of motion.** The shuttle is a point mass with quadratic drag and no lift, spin or wind:
  `m dv/dt = m g - 0.5 rho S Cd |v| v` (Clanet 2015, Eq. 6).
- **Constants.** m = 5 g, D = 6 cm, Cd = 0.65 for feather shuttles, rho = 1.2 kg/m³ (Cohen et al. 2015). These give a terminal speed of about 6.7 m/s.
- **Integration.** Semi-implicit Euler with a 1 ms step in `frontend/shuttle-physics.mjs`.
- **Aiming.** With no lift or wind, the path stays in a vertical plane, so the launch azimuth points at the target. The elevation is found by scanning angles and bisecting on landing distance. The flattest solution that clears the net is kept.
- **Net clearance.** The shuttle must pass between the posts and above the net top. The net top follows the sag curve from 1.524 m at the centre to 1.55 m at the posts (`netHeightAt`).
- **Targets.** The opposite half is split into nine targets: forecourt, midcourt and rearcourt (BWF Coaches' Manual L1 thirds) by left, centre and right lanes of the singles or doubles width. Lanes are named from the hitter's view.

The stroke rules come from BWF Coaches' Manual Level 1, Module 7. Launch speeds are elite values (Tsai 1997, cited by Chen 2009).

| Stroke | Launch speed | Allowed zone | Launch direction |
|---|---|---|---|
| Smash | 62 m/s | midcourt | downward |
| Clear | 48 m/s | rearcourt | upward |
| Drop | 25 m/s | forecourt | unrestricted |

Candidates must land inside the selected rally area on the opposite side.

## Shot lab page (`/shot`)

A separate teaching page for forward simulation of exactly what the coach enters.

- **Inputs.** The contact point (side, left offset, distance from the net, contact height), the shuttle speed off the racket, and two live sliders for the racket face: tilt (closed down or open up) and horizontal direction.
- **Speed presets.** These come from `shuttle.json` `presets`:
  - smash, novice: 34.6 m/s at -3.7°, and trained: 45.3 m/s at -14.8° (Zhang et al. 2016, standing forehand smash);
  - elite smash, clear and drop (Tsai 1997, cited by Chen 2009).
  - Non-elite clear and drop speeds were not found, so the coach enters them.
- **Launch model.** The shuttle leaves along the racket-face normal. McErlain-Naylor et al. 2020 measure shuttle direction from that normal and report horizontal deviations of about 3–7° for off-centre hits; this model ignores them. No source relates face pitch to the vertical launch angle, so tilt = launch elevation is a model assumption.
- **Outcome.** `shotOutcome` reports one of:
  - `net`: the shuttle hits the net, passes under it, or passes outside the posts. The net top follows the centre-to-post sag curve.
  - `short`: it lands on the hitter's side.
  - `out`: it lands beyond the selected rally area.
  - `in`: it lands in the court, reported with the zone and lane from the hitter's view.
- **Six corners.** The forecourt, midcourt and rearcourt zones (BWF L1) on the left and right side, with points 20% inside the sideline. "Six corners" is common coaching language, not a BWF term.
  - For each corner, `solveTarget` finds the flattest racket face that reaches it at the current speed, or reports it as out of reach.
  - "Apply" copies that solution to the sliders.
- **Example.** From 1.5 m high, 3 m from the net, at 45 m/s, a vertical face puts the shuttle into the net at about 1.46 m. At that speed, only high lobs reach the corners.

### Player figure on the shot lab

`reachPose` in `frontend/shuttle-physics.mjs` places the figure using `reference/badminton/player.json`, so its racket meets the contact point:

- **Segment lengths.** Shoulder height is 0.818 H and shoulder width 0.259 H. Shoulder to the middle of the grip hand is 0.386 H: upper arm, plus forearm, plus half the hand (Drillis & Contini 1966, as tabulated in Winter 2009).
- **Racket.** The distance from the butt to the string-bed centre is 680 − 280/2 = 540 mm, using the Law 4 maximums. These limits are not yet re-read against the pinned PDF; verify them.
- **Straight-arm reach.** Standing reach to the string-bed centre is 0.818 H + 0.386 H + 0.54 m, about 2.65 m for a 1.75 m player.
- **Contact above that reach.** The whole body is lifted by the difference, and that lift is the jump. The readout compares it with the jump-smash mean of 31.6 ± 9.2 cm (King et al. 2020) and with Cohen et al.'s 0.7 m elite example. For instance, a 1.75 m player hitting at 3 m needs about 35 cm.
- **Contact below that reach.** There is no jump. The body steps back, away from the net, so the contact stays in front ("The interception point when smashing must be in front of the body", BWF Shuttle Time).
- **Display.** The racket arm is drawn from shoulder to the grip hand, which is a small sphere. The racket is one connected model built from `player.json` `racket`:
  - a 200 mm grip, which is a drawing assumption and not in the Laws;
  - a thin shaft;
  - an elliptical head of 280 × 220 mm (the Law 4 strung-area limits), centred on the contact point.
- **Head orientation.** The head's long axis continues the shaft. Its face is turned as close to the launch direction as a face containing the shaft allows. For a receiver, or a player who is not hitting, the face points towards the net.
- **Ready hold.** A standing player who is not hitting holds the racket in the racket hand, head up and forward.
- **Without a figure.** When A's figure is hidden, the same racket is drawn alone, with its handle below the head.
- **Close-up.** A "Close-up" button frames A's racket and the contact point from the racket side.
- **Player profiles.** Each of the two players, A (hitter) and B (receiver), has its own profile: sex, height, body mass, jump fitness (weak, average or good), an optional measured jump, and a show/hide toggle.
- **Jump estimate.** When no jump is entered, `estimateJump` follows `player.json` `jumpModel`:
  1. **Level to jump.** The level maps to the P25, P50 or P75 countermovement jump of a force-plate cohort (Int. J. Exerc. Sci. 2025). Men: 37.3 / 41.2 / 45.2 cm. Women: 26.3 / 29.7 / 33.7 cm.
  2. **Jump to power.** That jump becomes peak power at the cohort's reference body with the Sayers 1999 equation.
  3. **Scale by lean mass.** Power is scaled by fat-free mass, estimated from BMI with the Deurenberg 1991 equation. Assuming power per kg of fat-free mass is constant within a level is a project assumption.
  4. **Power to jump.** The scaled power is converted back to jump height at the player's own mass.
  - At the same height, a heavier, fatter body jumps less. For an average man of 1.70 m: 50 kg gives 45 cm, 80 kg gives 41 cm, and 110 kg gives 28 cm.
- **Reach limit for A.** A's lift is capped at their jump. If the contact is above standing reach plus jump, the readout says "out of reach" with the shortfall, and the racket is drawn short of the shuttle in red.
- **Receiver B.** B stands at a typed position on the other side. `interceptPose` finds the first point of A's flight within B's straight-arm reach plus jump. B is then drawn reaching it, and the readout gives the height and any jump. Otherwise it says B cannot reach the flight from there. Crouching and lunging are not modelled, so very low shuttles count as out of reach.
- **Racket-face diagram.** A side-view diagram under the sliders shows the face tilt and the launch direction along its normal.
- **Camera.** A "Hitter's view" button frames the shot from behind the hitter. The camera's minimum zoom distance is now 1.5 m.
- **Limits.** The figure is a reach-and-jump geometry only. Arm bend, trunk lean, footwork and timing are coach questions, not modelled.

### Run test: incoming shuttle scenario

The shot lab opens in the **incoming shuttle** scenario. **Fixed shuttle** keeps the typed contact point described above.

- **Incoming flight.** B hits from the position in B's card, at a typed contact height and speed, towards a landing spot on A's side. It is either a high lob or a flat shot: `aimAt` with `prefer: 'high'` returns the highest valid solution instead of the flattest. If no solution exists, the page says B cannot send the shuttle there.
- **A's stand position.** A stands where the coach places them (left offset and distance from the net).
- **Contact.** `highestContact` takes the highest point of the incoming flight within A's straight-arm reach plus their jump. The readout gives:
  - contact height and time after B's hit;
  - arrival speed;
  - the jump used out of the jump available.
- **Overhead rule.** A contact counts only if A's straight arm points at least `player.json` `overhead.minArmElevationDeg` (45°) above horizontal. This is a project assumption awaiting coach review. Without it, a shuttle about one arm-and-racket length to the side, at shoulder height, would count as a hit.
- **Misses are played out.** When A cannot make a valid contact, the run still happens and A misses.
  - `closestMiss` picks the moment the racket gets closest to the shuttle, preferring overhead attempts under the same 45° rule.
  - A jumps as needed, up to their maximum, with the racket stretched towards the shuttle in red and stopping short.
  - The shuttle carries on and lands. The readout gives the remaining gap and the jump used.
  - In the fixed-shuttle scenario an unreachable contact is also a miss: A jumps, and the shuttle drops straight down under drag.
- **Miss.** If A cannot reach the flight, `suggestStand` proposes a stand spot: the racket shoulder under the point where the descending flight reaches A's maximum reach. The readout gives the distance to move, and a button moves A there.
- **A's hit.** A's hit (speed, face tilt, direction) is simulated from the contact as before. B's interception of the return uses B's position.
- **Run test.** "▶ Run test" animates the sequence; "Slow ×0.25" plays it at quarter speed:
  1. The shuttle follows the incoming flight to the contact.
  2. A's jump follows `lift = h − g t² / 2` around the contact, so the top of the jump coincides with the hit.
  3. The shuttle then follows A's hit.
- **Path display.** Only one path is drawn at a time.
  - **While running.** The static paths are hidden and the shuttle leaves a 0.4 s trail. The trail fades from transparent at its tail to opaque at the shuttle (per-vertex alpha): white on the incoming flight, then the outcome colour after A's hit. When the shuttle lands, the trail fades out and the static view returns.
  - **Static view.** The incoming flight is drawn at 30% opacity, so the eye goes to A's hit.
- **Timing.** Flight points are sampled every 10 ms. Each frame rebuilds the shuttle and figure meshes.
  - `ponytail:` this is fine for one shuttle and two figures; if more objects are added, move them with transforms instead.
- **Limits.** The jump timing is ballistic only. Run-up, split step, take-off preparation and swing timing are coach questions and are not modelled.

## Orientation and load

- **Orientation.** The shuttle flips within about 20 ms of impact (16–39 ms, Cohen et al. 2015). After that the cork leads, so the cork direction is `v / |v|` and needs no extra physics.
- **Force.** A force in kilograms is not a usable input. Force gives speed only through a contact time (`F·Δt = m·Δv`), and no recorded source gives the racket–shuttle contact time.
  - The sandbox therefore takes launch speed as input.
  - At reception it reports momentum `m|v|` and energy `½ m |v|²`.
  - An average force (N and kgf) appears only when the user enters a contact time, and the UI labels it as an assumption.
  - Example: a 62 m/s smash from (-1, 3, 3) reaches 1 m on side B at about 21 m/s. Its momentum is about 0.105 kg·m/s, which gives about 105 N (about 10.7 kgf) over an assumed 1 ms contact.

## Non-goals

- Coaching advice, shot recommendation, or straight versus cross-court preference.
- Shuttle animation, placing the shuttle by clicking, or a backend trajectory API.
- Mannequin poses, rigging or movement.
- Lift, spin, wind and shuttle flip dynamics.
- Return speed that depends on the incoming speed, and rallies longer than A → B → return candidates.

## Known limits

- Launch speeds are elite values, not learner values.
- At 25 m/s, a drop from the midcourt often needs a high, slow trajectory to clear the net. Real drops are slower, but no published speed range covers learners.
- Clanet's Eq. 7 range formula is an approximation. The numerical model flies about 10 m in his 52° / 59 m/s example, within the 13.8 m maximum range reported by Cohen et al.

## Coach questions

- Launch speeds and angles for drive, net shot, push, lift and each serve type, and for the target learners.
- Whether the drop should be shown as a slower or downward shot.
- When straight or cross-court targets should be preferred.
- Whether the sandbox should later animate a player's movement to the shuttle.
- Racket–shuttle contact time. Cohen et al. 2015 give a typical 1 ms, now recorded in `shuttle.json`.
- Learners' body and jump heights, and where the body should be relative to the contact for each stroke.
- Whether the jump-norm cohort (fit military officers, age about 37) should be scaled for younger or untrained learners, and how the coach wants weak / average / good defined.
- Whether to model crouching and lunging so a receiver can reach low shuttles.
- Typical incoming lob and clear speeds and heights for the target learners (the default incoming clear uses the elite 47.8 m/s).
- Whether the suggested stand spot (shoulder under the point of maximum reach) matches how the coach wants learners to position for a smash.
- The minimum arm elevation for an overhead contact (assumed 45°), and whether side-arm contacts should count for other strokes.
- How the incoming speed changes the return speed of blocks, drives and lifts, and launch speeds for defensive returns.

## Verification

- `npm test` runs `tests/shuttle-physics.test.mjs`. It checks:
  - the coordinate mapping;
  - terminal speed;
  - that the range sits between Eq. 7 and Cohen's maximum;
  - that aiming lands within 5 cm of the target;
  - the stroke zone, launch-direction and rally-area filters;
  - the reception state: it is at the contact height, descending, and its cork direction, momentum and energy are consistent;
  - that returns land on the hitter's side;
  - the average-force conversion and the speed override;
  - that every source id resolves.
- Manual check:
  1. Run `npm run dev`.
  2. Place a shuttle on side A at left 1, from net 3, height 3.
  3. Confirm the readout shows `(-1, 3, 3)`, nine candidates appear, smashes point downward, and 2D and 3D agree.
  4. Select "Smash · midcourt centre" and confirm the reception readout and the dashed returns into side A.
  5. On `/shot`, with the incoming-shuttle defaults, confirm "A hits the shuttle" at about 2.9 m with a jump under the estimated maximum, then press "▶ Run test".
  6. Move A to left −1 m and 3.5 m from the net. Confirm "A cannot reach the shuttle" with a suggested spot, and that "Move to the suggested spot" turns it into a hit.
