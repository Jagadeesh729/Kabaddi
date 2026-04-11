package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.entity.MatchIssue;
import com.kabaddi.kabaddi.repository.MatchIssueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchIssueService {

    private final MatchIssueRepository matchIssueRepository;

    public MatchIssue reportIssue(String matchId, String reporterName, String reporterId, String description,
            String screenshot, String category, String priority) {
        MatchIssue issue = new MatchIssue();
        issue.setMatchId(matchId);
        issue.setReporterName(reporterName);
        issue.setReporterId(reporterId);
        issue.setDescription(description);
        issue.setScreenshot(screenshot);
        issue.setCategory(category);
        issue.setPriority(priority);
        issue.setCreatedAt(LocalDateTime.now());
        issue.setStatus("PENDING");
        return matchIssueRepository.save(issue);
    }

    public List<MatchIssue> getIssuesForMatch(String matchId) {
        return matchIssueRepository.findByMatchId(matchId);
    }

    public MatchIssue resolveIssue(String issueId, String creatorResponse) {
        MatchIssue issue = matchIssueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        issue.setStatus("RESOLVED");
        issue.setCreatorResponse(creatorResponse);
        issue.setResolvedAt(LocalDateTime.now());
        return matchIssueRepository.save(issue);
    }

    public List<MatchIssue> getIssuesByReporterId(String reporterId) {
        return matchIssueRepository.findByReporterId(reporterId);
    }
}
