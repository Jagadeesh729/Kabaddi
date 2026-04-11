package com.kabaddi.kabaddi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kabaddi.kabaddi.dto.ScoreCard;
import com.kabaddi.kabaddi.dto.TeamStats;
import com.kabaddi.kabaddi.dto.UserMatch;
import com.kabaddi.kabaddi.dto.UserStats;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.kabaddi.kabaddi.entity.Match;
import com.kabaddi.kabaddi.repository.MatchRepository;
import com.kabaddi.kabaddi.util.MatchStatus;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GeminiService {

    private final MatchRepository matchRepository;
    private final MatchStatsService matchStatsService;

    @Value("${gemini.api.key}")
    private String apiKey;

    private final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache for AI Responses (TTL: 30 seconds)
    private static class CachedResponse {
        String response;
        long timestamp;
        CachedResponse(String response, long timestamp) {
            this.response = response;
            this.timestamp = timestamp;
        }
    }
    private final Map<String, CachedResponse> aiCache = new java.util.concurrent.ConcurrentHashMap<>();

    // Rate Limiting for Spam Prevention (1 request per 10 seconds per unique user/match combo)
    private final Map<String, Long> userLastRequestTime = new java.util.concurrent.ConcurrentHashMap<>();
    
    private void checkRateLimit(String requestKey) {
        long now = System.currentTimeMillis();
        Long lastReq = userLastRequestTime.get(requestKey);
        if (lastReq != null && (now - lastReq) < 10000) { // 10 seconds timeout
            throw new RuntimeException("Rate limit exceeded. Please wait before asking again.");
        }
        userLastRequestTime.put(requestKey, now);
    }

    // ─────────────────────────────────────────────
    //  Public: Quick Match Summary
    // ─────────────────────────────────────────────
    public String generateMatchSummary(ScoreCard scoreCard) {
        checkRateLimit(scoreCard.getMatchId() + "_summary");
        if (!isApiKeyValid()) return "AI Summary generation is currently disabled due to a missing valid API key.";
        try {
            StringBuilder prompt = new StringBuilder();
            prompt.append("You are a professional Kabaddi sports analyst and commentator. ")
                  .append("Write a concise, engaging 3-to-4 sentence match summary. ")
                  .append("Highlight the final score, winner, and top players. Be professional and energetic.\n\n");

            prompt.append("Match: ").append(scoreCard.getTeam1Name()).append(" vs ").append(scoreCard.getTeam2Name()).append("\n");
            prompt.append("Final Score: ")
                  .append(scoreCard.getTeam1Name()).append(" (").append(scoreCard.getTeam1Score()).append(") - ")
                  .append(scoreCard.getTeam2Name()).append(" (").append(scoreCard.getTeam2Score()).append(")\n\n");

            prompt.append("Top Performers — ").append(scoreCard.getTeam1Name()).append(":\n");
            prompt.append(buildCurrentMatchPlayerTable(scoreCard.getTeam1()));

            prompt.append("\nTop Performers — ").append(scoreCard.getTeam2Name()).append(":\n");
            prompt.append(buildCurrentMatchPlayerTable(scoreCard.getTeam2()));

            return callGeminiApi(prompt.toString());
        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to generate AI summary at this time. Please try again later.";
        }
    }

    // ─────────────────────────────────────────────
    //  Public: Fast AI Match Assistant (Optimized)
    // ─────────────────────────────────────────────
    public String generateFastMatchAnalysis(ScoreCard scoreCard,
                                            List<com.kabaddi.kabaddi.entity.Commentary> commentaries,
                                            String question) {
        String qClean = question.toLowerCase().trim();
        
        // 1. Rule-Based Query Detection
        if (qClean.contains("score") && !qClean.contains("predict")) {
            return "The current score is " + scoreCard.getTeam1Name() + " " + (scoreCard.getTeam1Score() != null ? scoreCard.getTeam1Score() : 0) + 
                   " - " + scoreCard.getTeam2Name() + " " + (scoreCard.getTeam2Score() != null ? scoreCard.getTeam2Score() : 0) + ".";
        }
        if ((qClean.contains("top scorer") || qClean.contains("top performer")) && !qClean.contains("predict") && !qClean.contains("expected")) {
            String t1Best = getTopPlayerName(scoreCard.getTeam1());
            String t2Best = getTopPlayerName(scoreCard.getTeam2());
            return "The top performers currently are " + t1Best + " for " + scoreCard.getTeam1Name() + " and " + t2Best + " for " + scoreCard.getTeam2Name() + ".";
        }
        
        if (!isApiKeyValid()) return "AI Assistant is currently disabled due to a missing valid API key.";

        // 2. Cache Check
        String cacheKey = scoreCard.getMatchId() + "_" + qClean;
        CachedResponse cached = aiCache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < 30000) {
            return cached.response; // Return cached response if within 30s
        }

        // 3. Optimized Prompt Generation
        try {
            String statusStr = (scoreCard.getStatus() != null) ? scoreCard.getStatus().name() : "COMPLETED";
            StringBuilder prompt = new StringBuilder();

            prompt.append("You are a Kabaddi AI Analyst. Be concise (1-2 sentences). Always answer confidently.\n");
            prompt.append("Context: Match is ").append(statusStr).append(".\n");
            
            int s1 = scoreCard.getTeam1Score() != null ? scoreCard.getTeam1Score() : 0;
            int s2 = scoreCard.getTeam2Score() != null ? scoreCard.getTeam2Score() : 0;
            prompt.append("Score: ").append(scoreCard.getTeam1Name()).append(" ").append(s1)
                  .append(" - ").append(scoreCard.getTeam2Name()).append(" ").append(s2).append("\n");

            prompt.append("Top Players: ").append(getTopPlayerName(scoreCard.getTeam1())).append(" (").append(scoreCard.getTeam1Name()).append("), ")
                  .append(getTopPlayerName(scoreCard.getTeam2())).append(" (").append(scoreCard.getTeam2Name()).append(")\n");
                  
            if (commentaries != null && !commentaries.isEmpty()) {
                prompt.append("Recent Events:\n");
                int startIdx = Math.max(0, commentaries.size() - 5);
                for (int i = startIdx; i < commentaries.size(); i++) {
                    prompt.append("- ").append(commentaries.get(i).getCommentary()).append("\n");
                }
            }

            prompt.append("User Question: ").append(question).append("\nAnswer:");

            String response = callGeminiApi(prompt.toString());
            
            // Update Cache
            aiCache.put(cacheKey, new CachedResponse(response, System.currentTimeMillis()));
            
            return response;

        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to analyze match data quickly. Please try again.";
        }
    }

    private String getTopPlayerName(List<TeamStats> team) {
        if (team == null || team.isEmpty()) return "N/A";
        return team.stream()
            .max((a, b) -> Integer.compare(
                    (a.getRaidPoints() != null ? a.getRaidPoints() : 0) + (a.getTacklePoints() != null ? a.getTacklePoints() : 0),
                    (b.getRaidPoints() != null ? b.getRaidPoints() : 0) + (b.getTacklePoints() != null ? b.getTacklePoints() : 0)))
            .map(p -> p.getPlayerName() + " (" + ((p.getRaidPoints() != null ? p.getRaidPoints() : 0) + (p.getTacklePoints() != null ? p.getTacklePoints() : 0)) + " pts)")
            .orElse("N/A");
    }

    // ─────────────────────────────────────────────
    //  Public: Full AI Match Analysis
    // ─────────────────────────────────────────────
    public String generateMatchAnalysis(ScoreCard scoreCard,
                                        List<com.kabaddi.kabaddi.entity.Commentary> commentaries,
                                        String question) {
        if (!isApiKeyValid()) return "AI Analysis is currently disabled due to a missing valid API key.";

        checkRateLimit(scoreCard.getMatchId() + "_" + question.hashCode());

        try {
            String statusStr = (scoreCard.getStatus() != null) ? scoreCard.getStatus().name() : "COMPLETED";

            StringBuilder prompt = new StringBuilder();

            // ── ROLE & ABSOLUTE RULES ──────────────────────────────────────
            prompt.append("You are KABADDI AI ANALYST — a world-class sports analytics assistant specialising in Kabaddi.\n");
            prompt.append("ABSOLUTE RULES (follow without exception):\n");
            prompt.append("1. ALWAYS give a definite, specific answer. NEVER say 'I cannot predict' or 'insufficient data'.\n");
            prompt.append("2. When predictions are requested, ALWAYS state a percentage probability (e.g., '68% chance Team A wins').\n");
            prompt.append("3. When asked for MVP / Top Performer, ALWAYS name a specific player based on the stats provided.\n");
            prompt.append("4. If data is sparse or missing, ESTIMATE using available ratios and historical trends — do not refuse.\n");
            prompt.append("5. MUST BE CONCISE: keep your answer between 2 and 4 punchy sentences.\n");
            prompt.append("6. Format responses professionally, like a live sports commentator on TV.\n\n");

            // ── STATUS-SPECIFIC FOCUS ─────────────────────────────────────
            switch (statusStr) {
                case "LIVE":
                    prompt.append("MATCH STATE: LIVE\nFOCUS ON:\n");
                    prompt.append("  • Win probability based on current score gap and player momentum\n");
                    prompt.append("  • Likely top performer based on current stats\n");
                    prompt.append("  • Which team holds momentum advantage and why\n\n");
                    break;
                case "PAUSED":
                    prompt.append("MATCH STATE: PAUSED\nFOCUS ON:\n");
                    prompt.append("  • Summary of the match so far\n");
                    prompt.append("  • Top performer in the first half\n");
                    prompt.append("  • Prediction for second half outcome based on current trends\n\n");
                    break;
                default:
                    prompt.append("MATCH STATE: COMPLETED\nFOCUS ON:\n");
                    prompt.append("  • Professional match summary with winner and score\n");
                    prompt.append("  • Identify the MVP based on stats\n");
                    prompt.append("  • Key turning points and performance analysis\n\n");
                    break;
            }

            // ── CURRENT MATCH DATA ─────────────────────────────────────────
            prompt.append("════════════════════════════════\n");
            prompt.append("📊 CURRENT MATCH DATA\n");
            prompt.append("════════════════════════════════\n");
            prompt.append("Status : ").append(statusStr).append("\n");
            prompt.append("Match  : ").append(scoreCard.getTeam1Name()).append(" vs ").append(scoreCard.getTeam2Name()).append("\n");

            int s1 = scoreCard.getTeam1Score() != null ? scoreCard.getTeam1Score() : 0;
            int s2 = scoreCard.getTeam2Score() != null ? scoreCard.getTeam2Score() : 0;
            prompt.append("Score  : ").append(scoreCard.getTeam1Name()).append(" ").append(s1)
                  .append("  —  ").append(scoreCard.getTeam2Name()).append(" ").append(s2).append("\n");

            int diff = s1 - s2;
            String lead = (diff > 0) ? scoreCard.getTeam1Name() + " leads by " + diff
                        : (diff < 0) ? scoreCard.getTeam2Name() + " leads by " + Math.abs(diff)
                        : "Scores level";
            prompt.append("Lead   : ").append(lead).append("\n");

            if (scoreCard.getTeam1WinProbability() != null && scoreCard.getTeam2WinProbability() != null && "LIVE".equals(statusStr)) {
                prompt.append("Live Win Probability: ")
                      .append(scoreCard.getTeam1Name()).append(" (").append(scoreCard.getTeam1WinProbability()).append("%) vs ")
                      .append(scoreCard.getTeam2Name()).append(" (").append(scoreCard.getTeam2WinProbability()).append("%)\n");
            }
            prompt.append("\n");

            // ── CURRENT MATCH PLAYER STATS ────────────────────────────────
            prompt.append("👤 PLAYER STATS — ").append(scoreCard.getTeam1Name()).append("\n");
            prompt.append(buildCurrentMatchPlayerTable(scoreCard.getTeam1()));
            prompt.append("\n👤 PLAYER STATS — ").append(scoreCard.getTeam2Name()).append("\n");
            prompt.append(buildCurrentMatchPlayerTable(scoreCard.getTeam2()));

            // ── MATCH TIMELINE ─────────────────────────────────────────────
            if (commentaries != null && !commentaries.isEmpty()) {
                prompt.append("\n📝 MATCH TIMELINE (Recent Key Events)\n");
                int startIdx = Math.max(0, commentaries.size() - 40);
                for (int i = startIdx; i < commentaries.size(); i++) {
                    String event = commentaries.get(i).getCommentary();
                    if (event != null && !event.isBlank()) {
                        prompt.append("  • ").append(event).append("\n");
                    }
                }
            } else {
                prompt.append("\n📝 MATCH TIMELINE: No commentary events recorded. Rely on scores for analysis.\n");
            }

            // ── HISTORICAL TEAM DATA ──────────────────────────────────────
            prompt.append("\n════════════════════════════════\n");
            prompt.append("📈 HISTORICAL TEAM STATISTICS\n");
            prompt.append("════════════════════════════════\n");
            prompt.append(buildTeamHistoricalStats(scoreCard.getTeam1Name()));
            prompt.append(buildTeamHistoricalStats(scoreCard.getTeam2Name()));

            // ── HISTORICAL PLAYER FORM ────────────────────────────────────
            prompt.append("\n════════════════════════════════\n");
            prompt.append("🏆 HISTORICAL PLAYER FORM (Last 5 Matches)\n");
            prompt.append("════════════════════════════════\n");
            prompt.append("Team: ").append(scoreCard.getTeam1Name()).append("\n");
            prompt.append(buildPlayerHistorySection(scoreCard.getTeam1()));
            prompt.append("\nTeam: ").append(scoreCard.getTeam2Name()).append("\n");
            prompt.append(buildPlayerHistorySection(scoreCard.getTeam2()));

            // ── USER QUESTION ─────────────────────────────────────────────
            prompt.append("\n════════════════════════════════\n");
            prompt.append("❓ USER QUESTION\n");
            prompt.append("════════════════════════════════\n");
            prompt.append(question).append("\n\n");
            prompt.append("REMINDER — You must deliver a definite answer. ");
            prompt.append("If data is limited, use score ratios and historical averages to estimate. ");
            prompt.append("Never refuse. Always be specific and confident:");

            return callGeminiApi(prompt.toString());

        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to analyze match data. Please try again later.";
        }
    }

    // ─────────────────────────────────────────────
    //  Helper: Generic Gemini API call
    // ─────────────────────────────────────────────
    private String callGeminiApi(String prompt) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> contents = new HashMap<>();
        Map<String, Object> parts = new HashMap<>();

        parts.put("text", prompt);
        contents.put("parts", new Object[]{parts});
        requestBody.put("contents", new Object[]{contents});

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        String responseStr = restTemplate.postForObject(GEMINI_API_URL + apiKey, requestEntity, String.class);
        JsonNode root = objectMapper.readTree(responseStr);

        return root.path("candidates").get(0)
                   .path("content").path("parts").get(0)
                   .path("text").asText();
    }

    // ─────────────────────────────────────────────
    //  Helper: Current match player stats table
    // ─────────────────────────────────────────────
    private String buildCurrentMatchPlayerTable(List<TeamStats> team) {
        if (team == null || team.isEmpty()) return "  No player data available.\n";

        List<TeamStats> sorted = team.stream()
                .sorted((a, b) -> Integer.compare(
                        (b.getRaidPoints() != null ? b.getRaidPoints() : 0) + (b.getTacklePoints() != null ? b.getTacklePoints() : 0),
                        (a.getRaidPoints() != null ? a.getRaidPoints() : 0) + (a.getTacklePoints() != null ? a.getTacklePoints() : 0)))
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        for (TeamStats p : sorted) {
            int raid = p.getRaidPoints() != null ? p.getRaidPoints() : 0;
            int tackle = p.getTacklePoints() != null ? p.getTacklePoints() : 0;
            sb.append("  • ").append(p.getPlayerName())
              .append(" | Raid: ").append(raid)
              .append("  Tackle: ").append(tackle)
              .append("  Total: ").append(raid + tackle).append("\n");
        }
        return sb.toString();
    }

    // ─────────────────────────────────────────────
    //  Helper: Team historical win rate + avg score
    // ─────────────────────────────────────────────
    private String buildTeamHistoricalStats(String teamName) {
        if (matchRepository == null) return "";

        List<Match> completed = matchRepository.findByStatus(MatchStatus.COMPLETED);
        int played = 0, wins = 0, totalScored = 0, totalConceded = 0;

        for (Match m : completed) {
            boolean isT1 = teamName.equalsIgnoreCase(m.getTeam1Name());
            boolean isT2 = teamName.equalsIgnoreCase(m.getTeam2Name());
            if (!isT1 && !isT2) continue;

            played++;
            int sc1 = m.getTeam1Score() != null ? m.getTeam1Score() : 0;
            int sc2 = m.getTeam2Score() != null ? m.getTeam2Score() : 0;

            if (isT1) { if (sc1 > sc2) wins++; totalScored += sc1; totalConceded += sc2; }
            else       { if (sc2 > sc1) wins++; totalScored += sc2; totalConceded += sc1; }
        }

        if (played == 0) {
            return "  " + teamName + ": No historical matches. Predictions based on current match data only.\n";
        }

        double winRate = (double) wins / played * 100;
        double avgScored = (double) totalScored / played;
        double avgConceded = (double) totalConceded / played;

        return String.format(
            "  %s — %d matches | %d wins (%.0f%% win rate) | Avg scored: %.1f | Avg conceded: %.1f\n",
            teamName, played, wins, winRate, avgScored, avgConceded
        );
    }

    // ─────────────────────────────────────────────
    //  Helper: Player form – last 5 match averages
    // ─────────────────────────────────────────────
    private String buildPlayerHistorySection(List<TeamStats> team) {
        if (team == null || team.isEmpty() || matchStatsService == null) return "  No historical player data.\n";

        List<TeamStats> top5 = team.stream()
                .sorted((a, b) -> Integer.compare(
                        (b.getRaidPoints() != null ? b.getRaidPoints() : 0) + (b.getTacklePoints() != null ? b.getTacklePoints() : 0),
                        (a.getRaidPoints() != null ? a.getRaidPoints() : 0) + (a.getTacklePoints() != null ? a.getTacklePoints() : 0)))
                .limit(5)
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        for (TeamStats p : top5) {
            if (p.getPlayerId() == null) continue;
            try {
                UserStats stats = matchStatsService.getUserStats(p.getPlayerId());
                int lifeRaid   = stats.getRaidPoints()   != null ? stats.getRaidPoints()   : 0;
                int lifeTackle = stats.getTacklePoints() != null ? stats.getTacklePoints() : 0;
                int lifeMatches = stats.getTotalMatches() != null ? stats.getTotalMatches() : 0;

                double avgRaid   = lifeMatches > 0 ? (double) lifeRaid   / lifeMatches : 0;
                double avgTackle = lifeMatches > 0 ? (double) lifeTackle / lifeMatches : 0;

                sb.append("  • ").append(p.getPlayerName()).append("\n");
                sb.append("    Lifetime: ").append(lifeMatches).append(" matches | Total pts: ").append(stats.getTotalPoints() != null ? stats.getTotalPoints() : 0).append("\n");
                sb.append(String.format("    Per-match avg: %.1f raid pts, %.1f tackle pts\n", avgRaid, avgTackle));

                // Last 5 match breakdown
                if (stats.getMatches() != null && !stats.getMatches().isEmpty()) {
                    List<UserMatch> last5 = stats.getMatches().stream().limit(5).collect(Collectors.toList());
                    StringBuilder matchLine = new StringBuilder("    Last ").append(last5.size()).append(" matches: ");
                    for (UserMatch um : last5) {
                        int pts = um.getTotalPoints() != null ? um.getTotalPoints() : 0;
                        matchLine.append(pts).append("pts");
                        if (um.getOppositeTeamName() != null && !um.getOppositeTeamName().isBlank()) {
                            matchLine.append(" vs ").append(um.getOppositeTeamName());
                        }
                        matchLine.append("; ");
                    }
                    // Remove trailing separator
                    String ml = matchLine.toString();
                    if (ml.endsWith("; ")) ml = ml.substring(0, ml.length() - 2);
                    sb.append(ml).append("\n");
                }

            } catch (Exception e) {
                sb.append("  • ").append(p.getPlayerName()).append(": current match data only\n");
            }
        }
        return sb.isEmpty() ? "  No historical player data.\n" : sb.toString();
    }

    private boolean isApiKeyValid() {
        return apiKey != null && !apiKey.isEmpty() && !apiKey.equals("YOUR_GEMINI_API_KEY_HERE");
    }
}
