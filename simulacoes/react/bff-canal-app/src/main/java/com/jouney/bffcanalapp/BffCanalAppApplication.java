package com.jouney.bffcanalapp;

import com.jouney.bffcanalapp.config.MsJourneyProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(MsJourneyProperties.class)
public class BffCanalAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(BffCanalAppApplication.class, args);
    }
}
