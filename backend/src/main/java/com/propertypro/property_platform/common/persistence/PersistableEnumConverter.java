package com.propertypro.property_platform.common.persistence;

import jakarta.persistence.AttributeConverter;

/**
 * Base JPA converter for {@link PersistableEnum}s; subclasses only pass the enum type.
 */
public abstract class PersistableEnumConverter<E extends Enum<E> & PersistableEnum>
		implements AttributeConverter<E, String> {

	private final Class<E> type;

	protected PersistableEnumConverter(Class<E> type) {
		this.type = type;
	}

	@Override
	public String convertToDatabaseColumn(E value) {
		return value == null ? null : value.getValue();
	}

	@Override
	public E convertToEntityAttribute(String value) {
		return value == null ? null : PersistableEnum.fromValue(type, value);
	}

}
