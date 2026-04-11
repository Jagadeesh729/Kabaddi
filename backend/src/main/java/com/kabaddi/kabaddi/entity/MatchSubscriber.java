package com.kabaddi.kabaddi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Document(collection = "match_subscribers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchSubscriber {
    @Id
    private String id;

    @Indexed
    private String matchId;

    private String userId; // Optional for logged-in users

    @Indexed
    private String email;

    private LocalDateTime subscribedAt;
}
