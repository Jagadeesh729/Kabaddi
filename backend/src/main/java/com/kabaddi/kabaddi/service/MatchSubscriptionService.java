package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.entity.MatchSubscriber;
import com.kabaddi.kabaddi.repository.MatchSubscriberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchSubscriptionService {

    private final MatchSubscriberRepository repository;

    public MatchSubscriber subscribe(String matchId, String email, String userId) {
        Optional<MatchSubscriber> existing = (userId != null) 
            ? repository.findByMatchIdAndUserId(matchId, userId)
            : repository.findByMatchIdAndEmail(matchId, email);

        if (existing.isPresent()) {
            return existing.get();
        }

        MatchSubscriber subscriber = MatchSubscriber.builder()
                .matchId(matchId)
                .email(email)
                .userId(userId)
                .subscribedAt(LocalDateTime.now())
                .build();
        
        return repository.save(subscriber);
    }

    public void unsubscribe(String matchId, String email, String userId) {
        if (userId != null) {
            repository.findByMatchIdAndUserId(matchId, userId).ifPresent(repository::delete);
        } else if (email != null) {
            repository.findByMatchIdAndEmail(matchId, email).ifPresent(repository::delete);
        }
    }

    public List<MatchSubscriber> getSubscribers(String matchId) {
        return repository.findByMatchId(matchId);
    }

    public boolean isSubscribed(String matchId, String email, String userId) {
        if (userId != null) {
            return repository.findByMatchIdAndUserId(matchId, userId).isPresent();
        }
        if (email != null) {
            return repository.findByMatchIdAndEmail(matchId, email).isPresent();
        }
        return false;
    }
}
