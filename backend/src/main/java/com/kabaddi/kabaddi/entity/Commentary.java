package com.kabaddi.kabaddi.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "commentary")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Commentary {
    @Id
    private String id;
    private String matchId;
    private String commentary;
    private LocalDateTime dateAndTime;
    private Integer team1Score;
    private Integer team2Score;
}
