package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.MatchSubscriber;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface MatchSubscriberRepository extends MongoRepository<MatchSubscriber, String> {
    List<MatchSubscriber> findByMatchId(String matchId);
    Optional<MatchSubscriber> findByMatchIdAndEmail(String matchId, String email);
    Optional<MatchSubscriber> findByMatchIdAndUserId(String matchId, String userId);
}
