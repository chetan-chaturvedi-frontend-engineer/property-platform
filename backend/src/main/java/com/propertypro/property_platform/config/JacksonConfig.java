package com.propertypro.property_platform.config;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.deser.DeserializationProblemHandler;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import java.util.List;

@Configuration
public class JacksonConfig {

	/** Unknown JSON fields stay ignored, except on types annotated with {@link RejectUnknownFields}. */
	@Bean
	JsonMapperBuilderCustomizer rejectUnknownFieldsCustomizer() {
		return builder -> builder.addHandler(new DeserializationProblemHandler() {
			@Override
			public boolean handleUnknownProperty(DeserializationContext context, JsonParser parser,
					ValueDeserializer<?> deserializer, Object beanOrClass, String propertyName) {
				Class<?> type = deserializer != null && deserializer.handledType() != null ? deserializer.handledType()
						: beanOrClass instanceof Class<?> c ? c : beanOrClass.getClass();
				if (type.isAnnotationPresent(RejectUnknownFields.class)) {
					throw UnrecognizedPropertyException.from(parser, beanOrClass, propertyName, List.of());
				}
				return false;
			}
		});
	}

}
