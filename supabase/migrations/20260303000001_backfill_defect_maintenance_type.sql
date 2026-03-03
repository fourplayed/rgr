UPDATE maintenance_records
SET maintenance_type = 'defect_report'
WHERE title LIKE 'Defect reported -%'
  AND maintenance_type IS NULL;
