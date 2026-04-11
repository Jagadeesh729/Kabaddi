package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.dto.*;
import com.kabaddi.kabaddi.entity.User;
import com.kabaddi.kabaddi.exception.FileUploadException;
import com.kabaddi.kabaddi.exception.NotfoundException;
import com.kabaddi.kabaddi.repository.UserRepository;
import com.kabaddi.kabaddi.util.PlayerResponse;
import com.kabaddi.kabaddi.util.UserRole;
import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    // private PasswordEncoder encoder = new BCryptPasswordEncoder();

    private final UserRepository userRepository;

    private final MatchStatsService matchStatsService;

    private final ImageUploadService imageUploadService;

    private final MatchService matchService;

    private final PasswordEncoder passwordEncoder;

    public UserDto createUser(RequestUserDto requestUserDto) {
        try {
            String imageUrl = null;
            if (requestUserDto.getImage() != null && !requestUserDto.getImage().isEmpty()) {
                imageUrl = imageUploadService.uploadImage(requestUserDto.getImage());
            }
            if (userRepository.existsByUsername(requestUserDto.getUsername())) {
                throw new NotfoundException("Username is already in use");
            }

            User user = User.builder()
                    .name(requestUserDto.getName())
                    .username(requestUserDto.getUsername())
                    .password(passwordEncoder.encode(requestUserDto.getPassword()))
                    .location(requestUserDto.getLocation())
                    .phone(requestUserDto.getPhone())
                    .url(imageUrl)
                    .createdAt(LocalDate.now())
                    .about(requestUserDto.getAbout() == null ? " " : requestUserDto.getAbout())
                    .height(requestUserDto.getHeight() == null ? 0 : requestUserDto.getHeight())
                    .weight(requestUserDto.getWeight() == null ? 0 : requestUserDto.getWeight())
                    .age(requestUserDto.getAge() == null ? 0 : requestUserDto.getAge())
                    .userRole(UserRole.USER)
                    .build();

            userRepository.save(user);
            return convertToUserDto(user);

        } catch (IOException e) {
            throw new FileUploadException("Failed to upload image");
        }
    }

    public List<PlayerResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<PlayerResponse> userDtos = new ArrayList<>();
        for (User user : users) {
            PlayerResponse playerResponse = new PlayerResponse();
            playerResponse.setPlayerId(user.getId());
            playerResponse.setPlayerName(user.getUsername());
            userDtos.add(playerResponse);
        }
        return userDtos;
    }

    public UserDto updateUser(String id, UpdateRequestUserDto requestUserDto) {
        try {
            // Find existing user by id or throw if not found
            User existingUser = userRepository.findById(id)
                    .orElseThrow(() -> new NotfoundException("User not found with id: " + id));
            // Check if username is changing and already used by someone else
            if (!existingUser.getUsername().equals(requestUserDto.getUsername()) &&
                    userRepository.existsByUsername(requestUserDto.getUsername())) {
                throw new NotfoundException("Username is already in use");
            }

            String imageUrl = existingUser.getUrl(); // keep old image URL if not updated
            if (requestUserDto.getImage() != null && !requestUserDto.getImage().isEmpty()) {
                imageUrl = imageUploadService.uploadImage(requestUserDto.getImage());
            }

            // Update fields
            existingUser.setName(requestUserDto.getName());
            existingUser.setUsername(requestUserDto.getUsername());
            if (requestUserDto.getPassword() != null && !requestUserDto.getPassword().isEmpty()) {
                log.info("Password : " + requestUserDto.getPassword());
                existingUser.setPassword(passwordEncoder.encode(requestUserDto.getPassword()));
            }
            existingUser.setAbout(requestUserDto.getAbout());
            existingUser.setHeight(requestUserDto.getHeight());
            existingUser.setWeight(requestUserDto.getWeight());
            existingUser.setPhone(requestUserDto.getPhone());
            existingUser.setLocation(requestUserDto.getLocation());
            existingUser.setUrl(imageUrl);
            existingUser.setAge(requestUserDto.getAge());
            userRepository.save(existingUser);

            return convertToUserDto(existingUser);

        } catch (IOException e) {
            throw new FileUploadException("Failed to upload image");
        }
    }

    public UserDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotfoundException("User not found with id: " + id));
        return convertToUserDto(user);
    }

    public UserDto convertToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .url(user.getUrl())
                .username(user.getUsername())
                .password(user.getPassword())
                .weight(user.getWeight())
                .about(user.getAbout())
                .height(user.getHeight())
                .phone(user.getPhone())
                .location(user.getLocation())
                .age(user.getAge())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public void deleteById(String id) {
        if (!userRepository.existsById(id)) {
            throw new NotfoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    public UserStats getUserProfile(String userId) {
        log.info("received player id " + userId);
        return matchStatsService.getUserStats(userId);
    }

    public List<MatchDto> getMatchesByUserId(String userId) {
        return matchStatsService.getMatchesPlayedByUser(userId);
    }

    public List<MatchDto> getCreatedMatchesByUserId(String userId) {
        return matchService.getCreatedMatchesByUserId(userId);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotfoundException("User not found with username: " + username));
    }

    public UserDto getUserDetailsById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotfoundException("User not found with id: " + userId));
        UserDto userDto = convertToUserDto(user);
        userDto.setPassword("");
        return userDto;
    }
}
