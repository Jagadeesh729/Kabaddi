package com.kabaddi.kabaddi.auth;

import com.kabaddi.kabaddi.dto.RequestUserDto;
import com.kabaddi.kabaddi.dto.UserDto;
import com.kabaddi.kabaddi.entity.User;
import com.kabaddi.kabaddi.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserService userService; // To handle user registration logic

    @PostMapping(value = "/register")
    public ResponseEntity<UserDto> registerUser(
            @Valid @ModelAttribute RequestUserDto requestUserDto // Use your existing DTO
    ) {
        // log.info("Registering User: {}", requestUserDto);
        UserDto userDto = userService.createUser(requestUserDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(userDto);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        // log.info("Username : "+loginRequest.getUsername());
        // log.info("Password : "+loginRequest.getPassword());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));
        // log.info("Authentication ok");
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        // log.info("JWT generated");
        UserPrinciple userPrincipal = (UserPrinciple) authentication.getPrincipal();
        // Fetch the full User entity to get the URL
        User user = userService.findByUsername(userPrincipal.getUsername());
        JwtResponse jwtResponse = new JwtResponse();
        jwtResponse.setToken(jwt);
        jwtResponse.setUser(user.getId());
        // jwtResponse.setUserDetails(userService.convertToUserDto(user));

        return ResponseEntity.status(HttpStatus.OK).body(jwtResponse);
    }
}