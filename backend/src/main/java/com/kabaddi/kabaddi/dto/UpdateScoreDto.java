package com.kabaddi.kabaddi.dto;

import com.kabaddi.kabaddi.util.PointType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateScoreDto {
    private String teamName;
    private String playerId;
    private PointType pointType;
    private Integer points;
}