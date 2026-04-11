package com.kabaddi.kabaddi.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Document(collection = "match_issues")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchIssue {

    @Id
    private String id;

    private String matchId;
    private String reporterName;
    private String reporterId; // Added for tracking
    private String category;
    private String priority;
    private String description;
    private String screenshot; // Base64 encoded image
    private String creatorResponse;

    private String status = "PENDING"; // PENDING, RESOLVED, IGNORED

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime resolvedAt;
}
