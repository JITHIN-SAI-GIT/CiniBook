package com.cinebook.controller;

import com.cinebook.dto.*;
import com.cinebook.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AuthController {   

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody SignupRequest req) {
        log.info("Incoming signup request for email: {}", req.getEmail());
        return ResponseEntity.ok(authService.signup(req));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            return ResponseEntity.ok(authService.login(req));
        } catch (RuntimeException e) {
            if ("EMAIL_NOT_VERIFIED".equals(e.getMessage())) {
                // Return a proper {message} field so the frontend can detect EMAIL_NOT_VERIFIED
                return ResponseEntity.status(403)
                        .body(Map.of("message", "EMAIL_NOT_VERIFIED"));
            }
            throw e;
        }
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(authService.googleLogin(req));
    }
        
    @PostMapping("/verify-email-otp")
    public ResponseEntity<AuthResponse> verifyEmailOtp(@RequestBody VerifyOtpRequest req) {
        log.info("Incoming verify-email-otp request for email: {}", req.getEmail());
        return ResponseEntity.ok(authService.verifyOtp(req));
    }
    
    @PostMapping("/resend-email-otp")
    public ResponseEntity<?> resendEmailOtp(@RequestBody ResendOtpRequest req) {
        log.info("Incoming resend-email-otp request for email: {}", req.getEmail());
        authService.resendOtp(req);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication auth) {
        // Guard against unauthenticated requests (auth is null when no valid JWT is provided)
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(authService.getProfile(userId));
    }
}
