package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.Match;
import com.kabaddi.kabaddi.util.MatchStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRepository extends MongoRepository<Match, String> {
    List<Match> findByStatus(MatchStatus status);

    @Query("{ '$or': [ { 'matchName': { $regex: ?0, $options: ?1 } }, { 'team1Name': { $regex: ?0, $options: ?1 } }, { 'team2Name': { $regex: ?0, $options: ?1 } } ] }")
    List<Match> findByMatchNameOrTeamNamesRegex(String regex, String options);

    List<Match> findByCreatedBy(String userId);
}
