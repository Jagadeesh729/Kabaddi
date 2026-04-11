package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.dto.*;
import com.kabaddi.kabaddi.entity.Match;
import com.kabaddi.kabaddi.entity.MatchStats;
import com.kabaddi.kabaddi.entity.User;
import com.kabaddi.kabaddi.exception.NotfoundException;
import com.kabaddi.kabaddi.repository.MatchRepository;
import com.kabaddi.kabaddi.repository.MatchStatsRepository;
import com.kabaddi.kabaddi.repository.UserRepository;
import com.kabaddi.kabaddi.util.MatchStatus;

import com.kabaddi.kabaddi.util.PlayerResponse;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    private final MatchStatsRepository matchStatsRepository;
    private final MatchRepository matchRepository;
    private final ImageUploadService imageUploadService;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    private final SimpMessagingTemplate messagingTemplate;
    private final MatchViewerService matchViewerService;
    private final MatchSubscriptionService subscriptionService;
    private final EmailService emailService;

    public MatchDto createMatch(CreateMatchRequest request) {
        log.info("recived data for creating match " + request.toString());
        if (!userRepository.existsById(request.getCreatedBy())) {
            log.info("user does not exist for creating match " + request.getCreatedBy());
            throw new NotfoundException("User not found");
        }

        try {
            log.info("creating match ");
            String team1 = null;
            if (request.getTeam1Photo() != null)
                team1 = imageUploadService.uploadImage(request.getTeam1Photo());
            String team2 = null;
            if (request.getTeam2Photo() != null)
                team2 = imageUploadService.uploadImage(request.getTeam2Photo());
            userRepository.existsById(request.getCreatedBy());
            if (request.getTeam1Name().trim().equals(request.getTeam2Name().trim())) {
                throw new NotfoundException("Teams name should be different");
            }
            log.info("creating match ");
            Match new_match = Match.builder()
                    .matchName(request.getMatchName())
                    .team1Name(request.getTeam1Name())
                    .team2Name(request.getTeam2Name())
                    .team1PhotoUrl(team1)
                    .team2PhotoUrl(team2)
                    .createdBy(request.getCreatedBy())
                    .status(MatchStatus.UPCOMING)
                    .team1Score(0)
                    .team2Score(0)
                    .createdAt(LocalDate.now())
                    .totalDuration(request.getTotalDuration() * 60)
                    .remainingDuration(request.getTotalDuration() * 60)
                    .location(request.getLocation())
                    .scheduledStartTime(request.getMatchDate() != null && request.getMatchTime() != null 
                        ? LocalDateTime.of(request.getMatchDate(), java.time.LocalTime.parse(request.getMatchTime())) 
                        : null)
                    .build();
            log.info("saving match ");
            matchRepository.save(new_match);
            log.info("created match successfully ");
            log.info("match stats creating");
            for (String playerId : request.getTeam1Players()) {
                MatchStats stats = new MatchStats();
                log.info("creating matchstats for user  " + playerId);
                if (userRepository.existsById(playerId)) {
                    stats.setMatchId(new_match.getId());
                    stats.setPlayerId(playerId);
                    stats.setTeamName(request.getTeam1Name());
                    stats.setRaidPoints(0);
                    stats.setTacklePoints(0);
                    matchStatsRepository.save(stats);
                } else {
                    matchRepository.deleteById(new_match.getId());
                    throw new NotfoundException("Player not found " + playerId);
                }

            }
            for (String playerId : request.getTeam2Players()) {
                MatchStats stats = new MatchStats();
                if (request.getTeam1Players().contains(playerId)) {
                    matchRepository.deleteById(new_match.getId());
                    throw new NotfoundException(
                            "Player with id " + playerId + " already exists in " + request.getTeam1Name());
                }
                if (!userRepository.existsById(playerId))
                    throw new NotfoundException("Player not found" + playerId);
                stats.setMatchId(new_match.getId());
                stats.setPlayerId(playerId);
                stats.setTeamName(request.getTeam2Name());
                stats.setRaidPoints(0);
                stats.setTacklePoints(0);
                matchStatsRepository.save(stats);
            }
            log.info("Match and Match stats created successfully");
            return convertToDto(new_match);
        } catch (Exception e) {
            throw new NotfoundException("error in creating match " + e.getMessage());
        }
    }

    public List<MatchDto> getAllMatches() {
        List<MatchDto> dtos = new ArrayList<>();
        for (Match match : matchRepository.findAll()) {
            dtos.add(convertToDto(match));
        }
        return dtos;
    }

    public List<MatchDto> getAllLiveMatches() {
        List<MatchDto> dtos = new ArrayList<>();
        List<Match> matches = matchRepository.findByStatus(MatchStatus.LIVE);
        for (Match match : matches) {
            dtos.add(convertToDto(match));
        }
        return dtos;
    }

    public List<MatchDto> getAllCompletedMatches() {
        List<MatchDto> dtos = new ArrayList<>();
        List<Match> matches = matchRepository.findByStatus(MatchStatus.COMPLETED);
        for (Match match : matches) {
            dtos.add(convertToDto(match));
        }
        return dtos;
    }

    public MatchDto getMatchById(String matchId) {
        log.info("getting match id " + matchId);
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));
        return convertToDto(match);
    }

    public void deleteById(String matchId) {
        if (matchRepository.findById(matchId).isEmpty()) {
            throw new NotfoundException("Match not found");
        }
        matchRepository.deleteById(matchId);
    }

    public MatchDto updateMatchById(String matchId, String userId, CreateMatchRequest request) {
        // 1. Check if match exists
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));

        // 2. Authorization check: only creator can update
        if (!match.getCreatedBy().equals(userId)) {
            throw new NotfoundException("Only the creator can update the match");
        }

        try {
            // 3. Update basic fields
            match.setMatchName(request.getMatchName());
            match.setTeam1Name(request.getTeam1Name());
            match.setTeam2Name(request.getTeam2Name());
            match.setTotalDuration(request.getTotalDuration() * 60);
            match.setLocation(request.getLocation());
            if (request.getMatchDate() != null && request.getMatchTime() != null) {
                match.setScheduledStartTime(LocalDateTime.of(request.getMatchDate(), java.time.LocalTime.parse(request.getMatchTime())));
                match.setReminderSent(false); // Reset reminder if time changes
            }

            // 4. Update images if provided (optional)
            if (request.getTeam1Photo() != null && !request.getTeam1Photo().isEmpty()) {
                String team1PhotoUrl = imageUploadService.uploadImage(request.getTeam1Photo());
                match.setTeam1PhotoUrl(team1PhotoUrl);
            }
            if (request.getTeam2Photo() != null && !request.getTeam2Photo().isEmpty()) {
                String team2PhotoUrl = imageUploadService.uploadImage(request.getTeam2Photo());
                match.setTeam2PhotoUrl(team2PhotoUrl);
            }

            // 5. Save updated match
            matchRepository.save(match);

            // 6. Remove old match stats for this match
            matchStatsRepository.deleteByMatchId(matchId);

            // 7. Create new match stats for team 1 player
            for (String playerId : request.getTeam1Players()) {
                MatchStats stats = new MatchStats();
                stats.setMatchId(matchId);
                stats.setPlayerId(playerId);
                stats.setTeamName(request.getTeam1Name());
                stats.setRaidPoints(0);
                stats.setTacklePoints(0);
                matchStatsRepository.save(stats);
            }

            // 8. Create new match stats for team 2 players
            for (String playerId : request.getTeam2Players()) {
                MatchStats stats = new MatchStats();
                stats.setMatchId(matchId);
                stats.setPlayerId(playerId);
                stats.setTeamName(request.getTeam2Name());
                stats.setRaidPoints(0);
                stats.setTacklePoints(0);
                matchStatsRepository.save(stats);
            }

            // 9. Return updated match wrapped in list
            return convertToDto(match);

        } catch (IOException e) {
            throw new NotfoundException("Error uploading images");
        } catch (Exception e) {
            throw new NotfoundException("Error updating match");
        }
    }

    public MatchDto startMatch(String matchId, String userId) {
        Match match = getMatchIfCreator(matchId, userId);

        if (match.getStatus() != MatchStatus.UPCOMING) {
            throw new NotfoundException("Match already started or completed");
        }

        match.setStatus(MatchStatus.LIVE);
        log.info("before start time " + match.getStartTime());
        log.info("after start time " + LocalDateTime.now());
        match.setStartTime(LocalDateTime.now());
        match.setRemainingDuration(match.getTotalDuration());
        log.info("" + match.getTotalDuration());
        matchRepository.save(match);
        
        // Notify subscribers when match goes LIVE
        notifySubscribers(match, "LIVE");
        
        return convertToDto(match);
    }

    public MatchDto pauseMatch(String matchId, String userId) {
        Match match = getMatchIfCreator(matchId, userId);

        if (match.getStatus() != MatchStatus.LIVE) {
            throw new NotfoundException("Match is not live");
        }
        log.info("before pause time" + LocalDateTime.now());
        long elapsed = java.time.Duration.between(match.getStartTime(), LocalDateTime.now()).getSeconds();
        log.info("" + elapsed);
        match.setRemainingDuration(match.getRemainingDuration() - (int) elapsed);
        match.setPauseTime(LocalDateTime.now());
        match.setStatus(MatchStatus.PAUSED);

        matchRepository.save(match);
        log.info("" + match.getRemainingDuration());
        return convertToDto(match);
    }

    public MatchDto resumeMatch(String matchId, String userId) {
        Match match = getMatchIfCreator(matchId, userId);

        if (match.getStatus() != MatchStatus.PAUSED) {
            throw new NotfoundException("Match is not paused");
        }

        match.setStartTime(LocalDateTime.now());
        log.info("before resume time" + LocalDateTime.now());
        match.setStatus(MatchStatus.LIVE);
        matchRepository.save(match);
        return convertToDto(match);
    }

    public MatchDto endMatch(String matchId, String userId) {
        Match match = getMatchIfCreator(matchId, userId);

        if (match.getStatus() == MatchStatus.LIVE) {
            long elapsed = java.time.Duration.between(match.getStartTime(), LocalDateTime.now()).getSeconds();
            match.setRemainingDuration(Math.max(0, match.getRemainingDuration() - (int) elapsed));
        }

        match.setStatus(MatchStatus.COMPLETED);
        matchRepository.save(match);
        
        // Notify subscribers
        notifySubscribers(match, "COMPLETED");
        
        return convertToDto(match);
    }

    public List<MatchDto> searchByMatchName(String matchName) {
        if (matchName == null || matchName.trim().isEmpty()) {
            throw new NotfoundException("Match name must not be empty");
        }

        // Remove spaces from search term
        String cleanedSearch = matchName.replaceAll("\\s+", "");

        // Build regex to match ignoring spaces (use \s* to allow spaces anywhere)
        String regex = cleanedSearch.chars()
                .mapToObj(c -> Pattern.quote(String.valueOf((char) c)) + "\\s*")
                .collect(Collectors.joining());

        List<Match> matches = matchRepository.findByMatchNameOrTeamNamesRegex("^.*" + regex + ".*$", "i");

        return matches.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Utility
    public Match getMatchIfCreator(String matchId, String userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));
        if (!match.getCreatedBy().equals(userId)) {
            throw new NotfoundException("Only creator can perform this action");
        }
        return match;
    }

    public MatchDto convertToDto(Match match) {
        int remaining = match.getRemainingDuration() == null ? 0 : match.getRemainingDuration();
        
        // 1. Calculate elapsed time if match is LIVE
        if (match.getStatus() == MatchStatus.LIVE && match.getStartTime() != null) {
            long elapsed = java.time.Duration.between(match.getStartTime(), LocalDateTime.now()).getSeconds();
            remaining = Math.max(0, remaining - (int) elapsed);
        }

        // 2. Check if time ran out, officially flag COMPLETED and persist
        if (remaining <= 0 && match.getStatus() != MatchStatus.COMPLETED && match.getStatus() != MatchStatus.UPCOMING) {
            remaining = 0;
            match.setRemainingDuration(remaining);
            match.setStatus(MatchStatus.COMPLETED);
            matchRepository.save(match);
            notifySubscribers(match, "COMPLETED");
        }
        User user = userRepository.findById(match.getCreatedBy()).orElse(User.builder().username("Unknown").build());

        return MatchDto.builder()
                .id(match.getId())
                .matchName(match.getMatchName())
                .team1Name(match.getTeam1Name())
                .team2Name(match.getTeam2Name())
                .team1PhotoUrl(match.getTeam1PhotoUrl())
                .team2PhotoUrl(match.getTeam2PhotoUrl())
                .status(match.getStatus())
                .createdAt(match.getCreatedAt())
                .createdBy(match.getCreatedBy())
                .totalDuration(match.getTotalDuration())
                .remainingDuration(remaining)
                .Location(match.getLocation())
                .team1Score(match.getTeam1Score())
                .team2Score(match.getTeam2Score())
                .creatorName(user.getUsername())
                .team1FanVotes(match.getTeam1FanVotes())
                .team2FanVotes(match.getTeam2FanVotes())
                .totalViews(match.getTotalViews() != null ? match.getTotalViews() : 0L)
                .liveViewers(matchViewerService.getViewerCount(match.getId()))
                .scheduledStartTime(match.getScheduledStartTime())
                .build();
    }

    @Transactional
    public MatchDto updateTeamScore(String matchId, String teamName, Integer score) {
        log.info("Starting updateTeamScore");
        log.info("Before Updating");

        Match match = matchRepository.findById(matchId).orElseThrow(() -> new NotfoundException("Match not found"));
        log.info(" Match Name: " + match.getMatchName());
        log.info(" Team 1 Score :" + match.getTeam1Score());
        log.info(" Team 2 Score :" + match.getTeam2Score());
        if (teamName.equals(match.getTeam1Name())) {
            if (score < 0 && match.getTeam1Score() < (-1 * score)) {
                throw new NotfoundException("Team 1 score cannot be negative");
            }
            log.info("Updating Team 1 {} Score to {}", match.getTeam1Name(), score);
            // match.setTeam1Score(match.getTeam1Score() + score);
            Query query = new Query(Criteria.where("id").is(matchId));
            Update update = new Update().inc("team1Score", score);
            mongoTemplate.updateFirst(query, update, Match.class);
        } else if (teamName.equals(match.getTeam2Name())) {
            if (score < 0 && match.getTeam2Score() < (-1 * score)) {
                throw new NotfoundException("Team 2 score cannot be negative");
            }
            log.info("Updating team 2 {} score to {}", match.getTeam2Name(), score);
            // match.setTeam2Score(match.getTeam2Score() + score);
            Query query = new Query(Criteria.where("id").is(matchId));
            Update update = new Update().inc("team2Score", score);
            mongoTemplate.updateFirst(query, update, Match.class);
        } else {
            throw new NotfoundException("Invalid team name provided: " + teamName);
        }
        
        // Reload match to get the updated score
        match = matchRepository.findById(matchId).orElseThrow(() -> new NotfoundException("Match not found"));
        MatchDto updatedMatchDto = convertToDto(match);

        log.info("After Updating ");
        log.info(" Match Name: " + updatedMatchDto.getMatchName());
        log.info(" Team 1 Score :" + updatedMatchDto.getTeam1Score());
        log.info(" Team 2 Score :" + updatedMatchDto.getTeam2Score());
        // Publish update to WebSocket topic for this match
        // messagingTemplate.convertAndSend("/topic/matches/" + matchId,
        // updatedMatchDto);
        // log.info("Published score update for match {}: Team1 Score: {}, Team2 Score:
        // {}",
        // matchId, updatedMatchDto.getTeam1Score(), updatedMatchDto.getTeam2Score());
        log.info("Completed In updateTeamScore");
        return updatedMatchDto;
    }

    public MatchDto setMatch(String setType, String matchId, String userId) {
        log.info("Starting setMatch");
        MatchDto updatedMatchDto;
        if (setType.equals("start")) {
            updatedMatchDto = startMatch(matchId, userId);
        } else if (setType.equals("pause")) {
            updatedMatchDto = pauseMatch(matchId, userId);
        } else if (setType.equals("resume")) {
            updatedMatchDto = resumeMatch(matchId, userId);
        } else if (setType.equals("end")) {
            updatedMatchDto = endMatch(matchId, userId);
        } else {
            throw new NotfoundException("Invalid match set type: " + setType); // Handle invalid types
        }
        ScoreCard scoreCard = getMatchScorecard(matchId);
        log.info("score card to websocket", scoreCard);
        // Publish update to WebSocket topic for this match
        messagingTemplate.convertAndSend("/topic/matches/" + matchId, scoreCard);
        log.info("Published match status update for match {}: {}", matchId, updatedMatchDto.getStatus());
        broadcastMatchUpdate(updatedMatchDto);
        log.info("Completed setMatch");
        return updatedMatchDto;
    }

    public void broadcastMatchUpdate(MatchDto matchDto) {
        // Only broadcast matches that are not UPCOMING or COMPLETED
        if (matchDto.getStatus() != MatchStatus.UPCOMING && matchDto.getStatus() != MatchStatus.COMPLETED) {
            // We'll use a new topic for landing page updates
            messagingTemplate.convertAndSend("/topic/liveMatchesSummary", matchDto);
            log.info("Broadcasted live match summary for match {}: {}", matchDto.getId(), matchDto.getStatus());
        }
    }

    public List<MatchDto> getCreatedMatchesByUserId(String userId) {
        List<Match> createdMatches = matchRepository.findByCreatedBy(userId);
        List<MatchDto> matchDtos = new ArrayList<>();
        for (Match match : createdMatches) {
            matchDtos.add(convertToDto(match));
        }
        return matchDtos;
    }

    public ScoreCard getMatchScorecard(String matchId) {
        log.info("getMatchScorecard for matchId {}", matchId);
        MatchDto matchDto = getMatchById(matchId);
        List<MatchStats> matchStats = matchStatsRepository.findByMatchId(matchId);
        ScoreCard scoreCard = new ScoreCard();
        scoreCard.setMatchId(matchId);
        scoreCard.setMatchName(matchDto.getMatchName());
        scoreCard.setTeam1Name(matchDto.getTeam1Name());
        scoreCard.setTeam2Name(matchDto.getTeam2Name());
        scoreCard.setLocation(matchDto.getLocation());
        scoreCard.setCreatedBy(matchDto.getCreatedBy());
        scoreCard.setCreatedAt(matchDto.getCreatedAt());
        scoreCard.setStatus(matchDto.getStatus());
        scoreCard.setCreatorName(matchDto.getCreatorName());
        scoreCard.setRemainingDuration(matchDto.getRemainingDuration());
        List<TeamStats> team1Stats = new ArrayList<>();
        List<TeamStats> team2Stats = new ArrayList<>();
        scoreCard.setTeam1PhotoUrl(matchDto.getTeam1PhotoUrl());
        scoreCard.setTeam2PhotoUrl(matchDto.getTeam2PhotoUrl());
        // Integer team1Score = 0;
        // Integer team2Score = 0;
        for (MatchStats stats : matchStats) {
            if (stats.getTeamName().equals(matchDto.getTeam1Name())) {
                String name = userRepository.findById(stats.getPlayerId())
                        .orElseThrow(() -> new NotfoundException("User not found with id: " + stats.getPlayerId()))
                        .getName();
                // team1Score = team1Score+ stats.getTacklePoints() + stats.getRaidPoints();
                TeamStats teamStats = TeamStats.builder()
                        .playerId(stats.getPlayerId())
                        .playerName(name)
                        .raidPoints(stats.getRaidPoints())
                        .tacklePoints(stats.getTacklePoints())
                        .build();
                team1Stats.add(teamStats);
            } else if (stats.getTeamName().equals(matchDto.getTeam2Name())) {
                String name = userRepository.findById(stats.getPlayerId())
                        .orElseThrow(() -> new NotfoundException("User not found with id: " + stats.getPlayerId()))
                        .getName();
                // team2Score = team2Score + stats.getRaidPoints() + stats.getTacklePoints();

                TeamStats teamStats = TeamStats.builder()
                        .playerId(stats.getPlayerId())
                        .playerName(name)
                        .raidPoints(stats.getRaidPoints())
                        .tacklePoints(stats.getTacklePoints())
                        .build();
                team2Stats.add(teamStats);
            }
        }
        scoreCard.setTeam1(team1Stats);
        scoreCard.setTeam2(team2Stats);
        scoreCard.setTeam1Score(matchDto.getTeam1Score());
        scoreCard.setTeam2Score(matchDto.getTeam2Score());
        scoreCard.setTotalViews(matchDto.getTotalViews());
        scoreCard.setLiveViewers(matchDto.getLiveViewers());
        scoreCard.setMatchSummary(matchDto.getMatchSummary());
        scoreCard.setTeam1FanVotes(matchDto.getTeam1FanVotes());
        scoreCard.setTeam2FanVotes(matchDto.getTeam2FanVotes());
        scoreCard.setScheduledStartTime(matchDto.getScheduledStartTime());
        log.info("Team 1 score is {}", scoreCard.getTeam1Score());
        log.info("Team 2 score is {}", scoreCard.getTeam2Score());
        log.info("scoreCards: {}", scoreCard);
        return scoreCard;
    }

    public List<PlayerResponse> getTeamPlayersForMatch(String matchId, String teamName) {
        List<MatchStats> matchStats = matchStatsRepository.findByMatchIdAndTeamNameIgnoreCase(matchId, teamName);
        List<PlayerResponse> playerResponseList = new ArrayList<>();
        for (MatchStats stats : matchStats) {
            PlayerResponse playerResponse = new PlayerResponse();
            playerResponse.setPlayerId(stats.getPlayerId());
            User user = userRepository.findById(stats.getPlayerId())
                    .orElseThrow(() -> new NotfoundException("user not found"));
            playerResponse.setPlayerName(user.getName());
            playerResponseList.add(playerResponse);
        }
        return playerResponseList;
    }

    public boolean existsById(String matchId) {
        return matchRepository.existsById(matchId);
    }

    public MatchDto voteForTeam(String matchId, String teamName, String userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));

        if (match.getStatus() != com.kabaddi.kabaddi.util.MatchStatus.LIVE) {
            throw new RuntimeException("Voting allowed only during live match");
        }

        if (!teamName.equals("team1") && !teamName.equals("team2")) {
            throw new NotfoundException("Invalid team selection");
        }

        // Use strict atomic operation
        Query query = new Query(Criteria.where("_id").is(matchId)
                .and("votedUserIds").ne(userId));

        Update update = new Update()
                .addToSet("votedUserIds", userId)
                .inc(teamName.equals("team1") ? "team1FanVotes" : "team2FanVotes", 1);

        com.mongodb.client.result.UpdateResult result = mongoTemplate.updateFirst(query, update, Match.class);

        if (result.getModifiedCount() == 0) {
            throw new RuntimeException("User already voted or match not found");
        }

        // Reload match to return the updated DTO
        match = matchRepository.findById(matchId).orElseThrow(() -> new NotfoundException("Match not found"));
        
        MatchDto matchDto = convertToDto(match);

        // Broadcast vote update
        messagingTemplate.convertAndSend("/topic/matches/" + matchId, matchDto);

        return matchDto;
    }

    public MatchDto updateMatchSummary(String matchId, String summary) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));
        
        match.setMatchSummary(summary);
        matchRepository.save(match);
        
        MatchDto dto = convertToDto(match);
        dto.setMatchSummary(summary); // Ensure it's passed immediately
        
        return dto;
    }

    public void incrementTotalViews(String matchId) {
        Query query = new Query(Criteria.where("id").is(matchId));
        Update update = new Update().inc("totalViews", 1);
        mongoTemplate.updateFirst(query, update, Match.class);
    }

    private void notifySubscribers(Match match, String type) {
        List<com.kabaddi.kabaddi.entity.MatchSubscriber> subscribers = subscriptionService.getSubscribers(match.getId());
        String matchLink = "https://kabach.netlify.app/match/" + match.getId();
        
        for (com.kabaddi.kabaddi.entity.MatchSubscriber sub : subscribers) {
            if ("LIVE".equals(type)) {
                emailService.sendMatchLiveNotification(sub.getEmail(), match.getMatchName(), matchLink);
            } else if ("COMPLETED".equals(type)) {
                String result = match.getTeam1Score() > match.getTeam2Score() ? match.getTeam1Name() : match.getTeam2Name();
                String score = match.getTeam1Score() + " - " + match.getTeam2Score();
                emailService.sendMatchResultNotification(sub.getEmail(), match.getMatchName(), result, score);
            }
        }
        
        // WebSocket notification
        String msg = "LIVE".equals(type) ? "Match is now LIVE!" : "Match completed!";
        messagingTemplate.convertAndSend("/topic/match/" + match.getId() + "/notifications", msg);
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void sendMatchReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusMinutes(15);
        
        List<Match> upcomingMatches = matchRepository.findByStatus(MatchStatus.UPCOMING);
        for (Match match : upcomingMatches) {
            if (!match.isReminderSent() && match.getScheduledStartTime() != null 
                && match.getScheduledStartTime().isBefore(soon) 
                && match.getScheduledStartTime().isAfter(now.minusMinutes(5))) {
                
                List<com.kabaddi.kabaddi.entity.MatchSubscriber> subscribers = subscriptionService.getSubscribers(match.getId());
                String matchLink = "https://kabach.netlify.app/match/" + match.getId();
                
                for (com.kabaddi.kabaddi.entity.MatchSubscriber sub : subscribers) {
                    emailService.sendMatchReminder(sub.getEmail(), match.getMatchName(), matchLink);
                }
                
                match.setReminderSent(true);
                matchRepository.save(match);
                
                messagingTemplate.convertAndSend("/topic/match/" + match.getId() + "/notifications", "Match starts in 15 minutes!");
            }
        }
    }

    public java.util.Map<String, Double> calculateWinProbability(String matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new NotfoundException("Match not found"));

        if (match.getStatus() == MatchStatus.UPCOMING) {
            java.util.Map<String, Double> map = new java.util.HashMap<>();
            map.put("team1Probability", 50.0);
            map.put("team2Probability", 50.0);
            return map;
        }

        if (match.getStatus() == MatchStatus.COMPLETED) {
            int score1 = match.getTeam1Score() != null ? match.getTeam1Score() : 0;
            int score2 = match.getTeam2Score() != null ? match.getTeam2Score() : 0;
            java.util.Map<String, Double> map = new java.util.HashMap<>();
            if (score1 > score2) {
                map.put("team1Probability", 100.0);
                map.put("team2Probability", 0.0);
            } else if (score2 > score1) {
                map.put("team1Probability", 0.0);
                map.put("team2Probability", 100.0);
            } else {
                map.put("team1Probability", 50.0);
                map.put("team2Probability", 50.0);
            }
            return map;
        }

        // Live/Paused probability calculation
        int score1 = match.getTeam1Score() != null ? match.getTeam1Score() : 0;
        int score2 = match.getTeam2Score() != null ? match.getTeam2Score() : 0;
        int scoreDiff = score1 - score2;
        
        // Basic time factor: As time approaches 0, leads are harder to break
        int total = match.getTotalDuration() != null && match.getTotalDuration() > 0 ? match.getTotalDuration() : 2400;
        int remain = match.getRemainingDuration() != null ? match.getRemainingDuration() : total;
        double timeMultiplier = total / (double) Math.max(remain, 1);
        
        double timeRemainingFactor = (scoreDiff < 0 ? -1 : 1) * (timeMultiplier * 2);

        double probability = 50 + (scoreDiff * 5) - timeRemainingFactor;
        probability = Math.max(0, Math.min(100, probability)); // Clamp

        java.util.Map<String, Double> map = new java.util.HashMap<>();
        map.put("team1Probability", Math.round(probability * 10.0) / 10.0);
        map.put("team2Probability", Math.round((100.0 - probability) * 10.0) / 10.0);
        
        return map;
    }
}
