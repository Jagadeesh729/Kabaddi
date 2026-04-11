package com.kabaddi.kabaddi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchViewerService {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Map of matchId -> Set of sessionIds
    private final Map<String, Set<String>> matchViewers = new ConcurrentHashMap<>();

    public void addViewer(String matchId, String sessionId) {
        matchViewers.computeIfAbsent(matchId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        broadcastViewerCount(matchId);
        log.info("Added viewer for match {}. Session: {}. Current count: {}", matchId, sessionId, getViewerCount(matchId));
    }

    public void removeViewer(String sessionId) {
        matchViewers.forEach((matchId, sessions) -> {
            if (sessions.remove(sessionId)) {
                broadcastViewerCount(matchId);
                log.info("Removed viewer for match {}. Session: {}. Current count: {}", matchId, sessionId, getViewerCount(matchId));
            }
        });
    }

    public void removeViewerFromMatch(String matchId, String sessionId) {
        Set<String> sessions = matchViewers.get(matchId);
        if (sessions != null && sessions.remove(sessionId)) {
            broadcastViewerCount(matchId);
            log.info("Unsubscribed viewer for match {}. Session: {}. Current count: {}", matchId, sessionId, getViewerCount(matchId));
        }
    }

    public long getViewerCount(String matchId) {
        Set<String> sessions = matchViewers.get(matchId);
        return sessions != null ? sessions.size() : 0;
    }

    private void broadcastViewerCount(String matchId) {
        long count = getViewerCount(matchId);
        messagingTemplate.convertAndSend("/topic/match/" + matchId + "/viewers", count);
    }
}
