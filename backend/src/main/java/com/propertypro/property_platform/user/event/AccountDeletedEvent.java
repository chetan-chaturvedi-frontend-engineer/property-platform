package com.propertypro.property_platform.user.event;

/**
 * Published inside the transaction that deletes an account, so listeners that clean up the account's data (for
 * example archiving its properties) succeed or fail together with the deletion.
 */
public record AccountDeletedEvent(Long userId) {
}
