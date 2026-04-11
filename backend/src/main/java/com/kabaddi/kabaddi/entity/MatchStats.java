package com.kabaddi.kabaddi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "match_stats")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchStats {
    @Id
    private String id;

    @Indexed
    private String matchId;

    @Indexed
    private String playerId;

    @Indexed
    private String teamName;

    private Integer raidPoints;
    private Integer tacklePoints;
}
