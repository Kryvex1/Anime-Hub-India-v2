# DesiDubAnime In-App Portal & 7Shows Brand Badge Integration

This feature integrates a dedicated in-app anime portal (`/desidubanime`) accessed via a prominent center anime character button in the mobile bottom navigation bar, enables admin-level series URL mapping so entire anime web series can be streamed seamlessly within the app domain without breaking domain-locked WebView wrappers, and restores the 7Shows brand badge on anime movies configured with custom links.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following critical decision in Phase 1:
> - **7Shows Brand Badge on Title Cards**: The 7Shows brand badge will appear specifically on **anime movies that have custom links configured**.
> - **In-App Domain Constraint**: External redirect is strictly avoided because the user's mobile wrapper locks the domain. All DesiDubAnime experiences will run seamlessly inside the app domain (`/desidubanime`).

- **Confirmed Decision 1**: Center Anime Character Button in bottom navigation bar to launch the in-app portal.
- **Confirmed Decision 2**: In-app embedded portal route (`/desidubanime`) that hosts `https://www.desidubanime.me/` safely inside our website domain with top bar controls.
- **Confirmed Decision 3**: Admin support to link an entire DesiDubAnime series URL directly to an anime title.
- **Confirmed Decision 4**: Fix 7Shows brand badge visibility for anime movies with custom streams in `card.tsx`.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Bottom Nav Center Anime Button**: Adds a custom center button with an anime character icon/avatar right between Browse and Trending in the mobile navigation bar.
  2. **In-App Portal (`/desidubanime`)**: Opens `https://www.desidubanime.me/` inside an in-app viewer under our domain with back navigation, reload, and header controls. No external redirection occurs.
  3. **Admin Series Linker**: Allows admins to paste a DesiDubAnime series URL in the custom stream modal. Users can stream or browse the series directly within the player/portal.
  4. **7Shows Brand Badge Fix**: Detects anime movies that have custom streams configured in Firebase and displays the official 7Shows brand badge on poster cards.
- **Target Audience / Persona**: Users streaming anime on mobile web apps or domain-locked WebView applications who want direct access to DesiDubAnime dubs without leaving the app.
- **Key Value**: Preserves PWA/WebView domain lock while providing comprehensive access to DesiDubAnime episodes and movies.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - *Flow 1 (Bottom Nav)*: User taps the glowing center anime character button in the bottom navigation -> instantly navigates to `/desidubanime` inside 7Shows.
  - *Flow 2 (Admin Series Linking)*: Admin opens Custom Stream Modal for an anime series/movie -> enters DesiDubAnime URL -> saves to Firebase.
  - *Flow 3 (Watching Linked Anime)*: When user opens the anime, the stream or portal loads in-app directly under our domain.
  - *Flow 4 (7Shows Badge)*: Anime movies with custom links prominently show the 7Shows brand badge in the top-left corner of poster cards.

- **Visual Identity & Theme**:
  - *Center Anime Button*: Circular badge with high-res anime character artwork, subtle red/amber glowing border (`#E50914`), floating slightly above the navigation bar for high tap affordability.
  - *Portal Header*: Compact dark glassmorphism header (`#070A12`/90) with Back button, Logo emblem, DesiDubAnime indicator, and Reload action.
  - *Letterbox & Card Badges*: Clean 7Shows brand badge matching the header logo emblem with golden red gradient.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: In-App Embedded View vs. External Window Redirect**
  - *Chosen Approach*: Embedded route (`/desidubanime`) with full-viewport responsive frame.
  - *Why*: The user's mobile web app explicitly locks the main domain. External redirects break the app shell.
- **Decision 2: Series-Level URL Mapping in Custom Stream Data**
  - *Chosen Approach*: Support `desidubUrl` in Firebase `CustomStreamData` so admins can attach a single series link rather than entering 50+ episode links manually.
  - *Why*: Reduces admin effort dramatically while providing instant multi-episode access.
- **Decision 3: Card Badge Condition Adjustment**
  - *Chosen Approach*: Update `card.tsx` to check both movie and anime movie categories against `customStreams` doc IDs.
  - *Why*: Anime movies previously failed the check due to category classification mismatches (`category === "anime"` vs `isMovie`).

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          7Shows App Architecture                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│  BottomNav   │             │ /desidubanime│            │   Card &     │
│ (Center Icon)│             │ (In-App View)│            │ Brand Badge  │
└──────────────┘             └──────────────┘            └──────────────┘
       │                            │                           │
       │ Taps center avatar         │ Renders within domain     │ Checks
       ▼                            ▼                           ▼
 Navigates to /desidubanime   Full viewport viewer       useCustomStreamIds()
                              with 7Shows app controls    for anime movies
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │     Firebase Firestore       │
                     │ (customStreams: desidubUrl)  │
                     └──────────────────────────────┘
```

- **Routes & Views**:
  - Create `/src/routes/desidubanime.tsx` with header controls, reload, and full viewport container.
  - Update `/src/components/anime/nav.tsx` to place the anime character button at the center of the bottom navigation bar.
- **Admin & Firebase**:
  - Update `CustomStreamModal` in `/src/components/anime/custom-stream-modal.tsx` to include an option for DesiDubAnime URL mapping.
  - Update `src/components/anime/card.tsx` to ensure anime movies with custom links display the 7Shows badge.
