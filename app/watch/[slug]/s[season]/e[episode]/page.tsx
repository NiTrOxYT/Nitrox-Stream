import { Metadata } from 'next';
import { LiveProvider } from '@/lib/provider';
import EpisodePlayer from './player';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; season: string; episode: string }>;
}): Promise<Metadata> {
  const { slug, season, episode } = await params;

  let title = slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  let description = '';

  try {
    const provider = new LiveProvider();
    const show = await provider.getTvShow(slug);
    if (show) {
      title = show.title;
      description = show.description || '';
    }
  } catch {}

  return {
    title: `${title} - Season ${season} Episode ${episode} | Nitrox Stream`,
    description: description || `Watch ${title} Season ${season} Episode ${episode}`,
    openGraph: {
      title: `${title} - S${season}:E${episode}`,
      description: description || `Watch ${title} Season ${season} Episode ${episode}`,
    },
  };
}

export default function Page() {
  return <EpisodePlayer />;
}
