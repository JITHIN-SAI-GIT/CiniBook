package com.cinebook.controller;

import com.cinebook.dto.ChatMessageDTO;
import com.cinebook.service.ChatOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Slf4j
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatOrchestratorService orchestratorService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void handleChatMessage(@Payload ChatMessageDTO incomingMessage, SimpMessageHeaderAccessor headerAccessor) {
        log.info("Received chat message from user {}: {}", incomingMessage.getUserId(), incomingMessage.getMessage());
        
        // Immediately echo back a typing indicator or just process it synchronously (or async)
        // For simplicity, we process it here, but in production, this could be handed off to an Async service
        
        try {
            ChatMessageDTO response = orchestratorService.processMessage(incomingMessage);
            
            // Send to the specific session topic
            String destination = "/topic/chat/" + incomingMessage.getSessionId();
            messagingTemplate.convertAndSend(destination, response);
            
        } catch (Exception e) {
            log.error("Failed to process chat message", e);
            ChatMessageDTO errorResponse = ChatMessageDTO.builder()
                    .sessionId(incomingMessage.getSessionId())
                    .userId(incomingMessage.getUserId())
                    .sender("bot")
                    .message("I'm having trouble processing that right now. Please try again.")
                    .type("ERROR")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            messagingTemplate.convertAndSend("/topic/chat/" + incomingMessage.getSessionId(), errorResponse);
        }
    }

    @PostMapping("/api/chat")
    public ChatMessageDTO handleChatMessageHttp(@RequestBody ChatMessageDTO incomingMessage) {
        log.info("Received HTTP chat message from user {}: {}", incomingMessage.getUserId(), incomingMessage.getMessage());
        try {
            return orchestratorService.processMessage(incomingMessage);
        } catch (Exception e) {
            log.error("Failed to process HTTP chat message", e);
            return ChatMessageDTO.builder()
                    .sessionId(incomingMessage.getSessionId())
                    .userId(incomingMessage.getUserId())
                    .sender("bot")
                    .message("I'm having trouble processing that right now. Please try again.")
                    .type("ERROR")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
        }
    }
}
