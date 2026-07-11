DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM (
    SELECT a.id, COUNT(ac."classId") AS class_count
    FROM "Assignment" a
    LEFT JOIN "AssignmentClass" ac ON ac."assignmentId" = a.id
    GROUP BY a.id
    HAVING COUNT(ac."classId") <> 1
  ) invalid_assignments;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate AssignmentClass to Assignment.classId: % assignment(s) have zero or multiple classes. Resolve explicitly before deploying this migration.', invalid_count;
  END IF;
END $$;

ALTER TABLE "Assignment" ADD COLUMN "classId" UUID;

UPDATE "Assignment" a
SET "classId" = ac."classId"
FROM "AssignmentClass" ac
WHERE ac."assignmentId" = a.id;

ALTER TABLE "Assignment" ALTER COLUMN "classId" SET NOT NULL;

CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "AssignmentClass";
