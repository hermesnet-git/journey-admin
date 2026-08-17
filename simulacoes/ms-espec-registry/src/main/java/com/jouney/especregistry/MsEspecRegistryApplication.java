package com.jouney.especregistry;

import com.jouney.especregistry.config.AdminBackProperties;
import com.jouney.especregistry.config.CamundaProperties;
import com.jouney.especregistry.config.KafkaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties({CamundaProperties.class, AdminBackProperties.class, KafkaProperties.class})
@EnableScheduling
public class MsEspecRegistryApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsEspecRegistryApplication.class, args);
    }
}
