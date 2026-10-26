package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;

/**
 * The single authorization point for existing properties and their children. A property is visible
 * to its owner and to holders of {@code PROPERTY_VIEW_ANY}; anyone else gets 404, so ids cannot be
 * probed. A visible property without the permission for the action gets 403. Child records are only
 * ever loaded through their parent property.
 */
@Service
@RequiredArgsConstructor
public class PropertyAccessService {

	/** Statuses in which an owner (without {@code PROPERTY_UPDATE_ANY}) cannot change the property. */
	private static final Set<PublicationStatus> LOCKED_FOR_OWNER = EnumSet.of(PublicationStatus.PENDING_REVIEW,
			PublicationStatus.SUSPENDED, PublicationStatus.ARCHIVED);

	private final PropertyProjectRepository projectRepository;
	private final PropertyApartmentRepository apartmentRepository;

	/** The property, if the actor may view it. */
	@Transactional(readOnly = true)
	public PropertyProject requireViewable(Long propertyId, CurrentActor actor) {
		PropertyProject project = projectRepository.findById(propertyId).orElseThrow(PropertyExceptions::notFound);
		requirePermission(project, actor, PROPERTY_VIEW, PROPERTY_VIEW_ANY);
		return project;
	}

	/**
	 * The property, row-locked until the transaction ends, if the actor may edit it in its current
	 * status and {@code expectedVersion} (from If-Match, optional) is still current.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public PropertyProject requireEditable(Long propertyId, CurrentActor actor, Long expectedVersion) {
		PropertyProject project = lockVisible(propertyId, actor);
		requirePermission(project, actor, PROPERTY_UPDATE, PROPERTY_UPDATE_ANY);
		requireVersion(project, expectedVersion);
		PublicationStatus status = project.getPublicationStatus();
		if (status == PublicationStatus.ARCHIVED || (!actsWithUpdateAny(actor) && LOCKED_FOR_OWNER.contains(status))) {
			throw PropertyExceptions.notEditable(status);
		}
		return project;
	}

	/** The property, row-locked, if visible to the actor; the caller checks the action's own permission. */
	@Transactional(propagation = Propagation.MANDATORY)
	public PropertyProject lockVisible(Long propertyId, CurrentActor actor) {
		PropertyProject project = projectRepository.findByIdForUpdate(propertyId)
			.orElseThrow(PropertyExceptions::notFound);
		if (!isVisible(project, actor)) {
			throw PropertyExceptions.notFound();
		}
		return project;
	}

	@Transactional(propagation = Propagation.MANDATORY)
	public PropertyProject requireDeletable(Long propertyId, CurrentActor actor, Long expectedVersion) {
		PropertyProject project = lockVisible(propertyId, actor);
		requirePermission(project, actor, PROPERTY_DELETE, PROPERTY_DELETE_ANY);
		requireVersion(project, expectedVersion);
		return project;
	}

	/** An apartment configuration of {@code project}; ids of other properties' apartments are not found. */
	public PropertyApartment requireApartment(PropertyProject project, Long apartmentId) {
		return apartmentRepository.findByIdAndPropertyProjectId(apartmentId, project.getId())
			.orElseThrow(PropertyExceptions::apartmentNotFound);
	}

	/** Owner-level permission on the actor's own property, or the {@code _ANY} permission on any property. */
	public boolean isAllowed(PropertyProject project, CurrentActor actor, String ownPermission, String anyPermission) {
		return actor.has(anyPermission) || (project.isOwnedBy(actor.userId()) && actor.has(ownPermission));
	}

	/** Edits by holders of {@code PROPERTY_UPDATE_ANY} never change the publication status. */
	public boolean actsWithUpdateAny(CurrentActor actor) {
		return actor.has(PROPERTY_UPDATE_ANY);
	}

	private void requirePermission(PropertyProject project, CurrentActor actor, String own, String any) {
		if (!isVisible(project, actor)) {
			throw PropertyExceptions.notFound();
		}
		if (!isAllowed(project, actor, own, any)) {
			throw PropertyExceptions.actionForbidden();
		}
	}

	private static boolean isVisible(PropertyProject project, CurrentActor actor) {
		return project.isOwnedBy(actor.userId()) || actor.has(PROPERTY_VIEW_ANY);
	}

	private static void requireVersion(PropertyProject project, Long expectedVersion) {
		if (expectedVersion != null && expectedVersion != project.getVersion()) {
			throw PropertyExceptions.versionConflict(project.getVersion());
		}
	}

}
