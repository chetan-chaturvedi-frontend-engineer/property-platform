package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogContentTests {

	@Test
	void keepsFormattingUnchanged() {
		String html = "<h2>Eligibility</h2><p>Check your <strong>CIBIL</strong> score.</p>"
				+ "<ul><li>Salaried</li><li>Self-employed</li></ul><blockquote>Tip</blockquote>"
				+ "<table><tbody><tr><td>EMI</td></tr></tbody></table><pre><code>a &lt; b</code></pre>";
		assertThat(BlogContent.sanitize(html, "content")).isEqualTo(html);
	}

	@Test
	void removesScriptsEventHandlersStylesAndEmbeds() {
		String clean = BlogContent.sanitize("""
				<p onclick="steal()" style="position:fixed">Hello<script>alert(1)</script></p>\
				<img src=x onerror=alert(1)><iframe src="https://evil.example"></iframe>\
				<svg onload=alert(1)><circle/></svg><form action="/x"><input name="p"></form>\
				<object data="x.swf"></object><style>body{display:none}</style>""", "content");

		assertThat(clean).isEqualTo("<p>Hello</p><img>");
	}

	@ParameterizedTest
	@ValueSource(strings = { "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html;base64,PHNjcmlwdD4=",
			"vbscript:msgbox(1)", "ftp://example.com/x", "/relative/path", "//evil.example" })
	void removesUnsafeOrRelativeLinks(String href) {
		assertThat(BlogContent.sanitize("<a href=\"" + href + "\">x</a>", "content")).isEqualTo("<a rel=\"nofollow noopener noreferrer\">x</a>");
	}

	@Test
	void keepsSafeLinksWithEnforcedRel() {
		assertThat(BlogContent.sanitize("<a href=\"https://example.com/a?b=1\" target=\"_blank\" rel=\"opener\">x</a>", "c"))
			.isEqualTo("<a href=\"https://example.com/a?b=1\" rel=\"nofollow noopener noreferrer\">x</a>");
		assertThat(BlogContent.sanitize("<a href=\"mailto:hi@example.com\">mail</a>", "c"))
			.contains("href=\"mailto:hi@example.com\"");
	}

	@Test
	void keepsOnlyHttpsImages() {
		assertThat(BlogContent.sanitize("<img src=\"https://cdn.example.com/a.png\" alt=\"Plan\">", "c"))
			.isEqualTo("<img src=\"https://cdn.example.com/a.png\" alt=\"Plan\">");
		assertThat(BlogContent.sanitize("<p>x</p><img src=\"http://cdn.example.com/a.png\">", "c"))
			.isEqualTo("<p>x</p><img>");
	}

	@ParameterizedTest
	@ValueSource(strings = { "<script>alert(1)</script>", "<p>   </p>", "<iframe src=\"https://x\"></iframe>",
			"<style>p{}</style>" })
	void rejectsContentWithNothingVisibleLeft(String html) {
		assertThatThrownBy(() -> BlogContent.sanitize(html, "content"))
			.isInstanceOf(FieldValidationException.class)
			.extracting("field").isEqualTo("content");
	}

	@Test
	void plainTextIsEscapedNotInterpreted() {
		assertThat(BlogContent.sanitize("5 < 6 & \"quotes\"", "c")).isEqualTo("5 &lt; 6 &amp; \"quotes\"");
	}

}
