package com.jouney.transformpublication;

import com.jouney.transformpublication.camunda.CamundaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(CamundaProperties.class)
public class MsTransformPublicationApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsTransformPublicationApplication.class, args);
        
    }
}
