package com.kabaddi.kabaddi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("kabaddi-match-center@gmail.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendMatchReminder(String to, String matchName, String matchLink) {
        String subject = "Match Reminder – Starting Soon";
        String body = "The match between " + matchName + " will start soon.\n\nJoin here: " + matchLink;
        sendEmail(to, subject, body);
    }

    public void sendMatchLiveNotification(String to, String matchName, String matchLink) {
        String subject = "Match is LIVE";
        String body = matchName + " is now LIVE.\n\nWatch here: " + matchLink;
        sendEmail(to, subject, body);
    }

    public void sendMatchResultNotification(String to, String matchName, String winner, String score) {
        String subject = "Match Result";
        String body = "Match completed.\n\n" + matchName + "\nWinner: " + winner + "\nFinal Score: " + score;
        sendEmail(to, subject, body);
    }
}
