-- Top Partnerski (montażnicy) для SEO badge / outreach
-- SSOT: alumineu-data-platform · raw_companies.typ_ceny = Partnerski (Planfix)
-- Запуск: Supabase SQL editor или DAT pipeline
-- Не коммитить PII в публичные отчёты без фильтра owner

SELECT
  c.contact_id,
  c.name AS nazwa,
  c.miasto,
  c.kraj,
  c.zrodlo_leada,
  c.status_wspolpracy,
  COUNT(DISTINCT o.order_id) AS orders_l12m,
  SUM(o.wartosc_netto) AS revenue_net_pln_l12m
FROM raw_companies c
LEFT JOIN raw_orders o
  ON o.client_contact_id = c.contact_id
  AND o.order_date >= (CURRENT_DATE - INTERVAL '12 months')
WHERE c.typ_ceny = 'Partnerski'
GROUP BY c.contact_id, c.name, c.miasto, c.kraj, c.zrodlo_leada, c.status_wspolpracy
ORDER BY revenue_net_pln_l12m DESC NULLS LAST, orders_l12m DESC
LIMIT 30;

-- Сайт монтажника в CRM часто отсутствует — доп. поле при появлении в raw_companies
