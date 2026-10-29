package com.propertypro.property_platform.builderteam.mapper;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.builderteam.dto.BuilderTeamMemberResponse;
import com.propertypro.property_platform.builderteam.dto.TeamUserResponse;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * Entity to DTO mapping for the three audiences. Users are loaded with one query per response or page,
 * never per row. Call inside the service transaction.
 * <ul>
 * <li>{@link View#ADMIN}: contact details of everyone, notes.</li>
 * <li>{@link View#BUILDER}: names; the employee's email and phone only once they have joined, so an
 * invitation never reveals more than the identifier the builder typed; notes.</li>
 * <li>{@link View#EMPLOYEE}: names only, no notes.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class BuilderTeamResponseMapper {

	public enum View {
		ADMIN, BUILDER, EMPLOYEE
	}

	private final UserAccountService userAccountService;

	public BuilderTeamMemberResponse toResponse(BuilderTeamMember member, View view) {
		return mapper(List.of(member), view).apply(member);
	}

	/** Maps a page of memberships with one user lookup for the whole page. */
	public Function<BuilderTeamMember, BuilderTeamMemberResponse> mapper(Collection<BuilderTeamMember> members,
			View view) {
		List<Long> ids = members.stream()
			.flatMap(member -> Stream.of(member.getBuilderId(), member.getEmployeeId(), member.getInvitedBy()))
			.filter(Objects::nonNull)
			.distinct()
			.toList();
		Map<Long, UserSummary> users = ids.isEmpty() ? Map.of() : userAccountService.findSummaries(ids);
		return member -> {
			boolean admin = view == View.ADMIN;
			boolean employeeContact = admin || (view == View.BUILDER && member.getJoinedAt() != null);
			return new BuilderTeamMemberResponse(member.getId(), user(users, member.getBuilderId(), admin),
					user(users, member.getEmployeeId(), employeeContact), user(users, member.getInvitedBy(), admin),
					member.getRole(), member.getPermissions(), member.getStatus(), member.getJoinedAt(),
					view == View.EMPLOYEE ? null : member.getNotes(), member.getCreatedAt(), member.getUpdatedAt());
		};
	}

	private static TeamUserResponse user(Map<Long, UserSummary> users, Long id, boolean contact) {
		UserSummary summary = users.get(id);
		if (summary == null) {
			return new TeamUserResponse(id, null, null, null);
		}
		return new TeamUserResponse(id, summary.fullName(), contact ? summary.email() : null,
				contact ? summary.phone() : null);
	}

}
