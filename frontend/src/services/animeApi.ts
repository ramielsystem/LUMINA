const ANILIST_URL = 'https://graphql.anilist.co';

export interface Anime {
  id: number;
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  coverImage: {
    extraLarge: string;
    large: string;
    color: string;
  };
  bannerImage: string;
  description: string;
  status: string;
  genres: string[];
  meanScore: number;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
}

const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    media (sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      description
      status
      genres
      meanScore
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
}
`;

export const animeService = {
  async getTrending(page = 1, perPage = 10): Promise<Anime[]> {
    try {
      const response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: TRENDING_QUERY,
          variables: { page, perPage },
        }),
      });

      const json = await response.json();
      return json?.data?.Page?.media || [];
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  async getSeasonReleases(page = 1, perPage = 10): Promise<Anime[]> {
    const SEASON_QUERY = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (sort: START_DATE_DESC, type: ANIME, status: RELEASING) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            color
          }
          bannerImage
          description
          status
          genres
          meanScore
        }
      }
    }
    `;

    try {
      const response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: SEASON_QUERY,
          variables: { page, perPage },
        }),
      });

      const json = await response.json();
      return json?.data?.Page?.media || [];
    } catch (error) {
      console.error('Error fetching season releases:', error);
      return [];
    }
  },

  async searchAnime(query: string): Promise<Anime[]> {
    const SEARCH_QUERY = `
    query ($search: String) {
      Page (perPage: 10) {
        media (search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          bannerImage
        }
      }
    }
    `;

    try {
      const response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { search: query },
        }),
      });

      const json = await response.json();
      return json?.data?.Page?.media || [];
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  }
};
