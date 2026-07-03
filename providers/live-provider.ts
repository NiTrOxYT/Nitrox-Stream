import { ContentProvider } from "./content-provider";
import { Movie } from "@/types/movie";

export class LiveProvider implements ContentProvider {

  async search(query: string): Promise<Movie[]> {

    return [

      {
        id: "1",
        title: "Avengers Endgame",
        slug: "avengers-endgame",
        poster: "",
        backdrop: "",
        year: 2019,
        genres: ["Action"],
        rating: 8.7
      },

      {
        id: "2",
        title: "Iron Man",
        slug: "iron-man",
        poster: "",
        backdrop: "",
        year: 2008,
        genres: ["Action"],
        rating: 8.2
      }

    ];

  }

  async getMovie(slug: string): Promise<Movie | null> {

    return {
      id: "1",
      title: slug,
      slug,
      poster: "",
      backdrop: "",
      year: 2026,
      genres: [],
      rating: 0
    };

  }

}