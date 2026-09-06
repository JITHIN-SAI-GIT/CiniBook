package com.cinebook;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.core.env.Environment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class CineBookApplication {

    private static final Logger logger = LoggerFactory.getLogger(CineBookApplication.class);

    @Autowired
    private Environment env;

    @Autowired
    private DataSource dataSource;

    public static void main(String[] args) {
        SpringApplication.run(CineBookApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupConfiguration() {
        String activeProfiles = String.join(", ", env.getActiveProfiles());
        String dbUrl = env.getProperty("spring.datasource.url");
        String dbUser = env.getProperty("spring.datasource.username");

        logger.info("=========================================================");
        logger.info("CineBook Application Started successfully!");
        logger.info("Active Spring Profiles: {}", activeProfiles.isEmpty() ? "default" : activeProfiles);
        logger.info("Resolved JDBC URL: {}", dbUrl);
        logger.info("Database User: {}", dbUser);
        logger.info("TLS Enabled in URL: {}", dbUrl != null && (dbUrl.contains("sslMode=VERIFY_IDENTITY") || dbUrl.contains("useSSL=true")));

        // Verify actual database connection with a test query
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT DATABASE()");
            if (rs.next()) {
                String actualDb = rs.getString(1);
                logger.info("Actual connected database (SELECT DATABASE()): {}", actualDb);
            }
            rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()");
            if (rs.next()) {
                logger.info("Number of tables in database: {}", rs.getInt(1));
            }
        } catch (Exception e) {
            logger.error("Failed to verify database connection: {}", e.getMessage());
        }

        logger.info("=========================================================");
    }
}
