package com.propertypro.property_platform.conversation.repository;

import com.propertypro.property_platform.conversation.domain.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

	/** The newest messages first; callers reverse them for display. */
	List<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

	/** Older than a known message, newest first. */
	List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long before, Pageable pageable);

	/** Newer than a known message, oldest first: what polling asks for. */
	List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long after, Pageable pageable);

	/** The latest message of each given conversation. */
	@Query("""
			select m from Message m where m.id in (
				select max(m2.id) from Message m2 where m2.conversationId in :conversationIds
				group by m2.conversationId)""")
	List<Message> findLatestOf(Collection<Long> conversationIds);

	/**
	 * Unread messages per conversation for a participant: sent by the other side and newer than what this side read.
	 * Rows are {@code [conversationId, count]}.
	 */
	@Query("""
			select m.conversationId, count(m) from Message m, Conversation c
			where m.conversationId = c.id and m.conversationId in :conversationIds and m.senderId <> :userId
			  and m.id > case when c.buyerId = :userId then c.buyerLastReadMessageId else c.sellerLastReadMessageId end
			group by m.conversationId""")
	List<Object[]> countUnreadByConversation(Long userId, Collection<Long> conversationIds);

	/** All unread messages of a participant across their conversations, for the tab badge. */
	@Query("""
			select count(m) from Message m, Conversation c
			where m.conversationId = c.id and (c.buyerId = :userId or c.sellerId = :userId) and m.senderId <> :userId
			  and m.id > case when c.buyerId = :userId then c.buyerLastReadMessageId else c.sellerLastReadMessageId end""")
	long countUnread(Long userId);

	@Query("select coalesce(max(m.id), 0) from Message m where m.conversationId = :conversationId")
	long maxIdOf(Long conversationId);

}
