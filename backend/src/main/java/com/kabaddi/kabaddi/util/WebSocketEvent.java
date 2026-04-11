package com.kabaddi.kabaddi.util;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WebSocketEvent {
    private String type;   // e.g., MATCH_STARTED, SCORE_UPDATED, TIMER_TICK
    private String matchId;
    private Object data;
    public WebSocketEvent(String type, String matchId) {
        this.type = type;
        this.matchId = matchId;
    }
}
