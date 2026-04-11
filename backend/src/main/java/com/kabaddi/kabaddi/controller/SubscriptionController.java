package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.service.MatchSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/matches/{matchId}/subscribe")
@RequiredArgsConstructor
public class SubscriptionController {

    private final MatchSubscriptionService subscriptionService;

    @PostMapping
    public ResponseEntity<Void> subscribe(
            @PathVariable String matchId,
            @RequestBody Map<String, String> request) {
        
        String email = request.get("email");
        String userId = request.get("userId");
        
        subscriptionService.subscribe(matchId, email, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> unsubscribe(
            @PathVariable String matchId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String userId) {
        
        subscriptionService.unsubscribe(matchId, email, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> checkSubscription(
            @PathVariable String matchId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String userId) {
        
        boolean isSubscribed = subscriptionService.isSubscribed(matchId, email, userId);
        return ResponseEntity.ok(Map.of("subscribed", isSubscribed));
    }
}
