package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.MatchIssue;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchIssueRepository extends MongoRepository<MatchIssue, String> {
    List<MatchIssue> findByMatchId(String matchId);

    List<MatchIssue> findByMatchIdAndStatus(String matchId, String status);

    List<MatchIssue> findByReporterId(String reporterId);
}
