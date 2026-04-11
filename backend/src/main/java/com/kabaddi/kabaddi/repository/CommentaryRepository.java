package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.Commentary;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentaryRepository extends MongoRepository<Commentary,String> {
    List<Commentary> findByMatchId(String matchId);

   // List<Commentary> findByMatchIdOrderByDateAndTime(String matchId);

    List<Commentary> findByMatchIdOrderByDateAndTimeDesc(String matchId);
}
