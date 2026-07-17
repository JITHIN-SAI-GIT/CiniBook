package com.cinebook.service;

import com.cinebook.dto.ChatMessageDTO;
import com.cinebook.dto.IntentResultDTO;
import com.cinebook.dto.MovieInfoDTO;
import com.cinebook.entity.Booking;
import com.cinebook.entity.Movie;
import com.cinebook.entity.Showtime;
import com.cinebook.repository.BookingRepository;
import com.cinebook.repository.MovieRepository;
import com.cinebook.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatOrchestratorService {

    private final LlmClientService llmClientService;
    private final ChatMovieDataService movieDataService;
    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;

    public ChatMessageDTO processMessage(ChatMessageDTO incomingMessage) {
        String userMsg = incomingMessage.getMessage();
        IntentResultDTO intentResult = llmClientService.classifyIntent(userMsg);
        
        String contextData = "";
        String intent = intentResult.getIntent();

        try {
            switch (intent) {
                case "MOVIE_INFO":
                    if (intentResult.getMovie() != null && !intentResult.getMovie().isEmpty()) {
                        MovieInfoDTO movieInfo = movieDataService.getMovieInfoFromTMDB(intentResult.getMovie());
                        if (movieInfo != null) {
                            contextData = "Movie Info Found: " + movieInfo.toString();
                        } else {
                            contextData = "Could not find movie details for '" + intentResult.getMovie() + "'.";
                        }
                    } else {
                        contextData = "Please specify a movie title.";
                    }
                    break;
                case "SHOWTIME_QUERY":
                    if (intentResult.getMovie() != null && !intentResult.getMovie().isEmpty()) {
                        // Find movie in local DB
                        List<Movie> movies = movieRepository.findAll().stream()
                                .filter(m -> m.getTitle().toLowerCase().contains(intentResult.getMovie().toLowerCase()))
                                .collect(Collectors.toList());
                        if (!movies.isEmpty()) {
                            Long movieId = movies.get(0).getId();
                            List<Showtime> showtimes = showtimeRepository.findByMovieIdFromToday(movieId, LocalDate.now());
                            if (!showtimes.isEmpty()) {
                                String stData = showtimes.stream()
                                    .limit(5)
                                    .map(s -> s.getTheatre().getName() + " on " + s.getShowDate() + " at " + s.getShowTime())
                                    .collect(Collectors.joining("; "));
                                contextData = "Showtimes for " + movies.get(0).getTitle() + ": " + stData;
                            } else {
                                contextData = "No showtimes available for " + movies.get(0).getTitle() + " right now.";
                            }
                        } else {
                            contextData = "We don't currently have showtimes for a movie named '" + intentResult.getMovie() + "' in our theatres.";
                        }
                    } else {
                        contextData = "Please specify which movie you want showtimes for.";
                    }
                    break;
                case "BOOKING_STATUS":
                    if (incomingMessage.getUserId() != null && !incomingMessage.getUserId().isEmpty()) {
                        try {
                            Long userId = Long.parseLong(incomingMessage.getUserId());
                            List<Booking> bookings = bookingRepository.findByUserIdWithDetails(userId);
                            if (!bookings.isEmpty()) {
                                Booking latest = bookings.get(0);
                                contextData = "Your latest booking is for " + latest.getShowtime().getMovie().getTitle() + 
                                        " at " + latest.getShowtime().getTheatre().getName() + 
                                        " on " + latest.getShowtime().getShowDate() + " " + latest.getShowtime().getShowTime() + 
                                        ". Seats: " + latest.getSeats() + ". Status: " + latest.getStatus();
                            } else {
                                contextData = "You don't have any bookings yet.";
                            }
                        } catch (NumberFormatException e) {
                            contextData = "Invalid user ID provided.";
                        }
                    } else {
                        contextData = "Please log in to view your booking status.";
                    }
                    break;
                case "SEAT_AVAILABILITY":
                    contextData = "To check exact seat availability, please select a showtime from the movie page.";
                    break;
                default:
                    contextData = "I am a movie assistant. I can help with movie details (cast, release date, ratings) and checking showtimes or your bookings.";
                    break;
            }
        } catch (Exception e) {
            log.error("Error processing intent: " + intent, e);
            contextData = "An error occurred while fetching the requested data.";
        }

        String finalResponse = llmClientService.generateResponse(userMsg, contextData);

        return ChatMessageDTO.builder()
                .sessionId(incomingMessage.getSessionId())
                .userId(incomingMessage.getUserId())
                .sender("bot")
                .message(finalResponse)
                .type(intent)
                .timestamp(java.time.LocalDateTime.now())
                .build();
    }
}
