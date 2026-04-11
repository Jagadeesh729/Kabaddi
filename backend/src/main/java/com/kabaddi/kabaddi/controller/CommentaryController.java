package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.entity.Commentary;
import com.kabaddi.kabaddi.service.CommentaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/commentary")
public class CommentaryController {
    private final CommentaryService commentaryService;

    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<Commentary>> getCommentaryForMatch(@PathVariable String matchId) {
        return ResponseEntity.status(HttpStatus.OK).body(commentaryService.findAllCommentaryForMatch(matchId));
    }
}
