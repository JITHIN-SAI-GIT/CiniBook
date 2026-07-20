package com.cinebook.config;

import com.cinebook.entity.User;
import com.cinebook.entity.Theatre;
import com.cinebook.repository.UserRepository;
import com.cinebook.repository.TheatreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TheatreRepository theatreRepository;
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

        if (theatreRepository.count() == 0) {
            Theatre pvr = Theatre.builder()
                    .name("PVR Cinemas: VR Mall")
                    .location("VR Bengaluru, Whitefield Main Road")
                    .city("Bengaluru")
                    .state("Karnataka")
                    .country("India")
                    .latitude(12.9961)
                    .longitude(77.6954)
                    .screens(4)
                    .seatCapacity(150)
                    .hasParking(true)
                    .hasFoodCourt(true)
                    .isWheelchairAccessible(true)
                    .isBookingEnabled(true)
                    .build();

            Theatre inox = Theatre.builder()
                    .name("INOX: Forum Mall")
                    .location("The Forum Koramangala Mall")
                    .city("Bengaluru")
                    .state("Karnataka")
                    .country("India")
                    .latitude(12.9345)
                    .longitude(77.6112)
                    .screens(3)
                    .seatCapacity(200)
                    .hasParking(true)
                    .hasFoodCourt(true)
                    .isWheelchairAccessible(true)
                    .isBookingEnabled(true)
                    .build();

            Theatre cinepolis = Theatre.builder()
                    .name("Cinepolis: Orion Mall")
                    .location("Brigade Gateway, Malleshwaram")
                    .city("Bengaluru")
                    .state("Karnataka")
                    .country("India")
                    .latitude(13.0116)
                    .longitude(77.5550)
                    .screens(5)
                    .seatCapacity(250)
                    .hasParking(true)
                    .hasFoodCourt(true)
                    .isWheelchairAccessible(true)
                    .isBookingEnabled(true)
                    .build();

            theatreRepository.saveAll(java.util.Arrays.asList(pvr, inox, cinepolis));
            System.out.println("Default theatres seeded.");
        }
    }
}
