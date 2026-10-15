import Image from "next/image";
import Link from "next/link";
import { displayTitle, formatLabel } from "@/lib/anilist";

export default function AnimeCard({ anime }) {
  const title = displayTitle(anime.title);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  return (
    <Link href={`/anime/${anime.id}`} className="card">
      <div className="poster">
        {anime.coverImage?.large && (
          <Image
            src={anime.coverImage.large}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 200px"
          />
        )}
        {score && (
          <span className="score" aria-label={`Score ${score} out of 10`}>
            {score}
          </span>
        )}
      </div>
      <p className="card-title">{title}</p>
      <p className="card-meta">
        {anime.format && <span>{formatLabel(anime.format)}</span>}
        {anime.seasonYear && <span>{anime.seasonYear}</span>}
      </p>
    </Link>
  );
}