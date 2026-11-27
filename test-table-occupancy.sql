-- Prueba del query de ocupación de mesas
-- Este query cuenta AMBOS tipos de asignaciones:
-- 1. Asignaciones individuales (guest_table_assignments)
-- 2. Asignaciones de grupo (guest_groups.table_id)

SELECT 
  t.id,
  t.name,
  t.capacity,
  COUNT(DISTINCT CASE 
    WHEN gta.guest_id IS NOT NULL THEN gta.guest_id
    WHEN gg.table_id = t.id THEN g.id
    ELSE NULL
  END) as current_occupancy,
  -- Desglose para debug
  COUNT(DISTINCT gta.guest_id) as individual_assignments,
  COUNT(DISTINCT CASE WHEN gg.table_id = t.id THEN g.id END) as group_assignments
FROM tables t
LEFT JOIN guest_table_assignments gta ON gta.table_id = t.id
LEFT JOIN guest_groups gg ON gg.table_id = t.id
LEFT JOIN guests g ON g.group_id = gg.id
WHERE gta.guest_id IS NOT NULL OR g.id IS NOT NULL OR (gta.guest_id IS NULL AND g.id IS NULL)
GROUP BY t.id
ORDER BY t.name;

-- Verificación: Listar todas las asignaciones
SELECT 
  'Individual' as tipo,
  g.name as invitado,
  t.name as mesa
FROM guest_table_assignments gta
JOIN guests g ON g.id = gta.guest_id
JOIN tables t ON t.id = gta.table_id

UNION ALL

SELECT 
  'Grupo' as tipo,
  g.name as invitado,
  t.name as mesa
FROM guests g
JOIN guest_groups gg ON gg.id = g.group_id
JOIN tables t ON t.id = gg.table_id
WHERE g.id NOT IN (SELECT guest_id FROM guest_table_assignments)

ORDER BY mesa, tipo, invitado;
