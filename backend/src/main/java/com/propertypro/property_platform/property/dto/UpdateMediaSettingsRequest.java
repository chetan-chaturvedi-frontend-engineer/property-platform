package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Step 6 settings besides the media items: the 3D tour link (https, on an allowed tour host).
 * Explicit null removes it.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateMediaSettingsRequest {

	private Optional<@Size(max = 2048) String> threeDTourUrl;

}
