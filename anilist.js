const ENDPOINT = "https://graphql.anilist.co";

/* ---------- Filter options (used by the UI and validated before querying) ---------- */

export const FORMATS = [
  { value: "TV", label: "TV series" },
  { value: "MOVIE", label: "Movies" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "Web (ONA)" },
  { value: "SPECIAL", label: "Specials" },
];

export const SORTS = [
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "POPULARITY_DESC", label: "Most popular" },
  { value: "SCORE_DESC", label: "Top rated" },
  { value: "START_DATE_DESC", label: "Newest" },
];

const FORMAT_LABELS = {
  TV: "TV",
  TV_SHORT: "TV short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

const STATUS_LABELS = {
  FINISHED: "Finished",
  RELEASING: "Airing",
  NOT_YET_RELEASED: "Upcoming",
  CANCELLED: "Cancelled",
  HIATUS: "On hiatus",
};

/* ---------- Small helpers ---------- */

export const formatLabel = (format) => FORMAT_LABELS[format] || format || "";
export const statusLabel = (status) => STATUS_LABELS[status] || status || "";

export function displayTitle(title) {
  return title?.english || title?.romaji || title?.native || "Untitled";
}

// AniList descriptions contain a little HTML (<br>, <i>) and a few entities.
export function cleanDescription(text) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function trailerEmbedUrl(trailer) {
  if (!trailer?.id) return null;
  if (trailer.site === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${trailer.id}`;
  }
  if (trailer.site === "dailymotion") {
    return `https://www.dailymotion.com/embed/video/${trailer.id}`;
  }
  return null;
}

export function streamingLinks(anime) {
  return (anime?.externalLinks ?? []).filter((link) => link.type === "STREAMING");
}

/* ---------- Core request ---------- */

async function request(query, variables = {}, revalidate = 600) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate }, // cache results so we stay well under AniList's rate limit
  });

  if (res.status === 429) {
    throw new Error("AniList is rate limiting requests right now. Wait a minute and try again.");
  }

  const json = await res.json().catch(() => null);

  if (json?.errors?.length) {
    const err = new Error(json.errors[0].message || "AniList returned an error.");
    err.status = json.errors[0].status;
    throw err;
  }
  if (!res.ok || !json) {
    throw new Error(`AniList request failed (${res.status}).`);
  }

  return json.data;
}

/* ---------- Queries ---------- */

const BROWSE_QUERY = `
  query (
    $page: Int
    $perPage: Int
    $search: String
    $genre: String
    $format: MediaFormat
    $year: Int
    $minScore: Int
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage hasNextPage }
      media(
        type: ANIME
        isAdult: false
        search: $search
        genre: $genre
        format: $format
        seasonYear: $year
        averageScore_greater: $minScore
        sort: $sort
      ) {
        id
        title { romaji english }
        coverImage { large }
        format
        seasonYear
        averageScore
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      siteUrl
      isAdult
      title { romaji english native }
      coverImage { extraLarge }
      bannerImage
      description(asHtml: false)
      format
      status
      episodes
      duration
      season
      seasonYear
      averageScore
      genres
      studios(isMain: true) { nodes { name } }
      trailer { id site }
      externalLinks { site url type }
      streamingEpisodes { title url site }
      recommendations(perPage: 6, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            format
            seasonYear
            averageScore
          }
        }
      }
    }
  }
`;

/* ---------- Public functions ---------- */

export async function getGenres() {
  const data = await request(`query { GenreCollection }`, {}, 86400);
  return data.GenreCollection.filter((genre) => genre !== "Hentai");
}

export async function browseAnime({
  search = "",
  genre = "",
  format = "",
  year = "",
  minScore = "",
  sort = "TRENDING_DESC",
  page = 1,
  perPage = 24,
} = {}) {
  const cleanSearch = String(search).trim().slice(0, 100);
  const validSort = SORTS.some((s) => s.value === sort) ? sort : "TRENDING_DESC";
  const validFormat = FORMATS.some((f) => f.value === format) ? format : null;
  const numericYear = Number(year);
  const validYear =
    Number.isInteger(numericYear) && numericYear > 1900 && numericYear < 2100 ? numericYear : null;
  const numericScore = Number(minScore);
  // averageScore_greater is exclusive, so "70+" becomes "greater than 69"
  const validScore = Number.isInteger(numericScore) && numericScore > 0 ? numericScore - 1 : null;

  const data = await request(
    BROWSE_QUERY,
    {
      page,
      perPage,
      search: cleanSearch || null,
      genre: genre || null,
      format: validFormat,
      year: validYear,
      minScore: validScore,
      // When searching, rank by how well the title matches first
      sort: cleanSearch ? ["SEARCH_MATCH", validSort] : [validSort],
    },
    300
  );

  return data.Page;
}

export async function getAnime(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  try {
    const data = await request(DETAIL_QUERY, { id: numericId }, 3600);
    if (!data.Media || data.Media.isAdult) return null;
    return data.Media;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}