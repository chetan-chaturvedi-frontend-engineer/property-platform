package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

/**
 * Blog bodies are rich text (HTML) from the admin editor. They are sanitized with an allow-list before
 * they are stored, so the API only ever serves safe HTML: no scripts, event handlers, styles, iframes,
 * forms or {@code javascript:}/{@code data:} URLs. Apps should still render it as HTML only through
 * their usual safe HTML view.
 */
final class BlogContent {

	/**
	 * Formatting, headings, lists, quotes, code, tables, links (http, https, mailto; always
	 * rel="nofollow noopener noreferrer") and https images. Relative URLs are removed.
	 */
	private static final Safelist SAFELIST = Safelist.relaxed()
		.removeProtocols("a", "href", "ftp")
		.removeProtocols("img", "src", "http")
		.addEnforcedAttribute("a", "rel", "nofollow noopener noreferrer");
	private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

	private BlogContent() {
	}

	/** Sanitized HTML; 400 for {@code field} when nothing visible (text or image) is left. */
	static String sanitize(String html, String field) {
		String clean = Jsoup.clean(html, "", SAFELIST, OUTPUT);
		Element body = Jsoup.parseBodyFragment(clean).body();
		if (body.text().isBlank() && body.select("img").isEmpty()) {
			throw new FieldValidationException(field, "must contain text or an image");
		}
		return clean;
	}

}
