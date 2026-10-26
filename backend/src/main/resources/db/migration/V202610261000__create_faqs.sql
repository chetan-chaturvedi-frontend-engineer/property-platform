-- Frequently asked questions, managed by administrators. Public only while status = 'publish' and the
-- category is still configured (rule in cms/faq/repository/PublicFaqs), ordered by sort_order, id.
-- Rollback: db/rollback/U202610261000__create_faqs.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE faqs (
    id          BIGSERIAL PRIMARY KEY,
    question    VARCHAR(500)  NOT NULL,
    answer      TEXT          NOT NULL,
    -- Key from app.faq.categories (e.g. general, billing). Format only, not a fixed list, so adding or
    -- removing a category is a configuration change; rows of a removed category stay untouched.
    category    VARCHAR(50)   NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'draft',
    -- "order" is a reserved word; equal values are allowed and id breaks ties.
    sort_order  INTEGER       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_faqs_question_not_blank CHECK (btrim(question) <> ''),
    CONSTRAINT chk_faqs_answer_not_blank CHECK (btrim(answer) <> ''),
    CONSTRAINT chk_faqs_category_format CHECK (category ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT chk_faqs_status CHECK (status IN ('draft', 'publish'))
);

-- Public list: WHERE status = 'publish' [AND category = ?] ORDER BY sort_order, id; also the admin
-- status filter (leading column).
CREATE INDEX idx_faqs_status_category_sort_order ON faqs (status, category, sort_order, id);
-- Admin list filtered by category, in display order.
CREATE INDEX idx_faqs_category_sort_order ON faqs (category, sort_order, id);

COMMENT ON COLUMN faqs.category IS 'Category key from app.faq.categories; no categories table';
COMMENT ON COLUMN faqs.status IS 'draft = hidden; publish = shown on public FAQ pages';
COMMENT ON COLUMN faqs.sort_order IS 'Ascending display order; ties ordered by id';
