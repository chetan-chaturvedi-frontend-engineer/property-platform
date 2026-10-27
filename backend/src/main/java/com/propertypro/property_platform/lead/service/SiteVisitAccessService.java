package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.exception.SiteVisitExceptions;
import com.propertypro.property_platform.lead.repository.SiteVisitRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ACCESS_ASSIGNED;

/**
 * The single authorization point for loading existing site visits. In the app a visit is the caller's
 * own when they are its {@link Relation#BUILDER} (the property's owner), its {@link Relation#VISITOR}
 * or, with {@code SITE_VISIT_ACCESS_ASSIGNED}, its {@link Relation#ASSIGNEE}; anyone else gets 404, so
 * ids cannot be probed, and app endpoints never fall back to {@code _ANY} permissions. Admin endpoints
 * load any visit; their {@code _ANY} permission is checked by the controller and the service.
 */
@Service
@RequiredArgsConstructor
public class SiteVisitAccessService {

	/** How the caller is related to a visit; one caller may hold several relations. */
	public enum Relation {
		BUILDER, ASSIGNEE, VISITOR
	}

	/** A visit loaded for {@code actor}; {@code admin} when loaded through an admin endpoint. */
	public record Access(SiteVisit visit, Set<Relation> relations, boolean admin) {

		public boolean is(Relation relation) {
			return relations.contains(relation);
		}

		/** Sales fields are shown to everyone except a caller who is only the visitor. */
		public boolean internal() {
			return admin || is(Relation.BUILDER) || is(Relation.ASSIGNEE);
		}

	}

	private final SiteVisitRepository repository;

	/** A visit the actor is related to; the caller checks the action's permission. */
	@Transactional(readOnly = true)
	public Access requireOwn(Long id, CurrentActor actor) {
		return own(repository.findById(id).orElseThrow(SiteVisitExceptions::notFound), actor);
	}

	/** Like {@link #requireOwn}, row-locked until the transaction ends. */
	@Transactional(propagation = Propagation.MANDATORY)
	public Access lockOwn(Long id, CurrentActor actor) {
		return own(repository.findByIdForUpdate(id).orElseThrow(SiteVisitExceptions::notFound), actor);
	}

	/** Any visit, for admin endpoints. */
	@Transactional(readOnly = true)
	public Access requireAny(Long id, CurrentActor actor) {
		SiteVisit visit = repository.findById(id).orElseThrow(SiteVisitExceptions::notFound);
		return new Access(visit, relations(visit, actor), true);
	}

	/** Like {@link #requireAny}, row-locked until the transaction ends. */
	@Transactional(propagation = Propagation.MANDATORY)
	public Access lockAny(Long id, CurrentActor actor) {
		SiteVisit visit = repository.findByIdForUpdate(id).orElseThrow(SiteVisitExceptions::notFound);
		return new Access(visit, relations(visit, actor), true);
	}

	/** List restriction to the actor's own visits, optionally to one relation. */
	public Specification<SiteVisit> ownVisits(CurrentActor actor, Relation only) {
		boolean assigned = actor.has(SITE_VISIT_ACCESS_ASSIGNED);
		Long me = actor.userId();
		return (root, query, cb) -> {
			if (only != null) {
				return switch (only) {
					case BUILDER -> cb.equal(root.get("builderId"), me);
					case VISITOR -> cb.equal(root.get("userId"), me);
					case ASSIGNEE -> assigned ? cb.equal(root.get("assignId"), me) : cb.disjunction();
				};
			}
			return assigned
					? cb.or(cb.equal(root.get("builderId"), me), cb.equal(root.get("userId"), me),
							cb.equal(root.get("assignId"), me))
					: cb.or(cb.equal(root.get("builderId"), me), cb.equal(root.get("userId"), me));
		};
	}

	/** The actor's relations to {@code visit}; empty when unrelated. */
	public static Set<Relation> relations(SiteVisit visit, CurrentActor actor) {
		Set<Relation> relations = EnumSet.noneOf(Relation.class);
		Long me = actor.userId();
		if (Objects.equals(visit.getBuilderId(), me)) {
			relations.add(Relation.BUILDER);
		}
		if (Objects.equals(visit.getUserId(), me)) {
			relations.add(Relation.VISITOR);
		}
		if (Objects.equals(visit.getAssignId(), me) && actor.has(SITE_VISIT_ACCESS_ASSIGNED)) {
			relations.add(Relation.ASSIGNEE);
		}
		return relations;
	}

	private static Access own(SiteVisit visit, CurrentActor actor) {
		Set<Relation> relations = relations(visit, actor);
		if (relations.isEmpty()) {
			throw SiteVisitExceptions.notFound();
		}
		return new Access(visit, relations, false);
	}

}
