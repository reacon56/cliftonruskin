
-- Insert 9 new jurisdictions
INSERT INTO jurisdiction (id, country_code, country_name, updated_at) VALUES
  ('a0000000-0000-0000-0000-00000000000b', 'SA', 'Saudi Arabia', now()),
  ('a0000000-0000-0000-0000-00000000000c', 'VG', 'British Virgin Islands', now()),
  ('a0000000-0000-0000-0000-00000000000d', 'PA', 'Panama', now()),
  ('a0000000-0000-0000-0000-00000000000e', 'LU', 'Luxembourg', now()),
  ('a0000000-0000-0000-0000-00000000000f', 'DE', 'Germany', now()),
  ('a0000000-0000-0000-0000-000000000010', 'BR', 'Brazil', now()),
  ('a0000000-0000-0000-0000-000000000011', 'SE', 'Sweden', now()),
  ('a0000000-0000-0000-0000-000000000012', 'IN', 'India', now()),
  ('a0000000-0000-0000-0000-000000000013', 'ZA', 'South Africa', now())
ON CONFLICT (id) DO NOTHING;

-- Saudi Arabia indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000b', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member. Mutual evaluation ongoing."}', '2025-10-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/Saudi-Arabia.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000b', 'CPI_SCORE', '{"score":52,"rank":52}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- BVI indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000c', 'FATF_STATUS', '{"status":"MONITORING","note":"CARICOM FATF member. BOSS system operational but law enforcement only. Peer review 2024 noted gaps."}', '2024-06-01', 'FATF/CFATF', 'https://www.cfatf-gafic.org', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000c', 'CPI_SCORE', '{"score":38,"rank":null,"note":"Not independently scored — estimated based on UK OT governance metrics"}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- Panama indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000d', 'FATF_STATUS', '{"status":"REMOVED","note":"Removed from FATF grey list October 2023. Monitor for residual legacy risk."}', '2023-10-27', 'FATF', 'https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000d', 'CPI_SCORE', '{"score":35,"rank":105}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- Luxembourg indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000e', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member. Strong compliance framework."}', '2025-01-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/Luxembourg.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000e', 'CPI_SCORE', '{"score":78,"rank":11}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- Germany indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000f', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member. Strong enforcement record (Wirecard, Deutsche Bank)."}', '2025-01-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/Germany.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-00000000000f', 'CPI_SCORE', '{"score":78,"rank":9}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- Brazil indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member via GAFILAT. Significant enforcement capacity demonstrated by Lava Jato."}', '2025-01-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/Brazil.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000010', 'CPI_SCORE', '{"score":36,"rank":104}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- Sweden indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member. Global leader in corporate transparency and rule of law."}', '2025-01-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/Sweden.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'CPI_SCORE', '{"score":82,"rank":6}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- India indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'FATF_STATUS', '{"status":"COMPLIANT","note":"FATF member. Non-alignment on Russia sanctions creates compliance complexity."}', '2025-01-01', 'FATF', 'https://www.fatf-gafi.org/en/countries/detail/India.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'CPI_SCORE', '{"score":39,"rank":93}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());

-- South Africa indicators
INSERT INTO jurisdiction_indicator (id, jurisdiction_id, indicator_type, value_json, effective_date, source_name, source_url, retrieved_at) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000013', 'FATF_STATUS', '{"status":"MONITORING","note":"FATF grey-listed February 2023. Significant reform underway driven by grey-listing."}', '2023-02-24', 'FATF', 'https://www.fatf-gafi.org/en/publications/High-risk-and-other-monitored-jurisdictions.html', now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000013', 'CPI_SCORE', '{"score":41,"rank":83}', '2025-01-01', 'Transparency International', 'https://www.transparency.org/cpi2024', now());
