-- `body` collided with requestValidator's wrap-the-request convention, which
-- treats a schema carrying a top-level `body` key as {body, query, params}.
ALTER TABLE "announcements" RENAME COLUMN "body" TO "content";
