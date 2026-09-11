package com.jouney.especregistry;

import com.jouney.especregistry.config.StrapiProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({StrapiProperties.class})
public class MsEspecRegistryApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsEspecRegistryApplication.class, args);
    }
}
