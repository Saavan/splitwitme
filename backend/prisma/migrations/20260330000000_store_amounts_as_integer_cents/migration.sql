-- Store monetary amounts as integer cents to avoid floating-point errors.
-- Existing Decimal(10,2) values are multiplied by 100 and stored as INTEGER.

ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount" * 100)::INTEGER;
ALTER TABLE "TransactionSplit" ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount" * 100)::INTEGER;
