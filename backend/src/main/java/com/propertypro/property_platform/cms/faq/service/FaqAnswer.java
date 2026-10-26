package com.propertypro.property_platform.cms.faq.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * FAQ answers are short rich text (HTML) from the admin editor, sanitized with an allow-list before
 * they are stored, so the API only ever serves safe HTML: no scripts, event handlers, styles, images,
 * iframes or {@code javascript:}/{@code data:} URLs. Questions are plain text and must be rendered as text.
 */
final class FaqAnswer {

	/**
	 * Inline formatting, paragraphs, line breaks, lists, quotes, code and links (http, https, mailto;
	 * always rel="nofollow noopener noreferrer"). Relative URLs are removed.
	 */
	private static final Safelist SAFELIST = Safelist.basic()
		.removeProtocols("a", "href", "ftp")
		.addEnforcedAttribute("a", "rel", "nofollow noopener noreferrer");
	private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

	private FaqAnswer() {
	}

	/** Sanitized HTML; 400 for {@code field} when no visible text is left. */
	static String sanitize(String html, String field) {
		String clean = Jsoup.clean(html.strip(), "", SAFELIST, OUTPUT);
		if (Jsoup.parseBodyFragment(clean).body().text().isBlank()) {
			throw new FieldValidationException(field, "must contain text");
		}
		return clean;
	}

}
