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

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class CineBookApplication {

    private static final Logger logger = LoggerFactory.getLogger(CineBookApplication.class);

    @Autowired
    private Environment env;

    public static void main(String[] args) {
        SpringApplication.run(CineBookApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupConfiguration() {
        String activeProfiles = String.join(", ", env.getActiveProfiles());
        String dbUrl = env.getProperty("spring.datasource.url");
        
        logger.info("=========================================================");
        logger.info("CineBook Application Started successfully!");
        logger.info("Active Spring Profiles: {}", activeProfiles.isEmpty() ? "default" : activeProfiles);
        logger.info("Resolved JDBC URL: {}", dbUrl);
        logger.info("TLS Enabled in URL: {}", dbUrl != null && (dbUrl.contains("sslMode=VERIFY_IDENTITY") || dbUrl.contains("useSSL=true")));
        logger.info("=========================================================");
    }
}
