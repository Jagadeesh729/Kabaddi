package com.kabaddi.kabaddi.controller;

import com.kabaddi.kabaddi.dto.*;
import com.kabaddi.kabaddi.service.UserService;
import com.kabaddi.kabaddi.util.PlayerResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
@Tag(name = "User - Controller", description = "manages users")
@Slf4j
public class UserController {

    private final UserService userService;

    @PostMapping("/user/create")
    public ResponseEntity<UserDto> createUser(@Valid @ModelAttribute RequestUserDto requestUserDto) {
        UserDto savedUserDto = userService.createUser(requestUserDto);
        return ResponseEntity.ok(savedUserDto);
    }

    @GetMapping("/all")
    public ResponseEntity<List<PlayerResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getUserDetailsById(userId));
    }

    @GetMapping("/userdetails/{userId}")
    public ResponseEntity<UserDto> getUserDetailsById(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @PutMapping("/user/update/{userId}")
    public ResponseEntity<UserDto> updateUser(@PathVariable String userId, @Valid @ModelAttribute UpdateRequestUserDto requestUserDto) {
        log.info(requestUserDto.toString());
        return ResponseEntity.ok(userService.updateUser(userId, requestUserDto));
    }

    @DeleteMapping("/user/delete/{userId}")
    public ResponseEntity<String> deleteUser(@PathVariable String userId) {
        userService.deleteById(userId); // assuming this throws exception if not found
        return ResponseEntity.ok("deleted"); // 204 No Content
    }

    @GetMapping("/user/{playerId}/profile")
    public ResponseEntity<UserStats> getUserProfile(@PathVariable String playerId) {
        log.info("received player id " + playerId);
        return ResponseEntity.ok(userService.getUserProfile(playerId));
    }

    @GetMapping("/user/{userId}/played-matches")
    public ResponseEntity<List<MatchDto>> getPlayedMatchesByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getMatchesByUserId(userId));
    }

    @GetMapping("/user/{userId}/created-matches")
    public ResponseEntity<List<MatchDto>> getCreatedMatchesByUserId(@PathVariable String userId) {
        log.info("created-matches " + userId);
        return ResponseEntity.ok(userService.getCreatedMatchesByUserId(userId));
    }
}