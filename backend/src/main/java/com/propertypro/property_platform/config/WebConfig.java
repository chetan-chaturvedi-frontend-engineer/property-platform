package com.propertypro.property_platform.config;

import com.propertypro.property_platform.activitylog.web.SystemLogInterceptor;
import com.propertypro.property_platform.security.CurrentActorArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

	private final CurrentActorArgumentResolver currentActorArgumentResolver;
	private final SystemLogInterceptor systemLogInterceptor;

	@Override
	public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
		resolvers.add(currentActorArgumentResolver);
	}

	/** Login, logout and token endpoints are logged by their services, which know the outcome. */
	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(systemLogInterceptor)
			.addPathPatterns("/api/v1/**")
			.excludePathPatterns("/api/v1/auth/**", "/api/v1/public/**", "/api/v1/admin/login", "/api/v1/admin/refresh",
					"/api/v1/admin/logout");
	}

}
