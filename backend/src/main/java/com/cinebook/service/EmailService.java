package com.cinebook.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:hello@cinebook.com}")
    private String fromEmail;

    public void sendVerificationEmail(String to, String name, String otp) {
        try {
            try {
                java.nio.file.Files.writeString(
                    java.nio.file.Path.of("../OTP_CODE.txt"), 
                    "Latest OTP Code for " + to + " is: " + otp + "\n"
                );
            } catch (Exception fileEx) {
                log.error("Failed to write OTP to file", fileEx);
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Verify Your Email - CineBook");

            String htmlContent = String.format(
                "<html>" +
                "<body style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>" +
                "<h2>Verify Your Email</h2>" +
                "<p>Hello %s,</p>" +
                "<p>Welcome to our Movie Ticket Booking Platform.</p>" +
                "<p>Your verification code is:</p>" +
                "<h1 style='color: #e63946; letter-spacing: 5px; font-size: 32px;'>%s</h1>" +
                "<p>This OTP is valid for 5 minutes.</p>" +
                "<p>If you did not request this code, please ignore this email.</p>" +
                "<br/>" +
                "<p>Regards,<br/>Movie Ticket Booking Team</p>" +
                "</body>" +
                "</html>",
                name != null ? name : "User",
                otp
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("OTP Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}. Dev OTP code is: {}", to, otp, e);
        }
    }
}
