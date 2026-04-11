package com.kabaddi.kabaddi.util;

import lombok.Data;

@Data
public class commentaryDto {
    private String playerName;
    private String teamName;
    private PointType type;
    private Integer scoredPoints;
}
