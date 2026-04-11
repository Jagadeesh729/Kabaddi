package com.kabaddi.kabaddi.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashSet;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMatchRequest {
    @NotBlank(message = "match name required")
    private String matchName;
    @NotBlank(message = "team 1 name required")
    private String team1Name;
    @NotBlank(message = "team name required")
    private String team2Name;

    // @NotNull(message = "Team 1 photo is required")
    private MultipartFile team1Photo;

    // @NotNull(message = "Team 2 photo is required")
    private MultipartFile team2Photo;

    @NotBlank(message = "owner required")
    private String createdBy;
    @NotNull(message = "Team 1 players list must not be empty")
    @Size(min = 7, max = 7, message = "Team 1 must have exactly 7 players")
    private HashSet<String> team1Players;

    @NotNull(message = "Team 2 players list must not be empty")
    @Size(min = 7, max = 7, message = "Team 2 must have exactly unique 7 players")
    private HashSet<String> team2Players;
    private LocalDate matchDate;
    @NotNull(message = "Total duration is required")
    @Min(value = 4, message = "Total duration must be at least 15 minutes")
    @Max(value = 60, message = "Total duration cannot exceed 60 minutes")
    private Integer totalDuration;
    @NotBlank(message = "location required for searching")
    private String location;

    private String matchTime; // format: HH:mm
}
