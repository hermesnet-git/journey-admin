package com.jouney.bffcanalweb;

import com.jouney.bffcanalweb.config.MsJourneyProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(MsJourneyProperties.class)
public class BffCanalWebApplication {

    public static void main(String[] args) {
        SpringApplication.run(BffCanalWebApplication.class, args);
    }
}
