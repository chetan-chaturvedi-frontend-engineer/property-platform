package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Step 4 partial update; explicit null clears every field except {@code projectStatus}. The legal
 * approval status is not part of this request: only reviewers change it (owners sending it get 400).
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateProjectInfoRequest {

	private Optional<@Min(0) @Max(10_000) Integer> totalTowersBlocks;

	private Optional<@Min(0) @Max(1_000_000) Integer> totalUnitsFlats;

	private Optional<@NotNull @Pattern(regexp = ProjectStatus.VALUES,
			message = "must be upcoming, under_construction, ready_to_move, completed, on_hold or cancelled") String> projectStatus;

	private Optional<@DecimalMin(value = "0", inclusive = false) @Digits(integer = 10, fraction = 4) BigDecimal> landArea;

	private Optional<@Pattern(regexp = AreaUnit.VALUES, message = "must be sq_ft, sq_m, acre or hectare") String> landAreaUnit;

	private Optional<LocalDate> possessionStartDate;

	private Optional<LocalDate> possessionEndDate;

	private Optional<@Size(max = PropertyFieldRules.DESCRIPTION_MAX_LENGTH) String> projectDescription;

	private Optional<@Size(max = PropertyFieldRules.MAX_HIGHLIGHTS)
			List<@NotBlank @Size(max = PropertyFieldRules.HIGHLIGHT_MAX_LENGTH) String>> projectHighlights;

}
