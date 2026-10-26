package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Partial update of a media item's metadata. {@code primary: true} makes it the cover image and
 * unsets the previous one; explicit null clears title and description.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateMediaRequest {

	private Optional<@Size(max = 150) String> title;

	private Optional<@Size(max = 2000) String> description;

	private Optional<@NotNull Boolean> primary;

}
