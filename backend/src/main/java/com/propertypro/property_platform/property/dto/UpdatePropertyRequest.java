package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

/**
 * Updates fields of several wizard steps in one request, atomically. Each section follows the rules of
 * its step request; omitted sections and fields are left unchanged.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdatePropertyRequest {

	@Valid
	private UpdatePropertyDetailsRequest details;

	@Valid
	private UpdatePropertyLocationRequest location;

	@Valid
	private UpdateProjectInfoRequest projectInfo;

	@Valid
	private UpdateMediaSettingsRequest mediaSettings;

}
