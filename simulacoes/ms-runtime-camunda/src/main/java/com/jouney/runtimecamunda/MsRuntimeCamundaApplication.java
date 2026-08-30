package com.jouney.runtimecamunda;

import com.jouney.runtimecamunda.config.KafkaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(KafkaProperties.class)
@EnableScheduling
public class MsRuntimeCamundaApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsRuntimeCamundaApplication.class, args);
    }
}
