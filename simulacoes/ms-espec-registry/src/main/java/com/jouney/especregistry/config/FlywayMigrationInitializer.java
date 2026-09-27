package com.jouney.especregistry.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

// Spring Boot 4.1 não traz mais a autoconfiguração do Flyway (spring.flyway.* é ignorado), então a
// migration roda aqui, antes dos beans JPA — mesmo padrão do FlywayMigrationInitializer do admin/back.
// Schema e histórico próprios (espec_registry), separados do public, que é do admin/back.
@Component
public class FlywayMigrationInitializer implements BeanFactoryPostProcessor, EnvironmentAware {

    private static final String SCHEMA = "espec_registry";

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
                .schemas(SCHEMA)
                .defaultSchema(SCHEMA)
                .createSchemas(true)
                .load()
                .migrate();
    }
}
