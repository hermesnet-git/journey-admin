package com.jouney.admin.infrastructure.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

// ponytail: Spring Boot 4.1's autoconfigure module dropped Flyway auto-configuration
// (no FlywayAutoConfiguration class shipped), so migrations are triggered manually
// here, before the JPA EntityManagerFactory bean validates the schema. Revert to
// spring.flyway.* properties once Boot restores the starter/autoconfiguration.
@Component
public class FlywayMigrationInitializer implements BeanFactoryPostProcessor, EnvironmentAware {

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        Flyway.configure()
                .dataSource(
                        environment.getRequiredProperty("spring.datasource.url"),
                        environment.getRequiredProperty("spring.datasource.username"),
                        environment.getRequiredProperty("spring.datasource.password"))
                .load()
                .migrate();
    }
}
