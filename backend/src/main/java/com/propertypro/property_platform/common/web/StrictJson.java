package com.propertypro.property_platform.common.web;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/**
 * Deserializers that accept only the matching JSON type, instead of Jackson's default coercion (e.g.
 * {@code "true"} or {@code 1} into a boolean, {@code 5} into a string). A mismatch is a 400 validation error
 * on the field. Use on request fields, e.g. {@code @JsonDeserialize(contentUsing = StrictJson.Bool.class)}
 * on an {@code Optional<Boolean>}; JSON {@code null} is handled by the field itself.
 */
public final class StrictJson {

	private StrictJson() {
	}

	/** Only {@code true} or {@code false}. */
	public static class Bool extends ValueDeserializer<Boolean> {

		@Override
		public Boolean deserialize(JsonParser parser, DeserializationContext context) {
			JsonToken token = parser.currentToken();
			if (token == JsonToken.VALUE_TRUE || token == JsonToken.VALUE_FALSE) {
				return token == JsonToken.VALUE_TRUE;
			}
			return (Boolean) context.handleUnexpectedToken(Boolean.class, parser);
		}

	}

	/** Only a JSON string. */
	public static class Text extends ValueDeserializer<String> {

		@Override
		public String deserialize(JsonParser parser, DeserializationContext context) {
			if (parser.currentToken() == JsonToken.VALUE_STRING) {
				return parser.getString();
			}
			return (String) context.handleUnexpectedToken(String.class, parser);
		}

	}

}
