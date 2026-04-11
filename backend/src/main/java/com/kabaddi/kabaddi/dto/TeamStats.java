package com.kabaddi.kabaddi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TeamStats{
    private String playerId;
    private String playerName;
    private Integer raidPoints;
    private Integer tacklePoints;
}
