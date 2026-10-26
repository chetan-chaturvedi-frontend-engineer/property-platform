package com.propertypro.property_platform.common.persistence;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Enum stored (and serialized to JSON) as a stable lowercase value instead of its constant name.
 */
public interface PersistableEnum {

	@JsonValue
	String getValue();

	static <E extends Enum<E> & PersistableEnum> E fromValue(Class<E> type, String value) {
		for (E constant : type.getEnumConstants()) {
			if (constant.getValue().equals(value)) {
				return constant;
			}
		}
		throw new IllegalArgumentException("Unknown " + type.getSimpleName() + ": " + value);
	}

}
