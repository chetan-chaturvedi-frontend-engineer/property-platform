package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import com.propertypro.property_platform.property.dto.WizardResponse;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectAmenityRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Wizard progress, always computed from saved data: clients cannot mark a step complete. A step is
 * complete when the data required for submission is saved:
 * <ol>
 * <li>Property details: type, project and builder name, email, phone (always, once created).</li>
 * <li>Location: address, city, locality, PIN code, state.</li>
 * <li>Unit types: at least one apartment configuration, each with an area range.</li>
 * <li>Project information: a project description.</li>
 * <li>Amenities: at least one.</li>
 * <li>Media: at least one photo (the first becomes the cover).</li>
 * <li>Preview and submit: steps 1-6 complete and the property submitted.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class PropertyWizardService {

	public static final int LAST_STEP = 7;
	private static final List<String> TITLES = List.of("Property details", "Location", "Unit types and apartments",
			"Project information", "Amenities", "Media", "Preview and submit");
	private static final List<String> KEYS = List.of("details", "location", "apartments", "project_info", "amenities",
			"media", "preview");

	private final PropertyProjectRepository projectRepository;
	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyProjectMediaRepository mediaRepository;
	private final PropertyProjectAmenityRepository projectAmenityRepository;
	private final PropertyStatusHistoryService statusHistory;
	private final Clock clock;

	@Transactional(readOnly = true)
	public WizardResponse evaluate(PropertyProject project) {
		Map<Integer, List<String>> missing = missingByStep(project);
		List<WizardResponse.Step> steps = new ArrayList<>();
		List<Integer> completed = new ArrayList<>();
		boolean allRequiredComplete = missing.isEmpty();
		PublicationStatus status = project.getPublicationStatus();
		boolean submitted = status != PublicationStatus.DRAFT && status != PublicationStatus.REJECTED;
		for (int step = 1; step <= LAST_STEP; step++) {
			List<String> stepMissing = missing.getOrDefault(step, List.of());
			boolean complete = step < LAST_STEP ? stepMissing.isEmpty() : allRequiredComplete && submitted;
			if (complete) {
				completed.add(step);
			}
			steps.add(new WizardResponse.Step(step, KEYS.get(step - 1), TITLES.get(step - 1), complete, stepMissing));
		}
		return new WizardResponse(project.getId(), project.getVersion(), status, currentStep(missing), completed,
				allRequiredComplete && !submitted, steps);
	}

	/** Fields or items still missing for submission, by step (steps 1-6); empty when complete. */
	@Transactional(readOnly = true)
	public Map<Integer, List<String>> missingByStep(PropertyProject p) {
		Map<Integer, List<String>> missing = new LinkedHashMap<>();
		List<String> details = new ArrayList<>();
		addIfBlank(details, "propertyType", p.getPropertyType() == null ? null : p.getPropertyType().getValue());
		addIfBlank(details, "projectName", p.getProjectName());
		addIfBlank(details, "builderCompanyName", p.getBuilderCompanyName());
		addIfBlank(details, "projectEmail", p.getProjectEmail());
		addIfBlank(details, "projectPhone", p.getProjectPhone());
		putIfAny(missing, 1, details);

		List<String> location = new ArrayList<>();
		addIfBlank(location, "projectAddress", p.getProjectAddress());
		addIfBlank(location, "city", p.getCity());
		addIfBlank(location, "locality", p.getLocality());
		addIfBlank(location, "pincode", p.getPincode());
		addIfBlank(location, "state", p.getState());
		putIfAny(missing, 2, location);

		if (apartmentRepository.countByPropertyProjectId(p.getId()) == 0) {
			missing.put(3, List.of("apartments"));
		}
		else if (apartmentRepository.countMissingAreaRange(p.getId()) > 0) {
			missing.put(3, List.of("apartments.areaRange"));
		}

		List<String> projectInfo = new ArrayList<>();
		addIfBlank(projectInfo, "projectDescription", p.getProjectDescription());
		putIfAny(missing, 4, projectInfo);

		if (projectAmenityRepository.countByIdPropertyProjectId(p.getId()) == 0) {
			missing.put(5, List.of("amenities"));
		}
		if (mediaRepository.countByPropertyProjectIdAndMediaType(p.getId(), ProjectMediaType.PHOTO) == 0) {
			missing.put(6, List.of("photos"));
		}
		return missing;
	}

	/**
	 * Call after every change to a property or its children, in the same transaction: an owner's change
	 * to an approved or published property takes it offline (back to draft) until it is reviewed again,
	 * the resume step is recomputed and the version is incremented.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void afterChange(PropertyProject project, CurrentActor actor, boolean actsWithUpdateAny) {
		PublicationStatus status = project.getPublicationStatus();
		if (!actsWithUpdateAny && (status == PublicationStatus.APPROVED || status == PublicationStatus.PUBLISHED)) {
			project.revertToDraft();
			statusHistory.record(project.getId(), actor.userId(), StatusChangeAction.REVERTED_TO_DRAFT, status,
					PublicationStatus.DRAFT, null);
		}
		project.setWizardStep(currentStep(missingByStep(project)));
		project.touch(clock.instant());
		projectRepository.saveAndFlush(project);
	}

	private static int currentStep(Map<Integer, List<String>> missing) {
		return missing.keySet().stream().min(Integer::compare).orElse(LAST_STEP);
	}

	private static void addIfBlank(List<String> missing, String field, String value) {
		if (value == null || value.isBlank()) {
			missing.add(field);
		}
	}

	private static void putIfAny(Map<Integer, List<String>> missing, int step, List<String> fields) {
		if (!fields.isEmpty()) {
			missing.put(step, List.copyOf(fields));
		}
	}

}
