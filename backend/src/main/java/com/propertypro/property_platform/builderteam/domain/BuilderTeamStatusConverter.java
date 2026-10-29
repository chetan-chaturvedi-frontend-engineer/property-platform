package com.propertypro.property_platform.builderteam.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BuilderTeamStatusConverter extends PersistableEnumConverter<BuilderTeamStatus> {

	public BuilderTeamStatusConverter() {
		super(BuilderTeamStatus.class);
	}

}
