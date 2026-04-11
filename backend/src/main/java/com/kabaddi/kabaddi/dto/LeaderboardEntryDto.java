package com.kabaddi.kabaddi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryDto {
    private String playerId;
    private String playerName;
    private int totalRaidPoints;
    private int totalTacklePoints;
    private int totalPoints;
}
