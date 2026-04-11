package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.entity.ChatMessage;
import com.kabaddi.kabaddi.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat/{matchId}/sendMessage")
    @SendTo("/topic/chat/{matchId}")
    public ChatMessage sendMessage(@DestinationVariable String matchId, @Payload ChatMessage chatMessage, Principal principal) {
        if (principal == null) {
            throw new org.springframework.security.access.AccessDeniedException("Must be logged in to chat");
        }
        // Add server-side timestamp
        chatMessage.setSender(principal.getName()); // Enforce sender identity
        chatMessage.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        chatMessage.setMatchId(matchId);
        chatMessage.setCreatedAt(LocalDateTime.now());

        // Save to database
        chatMessageRepository.save(chatMessage);

        return chatMessage;
    }

    @MessageMapping("/chat/{matchId}/addUser")
    @SendTo("/topic/chat/{matchId}")
    public ChatMessage addUser(@DestinationVariable String matchId, @Payload ChatMessage chatMessage,
            SimpMessageHeaderAccessor headerAccessor, Principal principal) {
        if (principal == null) {
            throw new org.springframework.security.access.AccessDeniedException("Must be logged in to join chat");
        }
        // Add username in web socket session
        chatMessage.setSender(principal.getName()); // Enforce sender identity
        headerAccessor.getSessionAttributes().put("username", principal.getName());
        headerAccessor.getSessionAttributes().put("matchId", matchId); // Store matchId too
        return chatMessage;
    }

    @GetMapping("/chat/{matchId}/history")
    @ResponseBody
    public List<ChatMessage> getChatHistory(
            @PathVariable String matchId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "100") int size) {
        
        size = Math.min(size, 100);
        org.springframework.data.domain.PageRequest pageRequest = 
            org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
            
        return chatMessageRepository.findByMatchId(matchId, pageRequest);
    }
}
