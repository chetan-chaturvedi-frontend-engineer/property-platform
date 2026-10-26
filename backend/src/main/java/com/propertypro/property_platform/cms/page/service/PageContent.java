package com.propertypro.property_platform.cms.page.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

/**
 * Page bodies are rich text (HTML) from the admin editor, sanitized with the same allow-list as blog
 * content before they are stored, so the API only ever serves safe HTML: no scripts, event handlers,
 * styles, iframes, forms or {@code javascript:}/{@code data:} URLs. Headings and SEO fields are plain
 * text and must be rendered as text.
 */
final class PageContent {

	/**
	 * Formatting, headings, lists, quotes, code, tables, links (http, https, mailto; always
	 * rel="nofollow noopener noreferrer") and https images. Relative URLs are removed.
	 */
	private static final Safelist SAFELIST = Safelist.relaxed()
		.removeProtocols("a", "href", "ftp")
		.removeProtocols("img", "src", "http")
		.addEnforcedAttribute("a", "rel", "nofollow noopener noreferrer");
	private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

	private PageContent() {
	}

	/** Sanitized HTML; 400 for {@code field} when nothing visible (text or image) is left. */
	static String sanitize(String html, String field) {
		String clean = Jsoup.clean(html.strip(), "", SAFELIST, OUTPUT);
		Element body = Jsoup.parseBodyFragment(clean).body();
		if (body.text().isBlank() && body.select("img").isEmpty()) {
			throw new FieldValidationException(field, "must contain text or an image");
		}
		return clean;
	}

}
