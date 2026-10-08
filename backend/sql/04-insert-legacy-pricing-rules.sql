-- Select your SYSCON database in the SQL client before running this script.
-- Recovered from the original backend seeder; prices are USD.
-- Original dates are preserved. These base tariffs are valid only May 5-8, 2026.
-- The old R1 TEMS-only author rate (USD 350) is intentionally excluded.

SELECT id, name, year FROM event_editions ORDER BY id;

-- Automatically choose the SYSCON edition. Replace with SET @event_edition_id = <actual ID>
-- if your edition has another name. No rows are inserted if no matching edition exists.
SET @event_edition_id = (
  SELECT id FROM event_editions
  WHERE name = 'IEEE SYSCON LATAM 2026' AND year = 2026
  ORDER BY id DESC LIMIT 1
);

INSERT INTO pricing_rules (
  event_edition_id, name, participation_type, member_type, is_ieee_member,
  base_amount, starts_at, ends_at, is_active, created_at, updated_at
)
SELECT @event_edition_id, source.name, source.participation_type, source.member_type,
  source.is_ieee_member, source.base_amount, source.starts_at, source.ends_at,
  1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM (
  SELECT 'R2 – IEEE Member Author' AS name, 'author' AS participation_type,
    'professional' AS member_type, 1 AS is_ieee_member, 400.00 AS base_amount,
    '2026-05-05' AS starts_at, '2026-05-08' AS ends_at
  UNION ALL
  SELECT 'R3 – Non-IEEE Member Author', 'author', 'professional', 0, 450.00, '2026-05-05', '2026-05-08'
  UNION ALL
  SELECT 'R4 – IEEE Member Attendee', 'attendee', 'professional', 1, 200.00, '2026-05-05', '2026-05-08'
  UNION ALL
  SELECT 'R5 – Student Attendee (Non-IEEE)', 'attendee', 'student', 0, 200.00, '2026-05-05', '2026-05-08'
  UNION ALL
  SELECT 'R6 – Attendee (Non-IEEE Member)', 'attendee', 'professional', 0, 250.00, '2026-05-05', '2026-05-08'
  UNION ALL
  SELECT 'Additional Paper', 'author', NULL, 0, 150.00, '2026-01-01', '2026-12-31'
  UNION ALL
  SELECT 'Additional Page', 'author', NULL, 0, 80.00, '2026-01-01', '2026-12-31'
) AS source
WHERE @event_edition_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pricing_rules AS existing
    WHERE existing.event_edition_id = @event_edition_id AND existing.name = source.name
  );

SELECT id, event_edition_id, name, participation_type, member_type, is_ieee_member,
  base_amount, starts_at, ends_at, is_active
FROM pricing_rules WHERE event_edition_id = @event_edition_id ORDER BY id;
