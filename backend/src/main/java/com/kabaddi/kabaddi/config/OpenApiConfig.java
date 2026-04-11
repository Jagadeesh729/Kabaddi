package com.kabaddi.kabaddi.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "Kabaddi API", version = "1.0", description = "API documentation for the Kabaddi application.", contact = @Contact(name = "Sajjarao Mallikarjuna", email = "smallikarjun@713@gmail.com"), license = @License(name = "Apache 2.0", url = "http://www.apache.org/licenses/LICENSE-2.0.html")))
public class OpenApiConfig {

        private static final String SCHEME_NAME = "bearerAuth";
        private static final String SCHEME = "Bearer";

        @Bean
        public OpenAPI customOpenAPI() {
                return new OpenAPI()
                                .addSecurityItem(new SecurityRequirement().addList(SCHEME_NAME))
                                .components(new Components()
                                                .addSecuritySchemes(SCHEME_NAME,
                                                                new SecurityScheme()
                                                                                .name(SCHEME_NAME)
                                                                                .type(SecurityScheme.Type.HTTP)
                                                                                .scheme(SCHEME)
                                                                                .bearerFormat("JWT")));
        }
}