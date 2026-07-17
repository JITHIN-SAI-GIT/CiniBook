package com.cinebook.service;

import com.cinebook.dto.IntentResultDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@SuppressWarnings({"unchecked", "rawtypes"})
public class LlmClientService {

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public LlmClientService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    private String callGemini(String prompt) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.error("GEMINI_API_KEY is missing. Chatbot requires an LLM.");
            return null;
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.3
            )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map> candidates = (List<Map>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map content = (Map) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map> parts = (List<Map>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            return (String) parts.get(0).get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Gemini API", e);
        }
        return null;
    }

    public IntentResultDTO classifyIntent(String userMessage) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return fallbackClassifyIntent(userMessage);
        }

        String prompt = "You are Cinibook's assistant. Classify the user's message into one of:\n" +
                "MOVIE_INFO, SHOWTIME_QUERY, BOOKING_STATUS, SEAT_AVAILABILITY, GENERAL.\n" +
                "Extract any movie title, date, or theatre name mentioned.\n" +
                "Respond ONLY in valid JSON format matching this exact structure: {\"intent\": \"...\", \"movie\": \"...\", \"date\": \"...\", \"theatre\": \"...\"}\n" +
                "User Message: \"" + userMessage + "\"";

        String jsonResponse = callGemini(prompt);
        if (jsonResponse == null) return fallbackClassifyIntent(userMessage);
        
        // Clean markdown JSON formatting if present
        jsonResponse = jsonResponse.replaceAll("```json", "").replaceAll("```", "").trim();

        try {
            return objectMapper.readValue(jsonResponse, IntentResultDTO.class);
        } catch (Exception e) {
            log.error("Failed to parse intent JSON: " + jsonResponse, e);
            return fallbackClassifyIntent(userMessage);
        }
    }

    private IntentResultDTO fallbackClassifyIntent(String msg) {
        String lower = msg.toLowerCase();
        IntentResultDTO.IntentResultDTOBuilder builder = IntentResultDTO.builder();
        
        if (lower.contains("booking") || lower.contains("my ticket") || lower.contains("status")) {
            builder.intent("BOOKING_STATUS");
        } else if (lower.contains("showtime") || lower.contains("when is") || lower.contains("timing")) {
            builder.intent("SHOWTIME_QUERY");
        } else if (lower.contains("seat") || lower.contains("available")) {
            builder.intent("SEAT_AVAILABILITY");
        } else if (lower.contains("release") || lower.contains("cast") || lower.contains("actor") || lower.contains("budget") || lower.contains("rating") || lower.contains("plot") || lower.contains("director")) {
            builder.intent("MOVIE_INFO");
        } else {
            builder.intent("GENERAL");
        }
        
        // Very rudimentary movie extraction for demo fallback
        String[] words = msg.split(" ");
        if (words.length > 2 && builder.build().getIntent().equals("MOVIE_INFO") || builder.build().getIntent().equals("SHOWTIME_QUERY")) {
            // Assume the last word or two is the movie name if we don't have an LLM
            builder.movie(words[words.length-1].replace("?", ""));
        }
        
        return builder.build();
    }

    public String generateResponse(String userMessage, String contextData) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            return "Here is what I found: " + contextData;
        }

        String prompt = "You are Cinibook's friendly movie assistant.\n" +
                "A user asked: \"" + userMessage + "\"\n" +
                "Here is the context data retrieved from our database or external API: " + contextData + "\n" +
                "Formulate a concise, friendly, and helpful response based ONLY on the provided context data. Do not hallucinate or invent information.";

        String response = callGemini(prompt);
        return response != null ? response : ("Here is what I found: " + contextData);
    }
}
