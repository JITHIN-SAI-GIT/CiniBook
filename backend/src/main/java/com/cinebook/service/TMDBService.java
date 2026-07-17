package com.cinebook.service;

import com.cinebook.entity.Movie;
import com.cinebook.repository.MovieRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@SuppressWarnings({"unchecked", "rawtypes"})
public class TMDBService {

    @Value("${TMDB_API_KEY:YOUR_TMDB_API_KEY_HERE}")
    private String tmdbApiKey;

    private final String BASE_URL = "https://api.themoviedb.org/3";
    private final RestTemplate restTemplate;
    private final MovieRepository movieRepository;

    public TMDBService(MovieRepository movieRepository) {
        this.restTemplate = new RestTemplate();
        this.movieRepository = movieRepository;
    }

    public boolean isConfigured() {
        return tmdbApiKey != null && !tmdbApiKey.contains("YOUR_TMDB_API_KEY_HERE");
    }

    @Transactional
    public void syncNowPlayingMovies() {
        if (!isConfigured()) {
            log.warn("TMDB_API_KEY is not configured. Skipping movie sync.");
            return;
        }
        
        log.info("Starting TMDB movie sync for Now Playing...");
        try {
            String url = BASE_URL + "/movie/now_playing?api_key=" + tmdbApiKey + "&language=te-IN&region=IN";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("results");
                
                for (Map<String, Object> item : results) {
                    processMovieData(item);
                }
                log.info("Successfully synced {} movies from TMDB.", results.size());
            }
        } catch (Exception e) {
            log.error("Failed to sync movies from TMDB", e);
        }
    }

    private void processMovieData(Map<String, Object> tmdbData) {
        Long tmdbId = ((Number) tmdbData.get("id")).longValue();
        
        // Fetch detailed data including cast/crew and videos
        String detailsUrl = BASE_URL + "/movie/" + tmdbId + "?api_key=" + tmdbApiKey + "&append_to_response=credits,videos";
        
        try {
            ResponseEntity<Map> detailsResponse = restTemplate.getForEntity(detailsUrl, Map.class);
            if (!detailsResponse.getStatusCode().is2xxSuccessful() || detailsResponse.getBody() == null) {
                return;
            }
            
            Map<String, Object> details = detailsResponse.getBody();
            
            Optional<Movie> existingOpt = movieRepository.findByTmdbId(tmdbId);
            Movie movie = existingOpt.orElse(new Movie());
            
            movie.setTmdbId(tmdbId);
            movie.setTitle((String) details.get("title"));
            movie.setSynopsis((String) details.get("overview"));
            movie.setReleaseDate((String) details.get("release_date"));
            movie.setLanguage((String) details.get("original_language"));
            
            if (details.get("runtime") != null) {
                movie.setDuration(((Number) details.get("runtime")).intValue());
            }
            if (details.get("vote_average") != null) {
                movie.setRating(((Number) details.get("vote_average")).doubleValue());
            }
            
            String posterPath = (String) details.get("poster_path");
            if (posterPath != null) {
                movie.setPosterUrl("https://image.tmdb.org/t/p/w500" + posterPath);
            }
            
            String backdropPath = (String) details.get("backdrop_path");
            if (backdropPath != null) {
                movie.setBannerUrl("https://image.tmdb.org/t/p/original" + backdropPath);
            }
            
            // Extract Genres
            List<Map<String, Object>> genres = (List<Map<String, Object>>) details.get("genres");
            if (genres != null && !genres.isEmpty()) {
                List<String> genreNames = new ArrayList<>();
                for (Map<String, Object> g : genres) {
                    genreNames.add((String) g.get("name"));
                }
                movie.setGenre(String.join("/", genreNames));
            } else {
                movie.setGenre("Unknown");
            }
            
            // Extract Credits (Cast & Crew)
            Map<String, Object> credits = (Map<String, Object>) details.get("credits");
            if (credits != null) {
                List<Map<String, Object>> cast = (List<Map<String, Object>>) credits.get("cast");
                if (cast != null) {
                    List<String> castList = new ArrayList<>();
                    for (int i = 0; i < Math.min(cast.size(), 8); i++) {
                        castList.add((String) cast.get(i).get("name"));
                    }
                    movie.setCastList(castList);
                }
                
                List<Map<String, Object>> crew = (List<Map<String, Object>>) credits.get("crew");
                if (crew != null) {
                    List<String> crewList = new ArrayList<>();
                    for (Map<String, Object> member : crew) {
                        String job = (String) member.get("job");
                        if ("Director".equals(job)) {
                            movie.setDirector((String) member.get("name"));
                        }
                        if (crewList.size() < 5 && ("Producer".equals(job) || "Screenplay".equals(job) || "Original Music Composer".equals(job))) {
                            crewList.add((String) member.get("name"));
                        }
                    }
                    movie.setCrewList(crewList);
                }
            }
            
            // Extract Videos (Trailer)
            Map<String, Object> videos = (Map<String, Object>) details.get("videos");
            if (videos != null) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) videos.get("results");
                if (results != null) {
                    for (Map<String, Object> video : results) {
                        if ("Trailer".equals(video.get("type")) && "YouTube".equals(video.get("site"))) {
                            movie.setTrailerUrl("https://www.youtube.com/embed/" + video.get("key"));
                            break;
                        }
                    }
                }
            }
            
            movie.setIsTrending(true);
            movieRepository.save(movie);
            
        } catch (Exception e) {
            log.error("Failed to fetch details for movie id: {}", tmdbId, e);
        }
    }

    // --- New Proxy Methods for Frontend ---

    @org.springframework.cache.annotation.Cacheable("tmdb_now_playing")
    public Map<String, Object> getNowPlaying(int page) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/movie/now_playing?api_key=" + tmdbApiKey + "&language=en-US&page=" + page + "&region=IN";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable("tmdb_upcoming")
    public Map<String, Object> getUpcoming(int page) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/movie/upcoming?api_key=" + tmdbApiKey + "&language=en-US&page=" + page + "&region=IN";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable("tmdb_popular")
    public Map<String, Object> getPopular(int page) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/movie/popular?api_key=" + tmdbApiKey + "&language=en-US&page=" + page + "&region=IN";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable("tmdb_trending")
    public Map<String, Object> getTrending() {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/trending/movie/day?api_key=" + tmdbApiKey + "&language=en-US";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable("tmdb_top_rated")
    public Map<String, Object> getTopRated(int page) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/movie/top_rated?api_key=" + tmdbApiKey + "&language=en-US&page=" + page + "&region=IN";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable(value = "tmdb_search", key = "#query + #page")
    public Map<String, Object> searchMovies(String query, int page) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/search/movie?api_key=" + tmdbApiKey + "&language=en-US&query=" + query + "&page=" + page + "&include_adult=false";
        return restTemplate.getForObject(url, Map.class);
    }

    @org.springframework.cache.annotation.Cacheable("tmdb_movie_details")
    public Map<String, Object> getMovieDetails(long tmdbId) {
        if (!isConfigured()) return Map.of("error", "TMDB API Key not configured");
        String url = BASE_URL + "/movie/" + tmdbId + "?api_key=" + tmdbApiKey + "&append_to_response=credits,videos,similar";
        return restTemplate.getForObject(url, Map.class);
    }

    @Transactional
    public Movie importMovieFromTmdb(long tmdbId) {
        Optional<Movie> existingOpt = movieRepository.findByTmdbId(tmdbId);
        if (existingOpt.isPresent()) {
            return existingOpt.get();
        }

        if (isConfigured()) {
            try {
                String url = BASE_URL + "/movie/" + tmdbId + "?api_key=" + tmdbApiKey + "&append_to_response=credits,videos";
                ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map<String, Object> details = response.getBody();
                    Movie movie = new Movie();
                    movie.setTmdbId(tmdbId);
                    movie.setTitle((String) details.get("title"));
                    movie.setSynopsis((String) details.get("overview"));
                    movie.setReleaseDate((String) details.get("release_date"));
                    movie.setLanguage((String) details.get("original_language"));

                    if (details.get("runtime") != null) {
                        movie.setDuration(((Number) details.get("runtime")).intValue());
                    } else {
                        movie.setDuration(120);
                    }
                    if (details.get("vote_average") != null) {
                        movie.setRating(((Number) details.get("vote_average")).doubleValue());
                    } else {
                        movie.setRating(7.5);
                    }

                    String posterPath = (String) details.get("poster_path");
                    if (posterPath != null) {
                        movie.setPosterUrl("https://image.tmdb.org/t/p/w500" + posterPath);
                    } else {
                        movie.setPosterUrl("https://placehold.co/500x750/1a1a2e/666");
                    }

                    String backdropPath = (String) details.get("backdrop_path");
                    if (backdropPath != null) {
                        movie.setBannerUrl("https://image.tmdb.org/t/p/original" + backdropPath);
                    } else {
                        movie.setBannerUrl("https://placehold.co/1920x1080/1a1a2e/666");
                    }

                    // Extract Genres
                    List<Map<String, Object>> genres = (List<Map<String, Object>>) details.get("genres");
                    if (genres != null && !genres.isEmpty()) {
                        List<String> genreNames = new ArrayList<>();
                        for (Map<String, Object> g : genres) {
                            genreNames.add((String) g.get("name"));
                        }
                        movie.setGenre(String.join("/", genreNames));
                    } else {
                        movie.setGenre("Unknown");
                    }

                    movie.setIsTrending(false);
                    movie.setIsOtt(false);
                    return movieRepository.save(movie);
                }
            } catch (Exception e) {
                log.error("Failed to import movie from TMDB: " + tmdbId, e);
            }
        }

        // Return stub if fetch fails or TMDB is not configured
        Movie stub = new Movie();
        stub.setTmdbId(tmdbId);
        stub.setTitle("Movie Booking Demo");
        stub.setSynopsis("Booking demo preview.");
        stub.setReleaseDate(LocalDate.now().toString());
        stub.setLanguage("en");
        stub.setDuration(120);
        stub.setRating(8.0);
        stub.setGenre("Action / Sci-Fi");
        stub.setPosterUrl("https://placehold.co/500x750/1a1a2e/666");
        stub.setBannerUrl("https://placehold.co/1920x1080/1a1a2e/666");
        stub.setIsTrending(false);
        stub.setIsOtt(false);
        return movieRepository.save(stub);
    }
}

