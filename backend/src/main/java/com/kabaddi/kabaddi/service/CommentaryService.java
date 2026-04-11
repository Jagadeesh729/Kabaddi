package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.entity.Commentary;
import com.kabaddi.kabaddi.repository.CommentaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentaryService {
    private final CommentaryRepository commentaryRepository;

    public List<Commentary> findAllCommentaryForMatch(String matchId) {
        log.info(matchId);
        return commentaryRepository.findByMatchIdOrderByDateAndTimeDesc(matchId);
    }

    public void saveCommentary(Commentary commentary) {
        commentaryRepository.save(commentary);
    }

}
