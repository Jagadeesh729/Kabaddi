package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.auth.UserPrinciple;
import com.kabaddi.kabaddi.dto.CreateMatchRequest;
import com.kabaddi.kabaddi.dto.MatchDto;
import com.kabaddi.kabaddi.service.MatchService;
import com.kabaddi.kabaddi.service.MatchStatsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import com.kabaddi.kabaddi.dto.ScoreCard;
import com.kabaddi.kabaddi.service.ExportService;

@RestController
@RequestMapping("/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final MatchStatsService matchStatsService;
    private final ExportService exportService;
    private final com.kabaddi.kabaddi.service.GeminiService geminiService;
    private final com.kabaddi.kabaddi.repository.CommentaryRepository commentaryRepository;

    @PostMapping("/create")
    public ResponseEntity<MatchDto> createMatch(
            @Valid @ModelAttribute CreateMatchRequest createMatchRequest,
            java.security.Principal principal) {
        String userId = ((UserPrinciple) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal()).getUserId();
        createMatchRequest.setCreatedBy(userId);
        return ResponseEntity.ok(matchService.createMatch(createMatchRequest));
    }

    @GetMapping("/all")
    public ResponseEntity<List<MatchDto>> getAllMatches() {
        return ResponseEntity.ok(matchService.getAllMatches());
    }

    @GetMapping("/live")
    public ResponseEntity<List<MatchDto>> getAllLiveMatches() {
        return ResponseEntity.ok(matchService.getAllLiveMatches());
    }

    @GetMapping("/completed")
    public List<MatchDto> getAllCompletedMatches() {
        return matchService.getAllCompletedMatches();
    }

    @GetMapping("/match/{matchId}")
    public ResponseEntity<MatchDto> getMatchById(@PathVariable String matchId) {
        return ResponseEntity.ok(matchService.getMatchById(matchId));
    }

    @GetMapping("/{matchId}/win-probability")
    public ResponseEntity<java.util.Map<String, Double>> getWinProbability(@PathVariable String matchId) {
        return ResponseEntity.ok(matchService.calculateWinProbability(matchId));
    }

    @DeleteMapping("/delete/{matchId}")
    public ResponseEntity<Void> deleteMatchById(@PathVariable String matchId) {
        matchService.deleteById(matchId);
        matchStatsService.deleteMatchStatsByMatchId(matchId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/match/update/{matchId}")
    public ResponseEntity<MatchDto> updateMatchById(
            @PathVariable String matchId,
            @Valid @ModelAttribute CreateMatchRequest createMatchRequest,
            java.security.Principal principal) {
        String createrId = ((UserPrinciple) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal()).getUserId();
        MatchDto updatedMatch = matchService.updateMatchById(matchId, createrId, createMatchRequest);
        return ResponseEntity.ok(updatedMatch);
    }

    @PutMapping("/match/{setType}/{matchId}")
    public ResponseEntity<MatchDto> setMatch(
            @PathVariable String setType,
            @PathVariable String matchId,
            java.security.Principal principal) {
        String createrId = ((UserPrinciple) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal()).getUserId();
        return ResponseEntity.ok(matchService.setMatch(setType, matchId, createrId));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MatchDto>> searchByMatchName(@RequestParam String matchName) {
        return ResponseEntity.ok(matchService.searchByMatchName(matchName));
    }

    @GetMapping("/export/excel/{matchId}")
    public ResponseEntity<InputStreamResource> exportMatchExcel(@PathVariable String matchId) throws IOException {
        ScoreCard scoreCard = matchStatsService.getMatchScorecard(matchId);
        ByteArrayInputStream in = exportService.generateMatchExcel(scoreCard);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=match-" + matchId + ".xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    @GetMapping("/export/pdf/{matchId}")
    public ResponseEntity<InputStreamResource> exportMatchPdf(@PathVariable String matchId) {
        ScoreCard scoreCard = matchStatsService.getMatchScorecard(matchId);
        ByteArrayInputStream in = exportService.generateMatchPdf(scoreCard);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=match-" + matchId + ".pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    @PostMapping("/vote/{matchId}")
    public ResponseEntity<MatchDto> voteForTeam(
            @PathVariable String matchId, 
            @RequestParam String team,
            java.security.Principal principal) {
        String userId = "guest"; // Default fallback
        if (principal != null) {
            userId = ((UserPrinciple) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal()).getUserId();
        } else {
            // If anonymous access is allowed, you can pass a guest marker, 
            // though normally voting might require auth or IP tracking.
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }

        MatchDto updatedMatch = matchService.voteForTeam(matchId, team, userId);
        // Broadcast the update to all connected clients
        matchService.broadcastMatchUpdate(updatedMatch);
        return ResponseEntity.ok(updatedMatch);
    }

    @PostMapping("/{matchId}/generate-summary")
    public ResponseEntity<MatchDto> generateMatchSummary(@PathVariable String matchId) {
        // Fetch detailed scorecard
        ScoreCard scoreCard = matchStatsService.getMatchScorecard(matchId);
        
        // Ensure match is completed (Optional logic, but good practice)
        if (scoreCard.getStatus() != com.kabaddi.kabaddi.util.MatchStatus.COMPLETED) {
            throw new RuntimeException("Match must be COMPLETED to generate an AI summary.");
        }

        // Generate String via Gemini
        String generatedSummary = geminiService.generateMatchSummary(scoreCard);
        
        // Update the match in MongoDB and return the DTO
        MatchDto updatedMatchDto = matchService.updateMatchSummary(matchId, generatedSummary);
        
        return ResponseEntity.ok(updatedMatchDto);
    }

    @PostMapping("/{matchId}/ai-analysis")
    public ResponseEntity<Map<String, String>> generateMatchAnalysis(
            @PathVariable String matchId,
            @RequestBody com.kabaddi.kabaddi.dto.AIAnalysisRequest request) {
        
        ScoreCard scoreCard = matchStatsService.getMatchScorecard(matchId);
        List<com.kabaddi.kabaddi.entity.Commentary> commentaries = commentaryRepository.findByMatchId(matchId);
        
        String responseText = geminiService.generateMatchAnalysis(scoreCard, commentaries, request.getQuestion());
        
        Map<String, String> response = new HashMap<>();
        response.put("answer", responseText);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{matchId}/ai-assistant")
    public java.util.concurrent.CompletableFuture<ResponseEntity<Map<String, String>>> generateFastMatchAnalysis(
            @PathVariable String matchId,
            @RequestBody com.kabaddi.kabaddi.dto.AIAnalysisRequest request) {
        
        return java.util.concurrent.CompletableFuture.supplyAsync(() -> {
            ScoreCard scoreCard = matchStatsService.getMatchScorecard(matchId);
            List<com.kabaddi.kabaddi.entity.Commentary> commentaries = commentaryRepository.findByMatchId(matchId);
            
            String responseText = geminiService.generateFastMatchAnalysis(scoreCard, commentaries, request.getQuestion());
            
            Map<String, String> response = new HashMap<>();
            response.put("answer", responseText);
            
            return ResponseEntity.ok(response);
        });
    }

    @PostMapping("/{matchId}/view")
    public ResponseEntity<Void> incrementViews(@PathVariable String matchId) {
        matchService.incrementTotalViews(matchId);
        return ResponseEntity.ok().build();
    }
}
