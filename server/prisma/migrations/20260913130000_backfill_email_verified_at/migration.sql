-- Accounts that existed before email verification was introduced are treated as
-- verified, so the new login gate cannot lock out current users.
UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
