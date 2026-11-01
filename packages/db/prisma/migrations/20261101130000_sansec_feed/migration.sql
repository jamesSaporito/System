-- Sansec's research feed (e-commerce and Magento attacks), seeded alongside the news feeds.
INSERT INTO "security_news_feeds" ("id", "url") VALUES (uuidv7()::text, 'https://sansec.io/atom.xml')
ON CONFLICT ("url") DO NOTHING;
