package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.PublicationStatus;

import java.util.List;

/**
 * Wizard progress, computed by the server from saved data. {@code currentStep} is the first incomplete
 * step (7 once steps 1-6 are complete); {@code readyToSubmit} is true when the property is complete and
 * may be submitted from its current status.
 */
public record WizardResponse(Long propertyId, long version, PublicationStatus publicationStatus, int currentStep,
		List<Integer> completedSteps, boolean readyToSubmit, List<Step> steps) {

	/** @param missing required fields (or items, e.g. {@code apartments}) still missing for this step */
	public record Step(int step, String key, String title, boolean complete, List<String> missing) {
	}

}
