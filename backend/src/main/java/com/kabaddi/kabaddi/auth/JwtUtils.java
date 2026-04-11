package com.kabaddi.kabaddi.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    private final UserDetailsService userDetailsService;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expirationMs}")
    private int jwtExpirationMs;

    private Key key;

    public JwtUtils(UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateJwtToken(Authentication authentication) {
        logger.info("Generating JWT Token");
        UserPrinciple userPrincipal = (UserPrinciple) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // public String getUserNameFromJwtToken(String token) {
    // logger.info("Retrieving Username from JWT Token");
    // return
    // Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();
    // }
    public String getUserNameFromJwtToken(String token) {
        // logger.info("Retrieving Username from JWT Token based on userId in token
        // subject");

        // 1. Get the userId from the JWT subject
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();

        // 2. Use this userId to query the UserRepository
        // Find by ID, as your UserPrinciple's getUserId() would correspond to User.id
        // return userRepository.findById(userId)
        // .map(user -> {
        // logger.info("Found user with ID {} and username {}", userId,
        // user.getUsername());
        // return user.getUsername(); // 3. Return the username from the User entity
        // })
        // .orElseThrow(() -> new RuntimeException("User not found with ID: " +
        // userId)); // Handle case where user isn't found
    }

    public boolean validateJwtToken(String authToken) {
        try {
            // logger.info("Validating JWT Token");
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public Authentication getAuthentication(String token) {
        if (!validateJwtToken(token)) {
            return null;
        }

        String username = getUserNameFromJwtToken(token);

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        return new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities());
    }

}
