package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByMatchId(String matchId, org.springframework.data.domain.Pageable pageable);
}
