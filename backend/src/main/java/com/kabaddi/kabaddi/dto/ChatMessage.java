package com.kabaddi.kabaddi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {
    private String sender;
    private String content;
    private MessageType type;
    private String matchId;
    private String timestamp; // Can be a string for simplicity in JSON
    // Or use LocalDateTime timestamp;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE
    }
}
