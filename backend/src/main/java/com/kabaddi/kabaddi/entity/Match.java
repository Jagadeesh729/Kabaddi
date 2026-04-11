package com.kabaddi.kabaddi.entity;

import com.kabaddi.kabaddi.util.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {
    @Id
    private String id;

    private String matchName;
    private String team1Name;
    private String team2Name;
    private Integer team1Score;
    private Integer team2Score;
    private String team1PhotoUrl;
    private String team2PhotoUrl;

    private MatchStatus status; // UPCOMING, LIVE, PAUSED,COMPLETED

    private LocalDate createdAt;
    private String createdBy;

    private Integer totalDuration;
    private Integer remainingDuration;

    private LocalDateTime startTime;
    private LocalDateTime pauseTime;

    private String location;

    @Builder.Default
    private Long team1FanVotes = 0L;
    @Builder.Default
    private Long team2FanVotes = 0L;

    private String matchSummary;

    @Builder.Default
    private java.util.List<String> votedUserIds = new java.util.ArrayList<>();

    @Builder.Default
    private Long totalViews = 0L;

    private LocalDateTime scheduledStartTime;
    private boolean reminderSent;
}
