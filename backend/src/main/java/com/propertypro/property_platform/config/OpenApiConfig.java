package com.propertypro.property_platform.config;

import com.propertypro.property_platform.security.CurrentActor;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI document and Swagger UI. Disabled by default; the dev profile enables them at
 * /swagger-ui.html. Protected endpoints declare {@link #BEARER_AUTH} individually.
 */
@Configuration
public class OpenApiConfig {

	public static final String BEARER_AUTH = "bearerAuth";

	static {
		// Resolved from the security context, not from the request.
		SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentActor.class);
	}

	@Bean
	OpenAPI openApi() {
		return new OpenAPI()
				.info(new Info().title("Property Platform API").version("v1"))
				.components(new Components().addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
						.type(SecurityScheme.Type.HTTP)
						.scheme("bearer")
						.bearerFormat("JWT")
						.description("Paste the accessToken from /api/v1/auth/login (without 'Bearer ').")));
	}

}
