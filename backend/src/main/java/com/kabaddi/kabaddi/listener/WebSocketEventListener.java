package com.kabaddi.kabaddi.listener;

import com.kabaddi.kabaddi.service.MatchViewerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final MatchViewerService matchViewerService;

    @EventListener
    public void handleSessionSubscribeEvent(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        String sessionId = headerAccessor.getSessionId();

        if (destination != null && destination.startsWith("/topic/match/") && destination.endsWith("/viewers")) {
            // Extract matchId: /topic/match/{matchId}/viewers
            String matchId = destination.substring("/topic/match/".length(), destination.length() - "/viewers".length());
            matchViewerService.addViewer(matchId, sessionId);
        }
    }

    @EventListener
    public void handleSessionUnsubscribeEvent(SessionUnsubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        // Since we don't naturally get the destination on unsubscribe easily, 
        // we can either track sessions in our service or just try to remove from all.
        // MatchViewerService.removeViewer handles removal from all match sets.
        matchViewerService.removeViewer(sessionId);
    }

    @EventListener
    public void handleSessionDisconnectEvent(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        matchViewerService.removeViewer(sessionId);
    }
}
