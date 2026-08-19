# Anime Haven

Build a premium modern anime streaming website using Node.js as the backend.

The website must be focused only on anime discovery and anime watching.

1. Technology Stack

Use:

- Node.js

- Express.js

- HTML5

- CSS3

- Modern JavaScript

- TMDB API

- Inter font

- SVG icons

Use a clean and scalable project structure.

The website must have a proper Node.js backend so all TMDB API requests are handled securely through the server.

---

2. TMDB API

Use the TMDB API for anime metadata.

TMDB API base URL:

https://api.themoviedb.org/3

Image base URL:

https://image.tmdb.org/t/p/

Use TMDB for:

- Anime posters

- Backdrops

- Titles

- Original titles

- Overview/description

- Ratings

- Genres

- Release dates

- Trending anime

- Popular anime

- Top-rated anime

- Search results

- Seasons

- Episodes metadata

- Cast

- Crew

- Character names

- Cast profile photos

- Related/recommended anime

- Production information

Use the TMDB API key supplied by the project owner, but NEVER expose the key in frontend JavaScript, HTML, CSS, browser requests, GitHub, or public source files.

Store it only inside:

".env"

Example:

TMDB_API_KEY=YOUR_TMDB_API_KEY

The frontend must communicate with the Node.js backend, and the Node.js backend communicates with TMDB.

Never make requests such as:

"https://api.themoviedb.org/3/...?...api_key=SECRET_KEY"

directly from the browser.

Instead create backend routes such as:

"/api/trending"

"/api/popular"

"/api/top-rated"

"/api/search"

"/api/anime/:id"

"/api/anime/:id/credits"

"/api/anime/:id/recommendations"

"/api/anime/:id/seasons"

The API key must remain completely server-side.

---

3. Logo

Use the provided project logo image:

https://imgh.in/host/gvq4wb

Use this logo in:

- Navbar

- Mobile navigation

- Loading screen where appropriate

- Login/profile areas if created later

Do not replace the provided logo with a random generated logo.

---

4. Design Direction

Create a premium cinematic streaming UI inspired by the overall experience of Netflix, but do not directly copy Netflix's branding, logo, assets, or exact interface.

The design should feel like a dedicated anime streaming platform.

Use:

- Dark cinematic theme

- Large anime artwork

- Beautiful gradients

- Glassmorphism where appropriate

- Smooth transitions

- High-quality cards

- Large cinematic hero section

- Modern navigation

- Micro-interactions

- Hover animations

- Smooth page transitions

- Skeleton loading

- Image loading animations

- Responsive layouts

- Mobile-first design

The interface should feel polished and production-ready.

---

5. Font

Use Inter everywhere.

Do NOT use:

- Arial

- Roboto

- system-ui

- "-apple-system"

- browser default system fonts

- generic system UI fonts

The primary typography must be Inter.

---

6. Icons

Use SVG icons only.

Do not use emoji icons.

Use consistent modern SVG icons for:

- Home

- Search

- Anime

- Trending

- Popular

- Genres

- Watchlist

- Profile

- Settings

- Play

- Info

- Arrow

- Back

- Forward

- Volume

- Fullscreen

- More

- Close

- Menu

- Calendar

- Star

- Clock

Icons should have a consistent visual style and smooth hover animations.

---

7. MAIN NAVIGATION

Create a complete navigation system.

Desktop navbar:

- Logo

- Home

- Browse

- Trending

- Popular

- Genres

- Watchlist

- Search

- Profile

Mobile navigation should have a modern bottom navigation bar with SVG icons.

Every navigation item must actually work and open its corresponding section/page.

Do not create fake tabs.

---

8. HOME TAB

The Home page should contain:

Hero Section

Create a large cinematic anime hero section with:

- Backdrop

- Dark gradient overlay

- Anime poster/details

- Anime title

- Original title if available

- Rating

- Release year

- Genres

- Description

- Watch Now button

- More Info button

Add smooth hero animations.

Use TMDB data dynamically.

---

9. HOME CONTENT SECTIONS

Add horizontally scrollable anime rows.

Sections should include:

Trending

Show currently trending anime from TMDB.

Popular

Show popular anime.

Top Rated

Show highly rated anime.

Recently Added / Latest

Show relevant anime based on available TMDB metadata.

Recommended

Show recommended/related anime.

Anime Genres

Create genre-based sections.

Examples:

- Action

- Adventure

- Comedy

- Drama

- Fantasy

- Romance

- Horror

- Mystery

- Sci-Fi

- Sports

- Isekai

Do not hardcode anime information.

Everything should load dynamically through the backend and TMDB.

---

10. ANIME CARD

Every anime card should contain:

- Poster

- Title

- Rating

- Release year

- Type/format when available

Cards should have:

- Smooth hover animation

- Slight scale effect

- Gradient overlay

- Play/info action

- Loading skeleton

- Proper image fallback

Clicking an anime card must open the anime details page/modal.

---

11. ANIME DETAILS PAGE

When the user clicks an anime, open a beautiful detailed anime page.

Load all available information from TMDB.

Display:

- Backdrop

- Poster

- Title

- Original title

- Description

- Rating

- Vote count if available

- Release date

- Genres

- Runtime when available

- Status

- Popularity

- Production companies

- Country/language information when available

Also include:

- Watch button

- Add to Watchlist button

- Share button

- More information

---

12. CAST & CREW

When opening an anime, dynamically load the cast and crew through TMDB.

Display:

Cast

Each person should have:

- Profile photo

- Name

- Character name

Crew

Display relevant crew members with:

- Profile photo

- Name

- Department

- Job

Use horizontal scrolling cards for cast and crew.

Images must load dynamically from TMDB.

If a profile photo does not exist, show a clean placeholder.

---

13. SEASONS

If the anime has multiple seasons, create a beautiful season selector.

Example:

Season 1 | Season 2 | Season 3 | Season 4

The seasons should appear horizontally.

When the user selects a season:

- Animate the current season out

- Animate the new season in

- Load the selected season's information

- Show season poster

- Show season name

- Show season overview

- Show episode count

- Show release date

- Show episode information when available

Use smooth slide/fade animations.

The season selector must work dynamically.

Do not reload the entire website unnecessarily when changing seasons.

---

14. EPISODES

For now, DO NOT create a working video player.

The website is currently only for:

- Anime discovery

- Anime information

- Anime metadata

- Seasons

- Episodes metadata

- Cast

- Crew

- Posters

- Backdrops

- Recommendations

When the user clicks an episode, do not attempt to stream anything yet.

Show a clean temporary state such as:

"Player coming soon."

The actual anime video player will be implemented later.

Do not add fake video sources.

---

15. SEARCH

Create a modern full-screen/search-page experience.

Search should use the Node.js backend.

Flow:

User → Frontend → Node.js API → TMDB → Node.js → Frontend

Search should include:

- Search input

- Search animation

- Search suggestions

- Search results

- Loading skeleton

- Empty state

- Error state

Search results should use the same premium anime cards.

---

16. TRENDING TAB

Create a dedicated Trending page.

Display:

- Trending anime

- Ranking

- Posters

- Titles

- Ratings

- Release information

Use TMDB's trending endpoints.

Add smooth horizontal/vertical animations.

---

17. POPULAR TAB

Create a dedicated Popular Anime page.

Load popular anime dynamically.

Use:

- Grid layout

- Responsive cards

- Pagination or load-more system

- Skeleton loading

- Smooth animations

---

18. GENRES TAB

Create a complete genre browsing page.

Display anime genres in attractive cards.

When a genre is clicked:

Open a dedicated anime listing for that genre.

Examples:

Action

Adventure

Comedy

Drama

Fantasy

Horror

Mystery

Romance

Sci-Fi

Sports

Supernatural

Isekai

---

19. WATCHLIST TAB

Create the Watchlist UI structure.

For now, use local browser storage if authentication/database has not been implemented.

Users should be able to:

- Add anime

- Remove anime

- View saved anime

Make the UI ready to migrate to a real database later.

---

20. LOADING SYSTEM

Create beautiful loading states.

Use:

- Skeleton cards

- Shimmer animation

- Backdrop loading

- Poster loading

- Cast loading

- Crew loading

- Season loading

Never leave the page blank while data is loading.

---

21. ERROR HANDLING

Create proper error states for:

- TMDB API failure

- Network failure

- Invalid anime ID

- Missing images

- Empty search results

- Server errors

Show a clean message and retry button.

---

22. ANIMATIONS

The website should have high-quality animations.

Use smooth animations for:

- Page transitions

- Navbar

- Anime cards

- Hero section

- Search

- Modals

- Season switching

- Cast scrolling

- Loading states

- Buttons

- Hover states

- Image loading

Animations should remain smooth on mobile devices.

Do not overuse animations to the point where the interface becomes slow.

---

23. RESPONSIVE DESIGN

The website must work perfectly on:

- Android phones

- iPhones

- Tablets

- Laptops

- Desktop monitors

Mobile layout should not simply be a scaled-down desktop layout.

Create a proper mobile experience.

---

24. BACKEND API STRUCTURE

Create Node.js/Express API routes similar to:

GET "/api/trending"

GET "/api/popular"

GET "/api/top-rated"

GET "/api/search?q=anime"

GET "/api/anime/:id"

GET "/api/anime/:id/credits"

GET "/api/anime/:id/recommendations"

GET "/api/anime/:id/seasons"

GET "/api/anime/:id/season/:seasonNumber"

The backend should handle TMDB requests and return clean JSON to the frontend.

---

25. SECURITY

Implement:

- ".env"

- ".gitignore"

- Server-side API key

- Request validation

- Rate limiting

- Proper CORS configuration

- Safe error responses

- No secret information in frontend source

- No API key in HTML

- No API key in CSS

- No API key in client JavaScript

- No API key in Git commits

The browser should never be able to retrieve the TMDB secret key.

---

26. PROJECT STRUCTURE

Use a clean structure similar to:

/server

/routes

/services

/controllers

/utils

/public

/css

/js

/assets

.env

.gitignore

package.json

server.js

Keep backend and frontend responsibilities separate.

---

27. IMPORTANT CURRENT LIMITATION

This version should NOT include the actual anime streaming player.

The Watch button and episode buttons can currently open a temporary "Player Coming Soon" interface.

Build the entire UI and metadata experience now so the real player can be integrated later without redesigning the website.

---

28. FINAL QUALITY REQUIREMENT

The final website should feel like a real premium anime streaming platform, not a basic HTML project.

Prioritize:

- Modern UI

- High-quality animations

- Smooth interactions

- Fast loading

- Secure Node.js backend

- Proper TMDB integration

- Dynamic anime data

- Cast and crew photos

- Season switching

- Responsive design

- Inter typography

- SVG icons

- Cinematic anime artwork

Every tab must work.

Every anime card must open its corresponding anime information.

Every anime detail page must dynamically load available TMDB information.

Season switching must work with smooth animation.

The video player should intentionally remain disabled for this version and be implemented later.

My tmdb api is : ef311eb0b9b07b9c73e9fb0a732cc150

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7397d04-e27e-4dbe-9e13-e829e58470b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
