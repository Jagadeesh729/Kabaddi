package com.kabaddi.kabaddi.dto;

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
public class UserStats {
    private String userId;
    private Integer raidPoints;
    private Integer totalPoints;
    private Integer tacklePoints;
    private Integer totalMatches;
    private LocalDate debutMatch;
    private List<UserMatch> matches;
}
