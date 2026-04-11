package com.kabaddi.kabaddi.util;

import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class PlayerResponse {
    private String playerName;
    private String playerId;
}
