package com.jouney.journey;

import com.jouney.journey.config.CamundaProperties;
import com.jouney.journey.config.EspecRegistryProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({CamundaProperties.class, EspecRegistryProperties.class})
public class MsJourneyApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsJourneyApplication.class, args);
    }
}
