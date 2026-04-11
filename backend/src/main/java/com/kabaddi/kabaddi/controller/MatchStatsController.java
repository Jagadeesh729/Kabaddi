package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.auth.UserPrinciple;
import com.kabaddi.kabaddi.dto.MatchDto;
import com.kabaddi.kabaddi.dto.ScoreCard;
import com.kabaddi.kabaddi.dto.UpdateScoreDto;
import com.kabaddi.kabaddi.entity.User;
import com.kabaddi.kabaddi.exception.NotfoundException;
import com.kabaddi.kabaddi.repository.UserRepository;
import com.kabaddi.kabaddi.service.MatchStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Slf4j
@RestController
@RequestMapping("/matchstats")
@RequiredArgsConstructor
public class MatchStatsController {

    private final MatchStatsService matchStatsService;
    private final UserRepository userRepository;

    @GetMapping("/leaderboard")
    public ResponseEntity<java.util.List<com.kabaddi.kabaddi.dto.LeaderboardEntryDto>> getLeaderboard() {
        log.info("Executing getLeaderboard");
        return ResponseEntity.ok(matchStatsService.getLeaderboard());
    }

    @GetMapping("/match/scorecard/{matchId}")
    public ResponseEntity<ScoreCard> MatchScorecard(@PathVariable String matchId) {
        log.info("exceuting MatchScorecard");
        return ResponseEntity.ok(matchStatsService.getMatchScorecard(matchId));
    }

    @GetMapping("/match/livescorecard/{matchId}/user")
    public ResponseEntity<ScoreCard> LiveMatchScorecard(@PathVariable String matchId, Principal principal) {
        log.info("Executing LiveMatchScorecard");
        String username = principal.getName();
        User user = userRepository.findByUsername(username).orElseThrow(() -> new NotfoundException(username));
        String userId = user.getId();

        return ResponseEntity.ok(matchStatsService.getMatchScorecard(matchId, userId));
    }

    @PutMapping("/match/{matchId}/update")
    public ResponseEntity<MatchDto> updateMatchStats(
            @PathVariable String matchId,
            @RequestBody UpdateScoreDto updateScoreDto,
            Principal principal) {
        String userId = ((UserPrinciple) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal()).getUserId();
        log.info(" Received data matchId: {}, score: {}", matchId, updateScoreDto);
        return ResponseEntity.ok(matchStatsService.updateMatchstats(userId, matchId, updateScoreDto.getPlayerId(),
                updateScoreDto.getPointType(), updateScoreDto.getPoints(), updateScoreDto.getTeamName()));
    }
    // @PutMapping("/update/{matchId}/undo/{createrId}")
    // public ResponseEntity<MatchDto> undoMatchStats(@PathVariable String
    // createrId,@PathVariable String matchId, @RequestBody UpdateScoreDto
    // updateScoreDto) {
    // return
    // ResponseEntity.ok(matchStatsService.updateMatchstats(createrId,matchId,updateScoreDto.getPlayerId(),updateScoreDto.getPointType(),updateScoreDto.getPoints(),updateScoreDto.getTeamName()));
    // }

}
