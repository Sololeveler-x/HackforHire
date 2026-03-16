-- Add multi-product support columns to inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS products_json jsonb DEFAULT '[]';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS raw_message text;
