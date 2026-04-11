package com.kabaddi.kabaddi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserMatch {
    private String matchId;
    private String oppositeTeamName;
    private String location;
    private LocalDate matchDate;
    private Integer team1Score;
    private Integer team2Score;
    private Integer totalPoints;
    private Integer raidPoints;
    private Integer tacklePoints;

}
