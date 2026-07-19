package com.cinebook.config;

import com.cinebook.entity.User;
import com.cinebook.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "raavijithinsai@gmail.com";
        Optional<User> adminOpt = userRepository.findByEmail(adminEmail);
        
        if (adminOpt.isEmpty()) {
            User admin = User.builder()
                    .email(adminEmail)
                    .fullName("Raavi Jithin Sai")
                    .passwordHash(passwordEncoder.encode("carelesscriminal@123"))
                    .emailVerified(true)
                    .role(User.Role.ADMIN)
                    .build();
            userRepository.save(admin);
            System.out.println("Admin user created: " + adminEmail);
        }
    }
}
