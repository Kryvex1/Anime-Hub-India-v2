import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeRating,
  normalizePopularity,
  normalizeFreshness,
  calculateGenreMatch,
  calculateLanguageMatch,
  calculateRegionalRelevance,
  calculateContentSimilarity,
  scoreCandidateItem,
  scoreDetailCandidateItem,
} from "../scoring";
import { applyMMRDiversity, extractFranchiseStem } from "../diversity";
import { buildUserTasteProfile } from "../profile";
import type { CardItem } from "../../tmdb";
import type { UserTasteProfile } from "../types";

const mockItemA: CardItem = {
  id: 101,
  title: "Inception: The Beginning",
  originalTitle: "Inception",
  poster: "/inception.jpg",
  backdrop: "/inception_bg.jpg",
  rating: 8.8,
  year: "2010",
  overview:
    "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
  type: "Movie",
  isMovie: true,
  genreIds: [28, 878, 12],
  genres: ["Action", "Science Fiction", "Adventure"],
  popularity: 180,
  voteCount: 34000,
  firstAirDate: "2010-07-15",
  originalLanguage: "en",
};

const mockItemB: CardItem = {
  id: 102,
  title: "Inception: The Sequel",
  originalTitle: "Inception 2",
  poster: "/inception2.jpg",
  backdrop: "/inception2_bg.jpg",
  rating: 7.5,
  year: "2024",
  overview: "Another dream thief corporate heist adventure in deep layers of technology.",
  type: "Movie",
  isMovie: true,
  genreIds: [28, 878],
  genres: ["Action", "Science Fiction"],
  popularity: 95,
  voteCount: 1200,
  firstAirDate: "2024-03-01",
  originalLanguage: "en",
};

const mockItemC: CardItem = {
  id: 103,
  title: "Jawan",
  originalTitle: "Jawan",
  poster: "/jawan.jpg",
  backdrop: "/jawan_bg.jpg",
  rating: 7.2,
  year: "2023",
  overview:
    "A high-octane action thriller highlighting the emotional journey of a man who is set to rectify the wrongs in the society.",
  type: "Movie",
  isMovie: true,
  genreIds: [28, 53],
  genres: ["Action", "Thriller"],
  popularity: 120,
  voteCount: 450,
  firstAirDate: "2023-09-07",
  originalLanguage: "hi",
};

describe("Recommendation Scoring & Normalization", () => {
  it("normalizes Bayesian rating correctly", () => {
    const perfectSingleVote = normalizeRating(10.0, 1);
    const darkKnight = normalizeRating(9.0, 30000);
    // Dark Knight with 30,000 votes should score higher than 1 vote of 10.0
    assert.ok(
      darkKnight > perfectSingleVote,
      "Credible high-vote title should outscore 1-vote title",
    );
    assert.ok(perfectSingleVote >= 0 && perfectSingleVote <= 1);
    assert.ok(darkKnight >= 0 && darkKnight <= 1);
  });

  it("normalizes popularity logarithmically within [0, 1]", () => {
    const zeroPop = normalizePopularity(0);
    const mediumPop = normalizePopularity(100);
    const hugePop = normalizePopularity(3000);
    assert.ok(zeroPop >= 0 && zeroPop <= 1);
    assert.ok(mediumPop > zeroPop);
    assert.ok(hugePop >= mediumPop && hugePop <= 1.0);
  });

  it("computes freshness with exponential half-life decay", () => {
    const brandNew = normalizeFreshness(new Date().toISOString());
    const oldMovie = normalizeFreshness("2000-01-01");
    assert.ok(brandNew > oldMovie, "New release should have higher freshness than 2000 release");
    assert.ok(oldMovie > 0 && oldMovie < 0.2);
  });

  it("calculates genre match and language affinity", () => {
    const genreScore = calculateGenreMatch(["Action", "Science Fiction"], {
      action: 1.0,
      "science fiction": 0.8,
    });
    assert.ok(genreScore > 0.8, "High affinity genres should yield high score");

    const hindiMatch = calculateLanguageMatch("hi", ["hi", "en"]);
    assert.strictEqual(hindiMatch, 1.0, "Primary preferred language gets 1.0");

    const englishMatch = calculateLanguageMatch("en", ["hi", "en"]);
    assert.strictEqual(englishMatch, 0.85, "Secondary preferred language gets 0.85");
  });

  it("calculates regional relevance according to selected country", () => {
    const indiaHindiScore = calculateRegionalRelevance(mockItemC, "IN");
    const usHindiScore = calculateRegionalRelevance(mockItemC, "US");
    assert.ok(
      indiaHindiScore > usHindiScore,
      "Hindi film should have higher regional relevance in India",
    );
  });

  it("calculates content similarity between two items", () => {
    const simAB = calculateContentSimilarity(mockItemA, mockItemB);
    const simAC = calculateContentSimilarity(mockItemA, mockItemC);
    // Inception and Inception 2 share Sci-Fi, Action, English, movie type, and keywords
    assert.ok(
      simAB > simAC,
      "Inception 1 and 2 should have higher similarity than Inception and Jawan",
    );
  });

  it("scores candidate item using multi-signal weighted formula", () => {
    const profile: UserTasteProfile = {
      isColdStart: false,
      totalInteractions: 5,
      country: "IN",
      preferredLanguages: ["hi", "en"],
      genreAffinity: { action: 1.0, "science fiction": 0.8 },
      languageAffinity: { hi: 1.0, en: 0.8 },
      categoryAffinity: { movie: 0.8, series: 0.2, anime: 0 },
      watchedIds: new Set([999]),
      watchlistIds: new Set(),
      recentWatchedItems: [],
    };

    const scored = scoreCandidateItem(mockItemA, profile);
    assert.ok(scored.score > 0 && scored.score <= 1.0);
    assert.ok(scored.breakdown.genreMatch > 0);
    assert.ok(scored.breakdown.qualityRating > 0);
  });
});

describe("MMR Diversity & Repetition Control", () => {
  it("extracts franchise stems correctly", () => {
    assert.strictEqual(extractFranchiseStem("Inception: The Beginning"), "inception");
    assert.strictEqual(extractFranchiseStem("Inception: The Sequel"), "inception");
    assert.strictEqual(extractFranchiseStem("Spider-Man: No Way Home"), "spiderman");
  });

  it("applies MMR diversity and prevents franchise saturation", () => {
    const dummyProfile: UserTasteProfile = {
      isColdStart: true,
      totalInteractions: 0,
      country: "IN",
      preferredLanguages: ["hi", "en"],
      genreAffinity: {},
      languageAffinity: {},
      categoryAffinity: { movie: 1, series: 0, anime: 0 },
      watchedIds: new Set(),
      watchlistIds: new Set(),
      recentWatchedItems: [],
    };

    const candidates = [
      scoreCandidateItem(mockItemA, dummyProfile),
      scoreCandidateItem(mockItemB, dummyProfile),
      scoreCandidateItem(mockItemC, dummyProfile),
    ];

    const diverse = applyMMRDiversity(candidates, 3, {
      lambda: 0.7,
      maxPerFranchise: 1, // Only 1 Inception title allowed in top
      maxPerPrimaryGenre: 2,
    });

    assert.strictEqual(diverse.length, 2);
    const titles = diverse.map((d) => d.title);
    assert.ok(
      titles.includes("Inception: The Beginning") || titles.includes("Inception: The Sequel"),
    );
    assert.ok(titles.includes("Jawan"), "Different franchise Jawan should be selected");
  });
});

describe("User Taste Profile Learning", () => {
  it("handles cold start when no history exists", () => {
    const profile = buildUserTasteProfile([], []);
    assert.strictEqual(profile.isColdStart, true);
    assert.strictEqual(profile.totalInteractions, 0);
    assert.strictEqual(profile.country, "IN");
  });

  it("learns genre and language affinity with recency decay", () => {
    const history = [
      {
        animeId: 101,
        animeTitle: "Inception",
        season: 1,
        episode: 1,
        category: "movie" as const,
        updatedAt: Date.now(),
      },
    ];

    const profile = buildUserTasteProfile(history, [103]);
    assert.strictEqual(profile.isColdStart, false);
    assert.strictEqual(profile.watchedIds.has(101), true);
    assert.strictEqual(profile.watchlistIds.has(103), true);
  });
});

describe("Edge Cases, Missing Metadata & Stability", () => {
  it("handles candidate items with completely missing metadata gracefully", () => {
    const barrenItem: CardItem = {
      id: 9999,
      title: "Unknown Item",
      originalTitle: "Unknown Item",
      poster: "/unknown.jpg",
      backdrop: null,
      rating: 0,
      year: "",
      overview: "",
      type: "Movie",
      genreIds: [],
      genres: [],
    };

    const dummyProfile: UserTasteProfile = {
      isColdStart: true,
      totalInteractions: 0,
      country: "IN",
      preferredLanguages: ["hi"],
      genreAffinity: {},
      languageAffinity: {},
      categoryAffinity: { movie: 1, series: 0, anime: 0 },
      watchedIds: new Set(),
      watchlistIds: new Set(),
      recentWatchedItems: [],
    };

    const scored = scoreCandidateItem(barrenItem, dummyProfile);
    assert.ok(typeof scored.score === "number" && !isNaN(scored.score));
    assert.ok(scored.score >= 0 && scored.score <= 1.0);
  });

  it("produces deterministic, stable ordering for identical inputs", () => {
    const profile: UserTasteProfile = {
      isColdStart: false,
      totalInteractions: 3,
      country: "IN",
      preferredLanguages: ["hi", "en"],
      genreAffinity: { action: 1.0 },
      languageAffinity: { hi: 1.0, en: 0.8 },
      categoryAffinity: { movie: 0.7, series: 0.3, anime: 0 },
      watchedIds: new Set(),
      watchlistIds: new Set(),
      recentWatchedItems: [],
    };

    const run1 = [mockItemA, mockItemB, mockItemC].map((it) => scoreCandidateItem(it, profile));
    const run2 = [mockItemA, mockItemB, mockItemC].map((it) => scoreCandidateItem(it, profile));

    for (let i = 0; i < run1.length; i++) {
      assert.strictEqual(run1[i].score, run2[i].score);
    }
  });

  it("handles empty candidate lists safely", () => {
    const diverse = applyMMRDiversity([], 10);
    assert.deepStrictEqual(diverse, []);
  });
});

describe("Detail Page Intelligent Recommendations & Priorities", () => {
  const tamilRef = {
    id: 501,
    title: "Leo",
    originalTitle: "Leo",
    isMovie: true,
    genres: ["Action", "Thriller"],
    originalLanguage: "ta",
    cast: [
      { id: 1001, name: "Vijay" },
      { id: 1002, name: "Trisha Krishnan" },
    ],
    crew: [{ id: 2001, name: "Lokesh Kanagaraj", job: "Director" }],
    overview:
      "A mild-mannered cafe owner becomes a local hero through an act of violence, shaking up a drug cartel.",
  };

  const tamilSequelCandidate: CardItem = {
    id: 502,
    title: "Leo: Part 2",
    originalTitle: "Leo 2",
    poster: "/leo2.jpg",
    backdrop: "/leo2_bg.jpg",
    rating: 8.0,
    year: "2025",
    overview: "Vijay returns in the continuation of the LCU saga.",
    type: "Movie",
    isMovie: true,
    genreIds: [28, 53],
    genres: ["Action", "Thriller"],
    originalLanguage: "ta",
  };

  const tamilActorCandidate: CardItem = {
    id: 503,
    title: "Master",
    originalTitle: "Master",
    poster: "/master.jpg",
    backdrop: "/master_bg.jpg",
    rating: 7.8,
    year: "2021",
    overview:
      "An alcoholic professor is sent to a juvenile school, where he clashes with a ruthless gangster.",
    type: "Movie",
    isMovie: true,
    genreIds: [28, 53],
    genres: ["Action", "Thriller"],
    originalLanguage: "ta",
  };

  const unrelatedEnglishCandidate: CardItem = {
    id: 504,
    title: "Random Action Hollywood",
    originalTitle: "Random Action Hollywood",
    poster: "/action.jpg",
    backdrop: "/action_bg.jpg",
    rating: 6.5,
    year: "2022",
    overview: "A rogue agent in New York City must recover stolen government documents.",
    type: "Movie",
    isMovie: true,
    genreIds: [28],
    genres: ["Action"],
    originalLanguage: "en",
  };

  it("prioritizes same-franchise sequels at the top", () => {
    const scoredFranchise = scoreDetailCandidateItem(
      tamilSequelCandidate,
      tamilRef,
      undefined,
      undefined,
      {
        isDirectCollectionPart: true,
      },
    );
    const scoredUnrelated = scoreDetailCandidateItem(unrelatedEnglishCandidate, tamilRef);

    assert.ok(
      scoredFranchise.score > scoredUnrelated.score,
      "Same franchise sequel should significantly outscore unrelated movie",
    );
    assert.strictEqual(scoredFranchise.signals.franchise, 1.0);
  });

  it("prioritizes same-language and lead-actor titles over unrelated English titles for Tamil movie", () => {
    const scoredTamil = scoreDetailCandidateItem(
      tamilActorCandidate,
      tamilRef,
      undefined,
      undefined,
      {
        matchedActorId: 1001,
      },
    );
    const scoredEnglish = scoreDetailCandidateItem(unrelatedEnglishCandidate, tamilRef);

    assert.ok(
      scoredTamil.score > scoredEnglish.score,
      "Tamil movie starring Vijay should rank above unrelated English title for Tamil movie",
    );
    assert.ok(scoredTamil.score > scoredEnglish.score * 1.8);
    assert.ok(scoredTamil.score >= 0.5);
  });

  it("handles missing cast, crew, and collection without NaN", () => {
    const sparseRef = { id: 999, title: "Mystery Indie" };
    const scored = scoreDetailCandidateItem(unrelatedEnglishCandidate, sparseRef);
    assert.ok(!isNaN(scored.score));
    assert.ok(scored.score >= 0 && scored.score <= 1.0);
  });
});
