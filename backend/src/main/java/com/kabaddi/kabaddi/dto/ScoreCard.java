package com.kabaddi.kabaddi.dto;

import com.kabaddi.kabaddi.util.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ScoreCard {

    private String matchId;
    private String matchName;
    private String team1Name;
    private String team2Name;
    private String team1PhotoUrl;
    private String team2PhotoUrl;
    private Integer team1Score;
    private Integer team2Score;
    private Integer team1WinProbability;
    private Integer team2WinProbability;
    private String location;
    private LocalDate createdAt;
    private String createdBy;
    private String creatorName;
    private MatchStatus status;
    private Integer remainingDuration;
    private List<TeamStats> team1;
    private List<TeamStats> team2;
    private String liveCommentary;
    private String matchSummary;
    private Long totalViews;
    private Long liveViewers;
    private Long team1FanVotes;
    private Long team2FanVotes;
    private java.time.LocalDateTime scheduledStartTime;
}
