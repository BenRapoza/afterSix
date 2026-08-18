# Date Night Generator

## Product & Technical Specification

**Status:** Draft for implementation  
**Product stage:** Web-first MVP; APIs and data contracts designed for future iOS and Android clients  
**Primary operating window:** 4:00 PM–1:00 AM local time

---

## 1. Product vision

Date Night Generator helps couples and pairs decide what to do tonight, then makes the plan practical enough to follow. A user supplies the evening's location, time, budget, preferences, transportation, and booking tolerance; the product returns a coherent, bookable itinerary with accurate timing, reservation and ticket guidance, and optional rideshare links.

The initial product is intentionally focused on late-afternoon and nighttime experiences: dinner, drinks, live music, concerts, comedy, theater, movies, bowling, axe throwing, trivia, karaoke, arcades, escape rooms, and comparable local nightlife activities.

**Working promise:** _Tell us what kind of night you want. We'll plan the rest._

## 2. Goals and non-goals

### Goals

- Reduce the effort and indecision involved in planning an evening date.
- Generate realistic multi-stop itineraries within a user’s stated time, distance, budget, and booking constraints.
- Make operational details explicit: reservation status, tickets, travel time, venue hours, and how to get there.
- Support browsing, generation, saving, sharing, booking, and following an itinerary in one product.
- Establish reusable backend services and APIs for a future native mobile experience.

### Non-goals for the MVP

- Planning daytime, multi-day, or destination travel itineraries.
- Guaranteeing restaurant/event availability or completing third-party checkout in-product.
- Acting as a social network or dating app.
- Replacing maps, ticketing, rideshare, or restaurant reservation providers.
- Optimizing for groups larger than a couple, although the data model should support party size.

## 3. Target users

| User | Need | Primary value |
|---|---|---|
| Spontaneous couple | Wants a good plan tonight with minimal research | One-tap, feasible itinerary |
| Planner | Wants control over price, genre, travel, and bookings | Transparent choices and editable itinerary |
| New-to-area couple | Does not know local options | Curated discovery around a neighborhood |
| Repeat user | Wants ideas that do not feel repetitive | Couple profile, history, and personalization |

## 4. Experience scope and taxonomy

Every recommended stop has a primary category, optional subcategories, expected duration, spending estimate, and booking requirements.

| Category | Example subcategories |
|---|---|
| Dinner & food | Italian, sushi, tapas, steakhouse, casual, upscale, food hall, dessert, late-night food |
| Drinks & nightlife | Cocktail bar, wine bar, brewery, rooftop, speakeasy, lounge, dancing |
| Live entertainment | Live music, jazz, local band, DJ, open mic, concert |
| Comedy | Stand-up, improv, comedy club |
| Performing arts | Theater, musical, drag, magic, performing arts |
| Games & activities | Bowling, axe throwing, arcade, trivia, darts, billiards, escape room, mini golf, karaoke |
| Film | Mainstream theater, independent cinema, special screening |
| Evening local events | Festival, night market, museum late hours, ghost tour, art event |

## 5. Core user flows

### 5.1 Generate a date

1. User selects a city, starting address, venue, or current location and a travel radius.
2. User chooses date, start time, desired end time (or flexible ending), and party size.
3. User selects total or per-person budget and payment preference.
4. User chooses one or more vibes and activities, food preferences, accessibility needs, and exclusions.
5. User chooses transportation: walk, drive, public transit (future), rideshare, or no preference.
6. User selects booking tolerance: reservations required, preferred, not needed, or no preference; they may separately permit ticketed events.
7. System generates 1–3 date concepts and an itemized itinerary for each.
8. User can replace a stop, alter order, adjust time/budget, save, share, or open external booking/maps/rideshare links.

### 5.2 Browse and build manually

1. User browses local venues and scheduled events using category, date, price, distance, reservation, and ticket filters.
2. User adds items to a draft itinerary.
3. The scheduler validates compatibility and proposes time slots, travel, and gaps.
4. User saves or starts Live Date mode.

### 5.3 Saved date and post-date feedback

1. User opens a saved itinerary, receives reminders, and follows it during the evening.
2. After the date, the user can rate individual stops and the overall plan, record what actually happened, and save favorites.
3. Feedback updates the couple profile and recommendation ranking.

## 6. Functional requirements

### 6.1 Onboarding and inputs

- Location supports city, address, current geolocation (with permission), and saved places.
- Date/time uses the venue’s local timezone. Default start is the next suitable evening time.
- Budget supports total and per-person modes, currency, expected tax/tip setting, and a configurable contingency percentage.
- Vibes are multi-select: romantic, fun, relaxed, adventurous, upscale, casual, creative, outdoors, lively, low-key.
- Users can specify cuisine, dietary constraints, alcohol preference, event genres, accessibility, walking tolerance, and hard exclusions.
- Party size defaults to two but supports any positive integer.

### 6.2 Reservation, ticket, and availability states

The booking state is stored at the **specific offering/time-slot level** where possible, not inferred only from a venue.

| Field | Allowed values | Meaning |
|---|---|---|
| `reservation_policy` | `required`, `preferred`, `not_needed`, `unknown` | Whether the venue/activity normally needs a reservation for the proposed time |
| `reservation_availability` | `available`, `limited`, `waitlist`, `unavailable`, `not_applicable`, `unknown` | Availability evidence from a provider or admin confirmation |
| `ticket_policy` | `required`, `optional`, `not_required`, `unknown` | Whether a ticket/admission is required |
| `ticket_availability` | `available`, `limited`, `sold_out`, `not_applicable`, `unknown` | Availability for the selected occurrence |
| `booking_url` | URL or null | External reservation/ticket destination |

Requirements:

- The itinerary must visibly label each stop: **Reservation required**, **Reservation preferred**, or **No reservation needed**, including an `Unknown—confirm with venue` fallback.
- Ticketed events must display date/time, ticket requirement, price range, availability confidence, and an external ticket link.
- A hard user requirement excludes mismatched stops. A preference influences ranking but may be overridden with a clear explanation.
- The system must not claim a table or ticket is booked until a provider confirms it through a supported integration.

### 6.3 Itinerary presentation and editing

- Show a timeline: start/end times, venue, address, duration, travel leg, estimated cost, booking state, and action links.
- Show totals: estimated spend, travel time/distance, planned duration, and remaining buffer.
- Let users replace one stop while preserving the rest when feasible.
- Let users lock a stop or time; locked constraints cannot be displaced without confirmation.
- Provide explainability such as “chosen because it is 8 minutes from dinner and has a 9:00 PM comedy show.”

### 6.4 Rideshare

- When rideshare is selected or recommended, each inter-stop travel leg exposes **Uber** and **Lyft** deep links with pickup/drop-off coordinates or addresses.
- Links open the provider app when installed and otherwise open the provider web flow. The API records a click but never transmits payment details.
- Show estimated ride time and price only when an approved provider/maps integration can supply current estimates; otherwise label it as an estimate or omit it.
- The generated itinerary includes a transportation summary and a configurable ride budget allowance.

## 7. Itinerary generation and constraint logic

### 7.1 Inputs and hard constraints

The generator receives: location/radius, local date, start/end window, party size, budget, modes of travel, activity inclusion/exclusion, dietary/accessibility constraints, reservation/ticket rules, and locked stops.

It must reject candidates that:

- Are closed or do not fit the requested time window.
- Exceed maximum travel radius or travel-time tolerance.
- Conflict with fixed event start/end times or minimum check-in time.
- Violate hard ticket/reservation requirements.
- Exceed budget after a configurable tolerance.
- Are unavailable or age-inappropriate when dependable data exists.

### 7.2 Time and travel rules

- A schedule begins with the user’s start time and ends no later than the requested end time, unless the user chose a flexible end.
- Include travel time for every leg, plus default arrival/check-in buffers: 10 minutes for restaurants/bars, 20–30 minutes for ticketed events, and provider-configured values for activities.
- Use duration ranges by category, e.g., dinner 75–120 minutes, cocktail stop 45–90 minutes, bowling 60–120 minutes, ticketed performance according to occurrence data.
- Maintain a minimum schedule slack (default 15 minutes) to absorb delays; show the plan as “tight” when below threshold.
- Prefer geographically coherent routes. Do not recommend a backtracking leg unless it materially improves fit or user preference.
- Travel mode has mode-specific routing. Driving/ride share includes pickup allowance; walking honors the user’s maximum walking distance.

### 7.3 Candidate generation and scoring

1. Retrieve eligible venues and dated events in the search area.
2. Normalize offerings, hours, prices, booking data, and location.
3. Compose valid sequences from templates and flexible category combinations.
4. Schedule each sequence with travel and buffers.
5. Rank feasible itineraries and return diversity across date formats.

Suggested initial score:

`0.28 preference match + 0.20 temporal fit + 0.15 location coherence + 0.15 booking confidence + 0.12 budget fit + 0.05 quality/reliability + 0.05 novelty`

Scores must be explainable and tunable. Quality/reliability should weigh reputable source data, rating/review confidence where licensed, operating-hours confidence, and successful click/feedback outcomes—not only popularity.

### 7.4 Date formats

- Classic: dinner → cocktails → dessert.
- Activity: dinner → bowling/axe throwing/arcade → drinks.
- Music: dinner → live music/concert → cocktails or late-night food.
- Comedy: dinner → comedy → drinks.
- Theater: drinks → theater → late-night food.
- Night out: cocktails → dinner → nightlife/activity.
- Event-led: ticketed event → food/drinks before or after according to showtime.

The system should not force every itinerary through dinner first. Event showtime, cuisine preference, and time window determine the structure.

## 8. Content and domain model

### 8.1 Business versus event

A **business/venue** is a persistent place (e.g., a theater, restaurant, bowling alley, bar). An **event** is a dated occurrence that may take place at one venue (e.g., 8 PM comedy set, concert, trivia night, performance). A venue may have many events; an event has one or more occurrences, each with its own times, pricing, capacity, tickets, and availability.

This distinction prevents treating a Saturday concert as if it were always available because its venue is open.

### 8.2 Core entities

| Entity | Key fields |
|---|---|
| User | id, email/auth identifiers, consent, locale, timezone |
| CoupleProfile | id, member user IDs, shared preferences, budget norms, home areas, novelty settings |
| PreferenceProfile | cuisines, vibes, categories, exclusions, accessibility, travel and booking preferences |
| Venue | id, name, categories, address/geo, hours, amenities, accessibility, provider IDs, reliability |
| Offering | id, venue, category, default duration/price, reservation policy, booking link |
| Event | id, venue, title, category, organizer, description, age/accessibility info |
| EventOccurrence | id, event, start/end, doors/check-in, ticket policy/availability, price, ticket URL |
| AvailabilitySnapshot | subject, captured timestamp, provider, normalized reservation/ticket availability, raw reference |
| Itinerary | id, owner/couple, status, date/timezone, inputs snapshot, totals, generation version |
| ItineraryStop | itinerary, venue/offering/occurrence, sequence, arrival/start/end, cost, booking state, lock state |
| TravelLeg | itinerary, origin/destination, mode, duration, distance, estimate source, deep links |
| SavedPlace/Favorite | user or couple, subject, notes, tags |
| Feedback | itinerary/stop, rating, completed/skipped, reason, private notes |
| PartnerReferral | provider, external URL template, attribution and commission metadata |

Use UTC for stored timestamps, IANA timezone identifiers for local rendering, and immutable input/generation snapshots so historical itineraries remain reproducible.

## 9. Personalization, saved history, and awareness

### Couple profiles

- A user may create or join a shared couple profile through an invite.
- Members control whether preferences are shared, private, or suggested only.
- The profile learns positive/negative category signals, cuisine preferences, preferred spend, distance tolerance, alcohol preference, and novelty appetite.
- Do not infer sensitive traits or make high-impact decisions from date history.

### Date history

- Save drafts, upcoming dates, completed dates, and archived/canceled plans.
- Preserve the exact itinerary and provider data snapshot shown at planning time.
- Use completed/liked/disliked stop signals to avoid repetitive recommendations and improve ranking.

### Weather and event awareness

- Fetch weather forecast for the date and local area during generation and again before the date.
- Penalize or flag outdoor/long-walk plans during hazardous or poor weather; offer indoor replacements.
- Prioritize dated local events whose occurrence fits the schedule. Clearly mark stale/unknown event data.
- Weather is advisory; users can override it.

## 10. Admin and business dashboard

### Internal admin

- Search, create, edit, merge, deactivate, and audit venues, offerings, events, occurrences, and source mappings.
- Review freshness, duplicates, invalid hours, broken URLs, unsupported claims, and user reports.
- Configure taxonomy, duration defaults, booking labels, city coverage, ranking rules, and feature flags.
- Inspect generation outcomes, source health, and policy decisions without exposing private user content.

### Business portal (phase 2+)

- Verified businesses can claim a venue, edit approved profile data, manage special events/offers, and attach reservation/ticket URLs.
- Dashboard shows aggregated, privacy-preserving impressions, referral clicks, saves, and itinerary inclusion—not individual date histories.
- All self-service changes are moderated or subject to automated validation, with audit trails.

## 11. Notifications and Live Date mode

### Notifications

- In-app and opt-in email/push reminders for upcoming reservations, ticketed events, departure time, weather disruption, and schedule changes.
- Notification timing is user-configurable; default reminders should be modest (e.g., day-before and leave-now).
- Send transactional messages only for explicit saved/confirmed itinerary actions; marketing consent is separate.

### Live Date mode

- A focused mobile-friendly view shows the current stop, next action, travel leg, booking/ticket links, and remaining timeline.
- Users can mark a stop done/skipped, start navigation/rideshare, find a nearby replacement, and report a delay.
- Replanning proposes only future-stop changes and never silently removes a booked or locked item.
- In a later phase, real-time provider updates may alert users to cancellations, weather, or late venue changes.

## 12. Technical architecture

### 12.1 Principles

- Treat the web client, future native apps, and admin portal as separate clients of a versioned API.
- Keep recommendation/orchestration logic server-side; never expose provider secrets to clients.
- Favor provider adapters and normalized internal objects to avoid coupling the product to one discovery, routing, ticketing, or booking vendor.
- Make availability and pricing explicitly time-stamped because these are volatile.

### 12.2 Proposed web-first architecture

| Layer | Recommended responsibility |
|---|---|
| Web client | Responsive Next.js/React interface; SEO landing pages; authenticated app; Live Date PWA features |
| API/BFF | Versioned REST or GraphQL API; authentication, validation, rate limiting, response shaping |
| Domain services | itinerary generation, catalog, profiles, booking links, notification orchestration, analytics events |
| Data | PostgreSQL with PostGIS for geo queries; Redis/cache for volatile search/results; object storage for approved assets |
| Async workers | provider syncs, event ingestion, availability refresh, reminders, analytics exports |
| Integrations | maps/routing, places/venue data, event/ticket sources, reservations, weather, Uber/Lyft deep-link builders, email/push |
| Observability | structured logs, error tracking, traces, provider health, data freshness metrics |

Native iOS/Android clients should authenticate through the same identity system and call the same public API. Platform-specific services are limited to deep links, push notifications, location permission, and native map/rideshare handoff.

### 12.3 API surface (illustrative)

| Method/path | Purpose |
|---|---|
| `POST /v1/itineraries/generate` | Generate ranked feasible itineraries from constraints |
| `GET /v1/itineraries/{id}` | Retrieve itinerary and latest refreshable status |
| `PATCH /v1/itineraries/{id}` | Save, lock, reorder, or update inputs |
| `POST /v1/itineraries/{id}/replace-stop` | Replace a selected future stop |
| `POST /v1/itineraries/{id}/refresh` | Recheck volatile data and revalidate schedule |
| `GET /v1/discovery` | Search/filter venues, offerings, and dated events |
| `GET /v1/venues/{id}` / `GET /v1/events/{id}` | Details and occurrences |
| `POST /v1/couple-profiles` / `PATCH /v1/couple-profiles/{id}` | Shared profile management |
| `POST /v1/referrals/click` | Redirect/log external booking, ticket, or rideshare intent |
| `POST /v1/feedback` | Submit itinerary/stop outcome feedback |

Use idempotency keys for generation/save operations, pagination for discovery endpoints, cursor-based event feeds, and API versioning from the start.

### 12.4 Integration considerations

- Use approved commercial APIs and honor their attribution, caching, display, and resale terms.
- Map providers should provide geocoding, routing, duration/distance, and optionally place details. Keep a provider-neutral `Location` contract.
- Reservation and ticket APIs vary sharply by market and partner access. MVP may begin with verified external links plus provider freshness timestamps; never fabricate real-time availability.
- Uber/Lyft integrations should begin with documented universal/deep links. Add price estimates only if permitted APIs, scopes, and user disclosure are available.
- Implement provider-specific adapters with retries, quotas, circuit breakers, source provenance, and graceful `unknown` states.

## 13. MVP and phased roadmap

### MVP: one launch city or limited metro area

- Responsive authenticated web app and guest exploration.
- Evening-focused onboarding, manual location, date/time, budget, vibe/category, food, travel, and reservation/ticket preference inputs.
- Curated/ingested venue and event catalog for launch geography.
- Feasible itinerary generation for 2–3 stops, with map links, external booking/ticket links, and Uber/Lyft handoffs.
- Reservation required/preferred/not-needed/unknown and ticket-required labels.
- Saved itineraries, basic history, sharing by link, and post-date ratings.
- Weather-aware warnings, basic analytics, internal admin catalog tools, and privacy controls.

### Phase 2: personalization and operational depth

- Couple profiles, richer preferences, favorites, repeat avoidance, stop replacement, and Live Date mode.
- More cities and provider sync automation; improved availability freshness.
- Opt-in reminders and pre-date revalidation.
- Business claim flow and aggregated business analytics.

### Phase 3: mobile and partnerships

- Native iOS/Android clients using the existing API.
- Push notifications, richer location-aware Live Date features, and accessible mobile map handoff.
- Reservation/ticket partner integrations where commercially viable; verified booking outcomes.
- Paid subscription, affiliate optimization, and sponsored placements with clear disclosure.

## 14. Monetization

- Affiliate/referral revenue from qualified reservation, ticket, rideshare, and partner clicks where permitted.
- Sponsored venues or events, clearly labeled and separated from organic relevance scoring.
- Optional premium subscription: advanced filters, unlimited saved plans, enhanced personalization, shared couple tools, and concierge-style re-planning.
- Business subscription for verified profile tools and privacy-preserving performance reporting.

Do not sell identifiable date history or use paid placement to override a hard user constraint.

## 15. Analytics and success measures

### Key metrics

- Activation: percentage completing generation after starting setup.
- Quality: save rate, external booking/ticket click-through, itinerary completion, ratings, and replace/abandon rate.
- Feasibility: percent of generated itineraries that pass all hard constraints; schedule slack distribution.
- Trust: booking/ticket data freshness, broken-link rate, user-reported inaccuracies, provider error rate.
- Retention: weekly/monthly returning planners and repeat completed dates.
- Business: attributed referral conversion where measurable, revenue per active planner, and sponsored-content disclosure compliance.

Events should be minimal, documented, consent-aware, and keyed to pseudonymous IDs where possible. Separate product analytics from marketing tracking.

## 16. Privacy, security, and safety

- Collect precise location only when necessary; use coarse location for discovery when sufficient, and do not retain raw precise location longer than needed for the stated feature.
- Treat date history, preferences, and couple relationships as sensitive personal context. Provide export, deletion, profile separation, and invitation revocation flows.
- Require explicit consent before sharing data between couple members. Never expose one member’s private preferences automatically.
- Encrypt data in transit and at rest; protect accounts with modern authentication, secure session handling, rate limits, and audit logs for administrative changes.
- Store only tokenized/redirected booking data; do not store rideshare payment information or third-party passwords.
- Verify outbound links, protect against open-redirect abuse, and disclose affiliate relationships.
- Include venue-level accessibility fields and provide accessible filtering; avoid safety claims that cannot be verified.
- Establish data retention policies, incident response, and vendor data-processing review before launch.

## 17. Acceptance criteria for MVP

1. A user can generate an evening itinerary from a location, date/time window, budget, vibes, and travel preference.
2. Every displayed itinerary fits the selected time window after travel and required buffers, or visibly explains its exception.
3. Every stop displays category, local time, address, cost estimate/range, and booking/ticket state.
4. The system supports and visibly distinguishes reservation `required`, `preferred`, and `not_needed`; missing certainty is marked `unknown` rather than guessed.
5. A ticket-required occurrence cannot be presented as drop-in; it includes occurrence-specific time and ticket link or a clear unavailable/unknown status.
6. Rideshare selection produces functioning Uber and Lyft handoff links for applicable legs, without collecting payment data.
7. Users can save, reopen, share, and edit a generated itinerary; locked stops persist through replacements.
8. Weather and event timing influence generated results when data is available; missing data is disclosed gracefully.
9. Admin users can correct a venue/event, disable a bad link, and audit the change.
10. The API supports authenticated web clients now and can be consumed by future mobile clients without duplicating business logic.
11. Core flows meet baseline responsive and keyboard-accessibility expectations, and no sensitive couple data is visible without authorization.

## 18. Open questions and launch decisions

1. Which launch city/metro area offers the best combination of nightlife density, reliable data sources, and partnership potential?
2. What is the MVP’s authoritative source for venue hours, events, ticket status, maps/routing, and reservation information?
3. Should users choose budget as total, per person, or both by default—and how should tax, tip, cover charges, and rides be estimated?
4. What level of real-time availability can be substantiated at launch versus linked out with an `unknown` state?
5. Which categories are mandatory for launch: dinner, cocktails, comedy, live music, theater, bowling, axe throwing, trivia, movies, or others?
6. How should alcohol-oriented recommendations be age-gated and made optional?
7. What is the default cancellation/no-show policy messaging when bookings occur outside the product?
8. Will couple profiles be required, optional, or introduced after individual profiles prove engagement?
9. What referral programs and geographic terms permit rideshare, ticket, and reservation attribution?
10. What success threshold determines readiness to expand from a curated launch city to automated multi-city coverage?

