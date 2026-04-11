package com.kabaddi.kabaddi.repository;

import com.kabaddi.kabaddi.entity.MatchStats;
import com.kabaddi.kabaddi.dto.LeaderboardEntryDto;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchStatsRepository extends MongoRepository<MatchStats, String> {

        @Aggregation(pipeline = {
                        "{ $group: { _id: '$playerId', totalRaidPoints: { $sum: '$raidPoints' }, totalTacklePoints: { $sum: '$tacklePoints' } } }",
                        "{ $addFields: { playerObjId: { $toObjectId: '$_id' } } }",
                        "{ $lookup: { from: 'users', localField: 'playerObjId', foreignField: '_id', as: 'user' } }",
                        "{ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }",
                        "{ $project: { playerId: '$_id', playerName: { $ifNull: ['$user.name', 'Unknown Player'] }, totalRaidPoints: 1, totalTacklePoints: 1, totalPoints: { $add: ['$totalRaidPoints', '$totalTacklePoints'] } } }",
                        "{ $sort: { totalPoints: -1 } }"
        })
        List<LeaderboardEntryDto> getAggregatedLeaderboard();

        void deleteByMatchId(String matchId);

        List<MatchStats> findByMatchIdAndTeamNameIgnoreCase(String matchId, String teamName);

        List<MatchStats> findByMatchId(String matchId);

        MatchStats findByMatchIdAndPlayerId(String matchId, String playerId);

        List<MatchStats> findByPlayerId(String playerId);

        MatchStats findFirstByPlayerIdOrderByMatchIdAsc(String playerId);

        List<MatchStats> findTop5ByPlayerIdOrderByMatchIdDesc(String playerId);
}
