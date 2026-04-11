package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.entity.MatchIssue;
import com.kabaddi.kabaddi.service.MatchIssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/issues")
@RequiredArgsConstructor
public class MatchIssueController {

    private final MatchIssueService matchIssueService;
    private final com.kabaddi.kabaddi.service.MatchService matchService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @PostMapping("/report/{matchId}")
    public ResponseEntity<?> reportIssue(
            @PathVariable String matchId,
            @RequestBody MatchIssue issueRequest) {

        // Validate match status
        com.kabaddi.kabaddi.dto.MatchDto match = matchService.getMatchById(matchId);
        if (match.getStatus() != com.kabaddi.kabaddi.util.MatchStatus.LIVE && 
            match.getStatus() != com.kabaddi.kabaddi.util.MatchStatus.PAUSED) {
            return ResponseEntity.badRequest().body("Issues can only be reported for LIVE or PAUSED matches.");
        }

        MatchIssue reportedIssue = matchIssueService.reportIssue(
                matchId,
                issueRequest.getReporterName(),
                issueRequest.getReporterId(),
                issueRequest.getDescription(),
                issueRequest.getScreenshot(),
                issueRequest.getCategory(),
                issueRequest.getPriority());

        // Push real-time update to the specific match (for admin view)
        messagingTemplate.convertAndSend("/topic/issues/match/" + matchId, reportedIssue);
        // Push real-time update to the specific user (for their My Reports view)
        if (reportedIssue.getReporterId() != null) {
            messagingTemplate.convertAndSend("/topic/issues/user/" + reportedIssue.getReporterId(), reportedIssue);
        }

        return ResponseEntity.ok(reportedIssue);
    }

    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<MatchIssue>> getIssuesForMatch(@PathVariable String matchId) {
        return ResponseEntity.ok(matchIssueService.getIssuesForMatch(matchId));
    }

    @GetMapping("/user/{reporterId}")
    public ResponseEntity<List<MatchIssue>> getIssuesByReporterId(@PathVariable String reporterId) {
        return ResponseEntity.ok(matchIssueService.getIssuesByReporterId(reporterId));
    }

    @PutMapping("/{issueId}/resolve")
    public ResponseEntity<MatchIssue> resolveIssue(
            @PathVariable String issueId,
            @RequestBody java.util.Map<String, String> request) {
            
        String creatorResponse = request.get("creatorResponse");
        MatchIssue resolvedIssue = matchIssueService.resolveIssue(issueId, creatorResponse);

        // Push real-time update to the specific match (for admin view)
        messagingTemplate.convertAndSend("/topic/issues/match/" + resolvedIssue.getMatchId(), resolvedIssue);
        // Push real-time update to the specific user (for their My Reports view)
        if (resolvedIssue.getReporterId() != null) {
            messagingTemplate.convertAndSend("/topic/issues/user/" + resolvedIssue.getReporterId(), resolvedIssue);
        }

        return ResponseEntity.ok(resolvedIssue);
    }
}
