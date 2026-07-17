package com.cinebook.service;

import com.cinebook.dto.MovieInfoDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@SuppressWarnings({"unchecked", "rawtypes"})
public class ChatMovieDataService {

    @Value("${TMDB_API_KEY:YOUR_TMDB_API_KEY_HERE}")
    private String tmdbApiKey;

    private final String BASE_URL = "https://api.themoviedb.org/3";
    private final RestTemplate restTemplate;

    public ChatMovieDataService() {
        this.restTemplate = new RestTemplate();
    }

    @Cacheable(value = "movieData", key = "#title.toLowerCase()")
    public MovieInfoDTO getMovieInfoFromTMDB(String title) {
        if (tmdbApiKey.contains("YOUR_TMDB")) {
            log.warn("TMDB API key not configured");
            return null;
        }

        try {
            // 1. Search for the movie
            String searchUrl = BASE_URL + "/search/movie?api_key=" + tmdbApiKey + "&query=" + title;
            ResponseEntity<Map> searchResponse = restTemplate.getForEntity(searchUrl, Map.class);

            if (!searchResponse.getStatusCode().is2xxSuccessful() || searchResponse.getBody() == null) {
                return null;
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) searchResponse.getBody().get("results");
            if (results == null || results.isEmpty()) {
                return null;
            }

            // Get the first result's ID
            Number tmdbId = (Number) results.get(0).get("id");

            // 2. Get detailed info with credits
            String detailsUrl = BASE_URL + "/movie/" + tmdbId + "?api_key=" + tmdbApiKey + "&append_to_response=credits";
            ResponseEntity<Map> detailsResponse = restTemplate.getForEntity(detailsUrl, Map.class);

            if (!detailsResponse.getStatusCode().is2xxSuccessful() || detailsResponse.getBody() == null) {
                return null;
            }

            Map<String, Object> details = detailsResponse.getBody();
            MovieInfoDTO dto = new MovieInfoDTO();
            dto.setTitle((String) details.get("title"));
            dto.setReleaseDate((String) details.get("release_date"));
            dto.setPlot((String) details.get("overview"));
            
            if (details.get("budget") != null) {
                dto.setBudget(((Number) details.get("budget")).longValue());
            }
            if (details.get("revenue") != null) {
                dto.setRevenue(((Number) details.get("revenue")).longValue());
            }
            if (details.get("vote_average") != null) {
                dto.setImdbRating(((Number) details.get("vote_average")).doubleValue()); // Using TMDB rating as fallback for IMDb
            }
            
            String posterPath = (String) details.get("poster_path");
            if (posterPath != null) {
                dto.setPosterUrl("https://image.tmdb.org/t/p/w500" + posterPath);
            }

            // Parse credits for cast and director
            Map<String, Object> credits = (Map<String, Object>) details.get("credits");
            if (credits != null) {
                List<Map<String, Object>> cast = (List<Map<String, Object>>) credits.get("cast");
                if (cast != null) {
                    List<String> actorNames = new ArrayList<>();
                    for (int i = 0; i < Math.min(cast.size(), 5); i++) {
                        actorNames.add((String) cast.get(i).get("name"));
                    }
                    dto.setCast(actorNames);
                }

                List<Map<String, Object>> crew = (List<Map<String, Object>>) credits.get("crew");
                if (crew != null) {
                    for (Map<String, Object> member : crew) {
                        if ("Director".equals(member.get("job"))) {
                            dto.setDirector((String) member.get("name"));
                            break;
                        }
                    }
                }
            }

            return dto;
        } catch (Exception e) {
            log.error("Failed to fetch movie data for chatbot: " + title, e);
            return null;
        }
    }
}
