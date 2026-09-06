package com.jouney.especregistry.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** apiToken sem default — precisa ser gerado manualmente no admin do Strapi (Settings > API Tokens,
 * permissão leitura+escrita em sdui-snapshot) antes de qualquer publicação/leitura funcionar. */
@ConfigurationProperties(prefix = "app.strapi")
public record StrapiProperties(String baseUrl, String apiToken) {
}
