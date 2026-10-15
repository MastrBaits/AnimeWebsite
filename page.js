import Link from "next/link";
// Fixed: Changed from getHomeAnime to the statically known getAnime
import { getAnime } from "@/lib/anilist";

export default async function Home() {
  // Fixed: Updated to call the correct function
  const data = await getAnime();

  const currentSeason = data?.season?.media || [];
  const topAnime = data?.top?.media || [];

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <h1 className="text-4xl font-bold mb-8">Anime Website</h1>

      {currentSeason.length === 0 && topAnime.length === 0 && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-4 rounded-lg mb-8">
          Failed to load data from AniList. Please try again later.
        </div>
      )}

      {/* Currently Airing */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-5">Currently Airing</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {currentSeason.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* Top Rated */}
      <section>
        <h2 className="text-2xl font-semibold mb-5">Top Rated Anime</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {topAnime.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AnimeCard({ anime }) {
  const title = anime.title.english || anime.title.romaji;

  return (
    <Link href={`/anime/${anime.id}`} className="group">
      <div className="bg-zinc-900 rounded-xl overflow-hidden hover:scale-105 transition duration-200">
        <img
          src={anime.coverImage.large}
          alt={title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-400">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            ★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}
          </p>
        </div>
      </div>
    </Link>
  );
}
