
ALTER TABLE jurisdiction ADD COLUMN IF NOT EXISTS profile_sections jsonb DEFAULT '[]'::jsonb;

-- Saudi Arabia
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Companies Law 2022, Ministry of Commerce registration. SAGIA (Saudi Arabia General Investment Authority) oversight for foreign entities."},
  {"title":"Beneficial Ownership Transparency","content":"Medium-Low. UBO register established under Vision 2030 AML reforms but enforcement inconsistent. Nominee arrangements remain common.","rating":"medium-low"},
  {"title":"Public Registry Depth","content":"Limited. Ministry of Commerce portal provides basic registration data. Financial accounts not publicly available.","rating":"limited"},
  {"title":"Enforcement Environment","content":"SAMA (Saudi Central Bank) oversees financial institutions. Public Prosecution handles financial crime. Enforcement active but opaque; limited public disclosure of outcomes."},
  {"title":"Sanctions Exposure","content":"Not subject to OFAC/UK/EU primary sanctions. Key transit jurisdiction for Russia/Iran sanctions circumvention monitoring. FATF member, mutual evaluation ongoing."},
  {"title":"Source Availability","content":"Arabic-language dominant. English sources limited to official government portals and international media. Local source network essential.","rating":"limited"}
]'::jsonb WHERE country_code = 'SA';

-- BVI
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"BVI Business Companies Act 2004 (amended 2022). Registered agent requirement. Over 400,000 active companies registered."},
  {"title":"Beneficial Ownership Transparency","content":"Low — improving. Beneficial Ownership Secure Search System (BOSS) operational but accessible only to law enforcement, not public. Economic Substance Act 2018 applies to relevant activities. FATF peer review 2024 noted continued gaps.","rating":"low"},
  {"title":"Public Registry Depth","content":"Very limited public access. Basic company name and status only via Financial Services Commission. No public director or shareholder data.","rating":"very-limited"},
  {"title":"Enforcement Environment","content":"BVI Financial Investigation Agency (FIA). Responsive to international MLA requests. CARICOM FATF member. Reputation sensitive to perceived non-cooperation."},
  {"title":"Sanctions Exposure","content":"Not directly sanctioned. Significant use as holding vehicle for sanctioned individuals'' assets. Monitor for Russia/Ukraine context specifically."},
  {"title":"Source Availability","content":"Very limited. Registered agent searches, BOSS requests via legal channel, leaked databases (Panama Papers, Pandora Papers) remain primary investigative sources.","rating":"very-limited"}
]'::jsonb WHERE country_code = 'VG';

-- Panama
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Law 32 of 1927 (as amended). Bearer shares abolished 2015. Public Registry of Panama accessible online."},
  {"title":"Beneficial Ownership Transparency","content":"Low-Medium. Post-Panama Papers reforms (2016) introduced UBO registry under Law 52 of 2016, administered by registered agents. Not publicly accessible. FATF grey-listed 2019-2023; removed October 2023.","rating":"low-medium"},
  {"title":"Public Registry Depth","content":"Good by regional standards. Public Registry (registro-publico.gob.pa) shows company officers and registered agent. Financial accounts not public.","rating":"good"},
  {"title":"Enforcement Environment","content":"Superintendency of Banks, Superintendency of Securities, Financial Analysis Unit (UAF). Enforcement improving post-FATF grey-listing. Corruption risk remains elevated."},
  {"title":"Sanctions Exposure","content":"FATF grey-list removed 2023. Monitor for residual risk from legacy structures. US Narcotics Kingpin designations active for some Panama-connected entities."},
  {"title":"Source Availability","content":"Spanish-language. Public Registry accessible in English. ICIJ Offshore Leaks database useful for historical research.","rating":"moderate"}
]'::jsonb WHERE country_code = 'PA';

-- Luxembourg
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Commercial Companies Law 1915 (as amended). Registre de Commerce et des Sociétés (RCS) mandatory. SOPARFI holding structures common."},
  {"title":"Beneficial Ownership Transparency","content":"High. Luxembourg Business Registers (LBR) maintains public UBO register per EU 4th/5th AMLD. RCS online and searchable.","rating":"high"},
  {"title":"Public Registry Depth","content":"Very Good. RCS provides directors, shareholders, annual accounts. LBR UBO register publicly accessible (post-CJEU ruling, professional access maintained).","rating":"very-good"},
  {"title":"Enforcement Environment","content":"Commission de Surveillance du Secteur Financier (CSSF) — highly active regulator. AML Unit within CSSF. Luxembourg known for rigorous financial sector supervision."},
  {"title":"Sanctions Exposure","content":"EU and UN sanctions fully implemented. No independent sanctions concerns. Strong compliance culture in financial sector."},
  {"title":"Source Availability","content":"Excellent. Multilingual (FR/DE/EN). RCS online, CSSF public enforcement database, Luxembourg Stock Exchange filings for listed vehicles.","rating":"excellent"}
]'::jsonb WHERE country_code = 'LU';

-- Germany
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"GmbH (Gesellschaft mit beschränkter Haftung) or AG (Aktiengesellschaft) via local Handelsregister. Federal structure — 16 state registers federated via handelsregister.de."},
  {"title":"Beneficial Ownership Transparency","content":"High. Transparency Register (Transparenzregister) established 2017, now primary UBO register under GwG (Money Laundering Act). Publicly accessible for legitimate interest.","rating":"high"},
  {"title":"Public Registry Depth","content":"Very Good. Handelsregister provides articles, directors, shareholders. Annual accounts filed at Bundesanzeiger. Comprehensive and reliable.","rating":"very-good"},
  {"title":"Enforcement Environment","content":"BaFin (Federal Financial Supervisory Authority) — one of Europe''s most active and rigorous regulators. Money laundering prosecutions via public prosecutors. Notable enforcement actions (Wirecard, Deutsche Bank) demonstrate genuine enforcement will."},
  {"title":"Sanctions Exposure","content":"EU and UN sanctions fully implemented and actively enforced. AWG (Foreign Trade Act) provides criminal sanctions for violations."},
  {"title":"Source Availability","content":"Excellent. Handelsregister, Bundesanzeiger, BaFin enforcement database all public. Strong English-language business press. Good source depth.","rating":"excellent"}
]'::jsonb WHERE country_code = 'DE';

-- Brazil
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Federal registration via CNPJ (Cadastro Nacional da Pessoa Jurídica) at Receita Federal. State-level registration (JUCEB etc.) for commercial activity."},
  {"title":"Beneficial Ownership Transparency","content":"Medium. Law 14.478/2022 introduced UBO requirements. Cadastro de Beneficiários Finais at Receita Federal — not fully public. CVM (securities regulator) disclosure for listed entities.","rating":"medium"},
  {"title":"Public Registry Depth","content":"Good for basic data. CNPJ lookup free online — provides registration status, activities, address. Financial accounts limited public access except for listed companies.","rating":"good"},
  {"title":"Enforcement Environment","content":"COAF (Financial Intelligence Unit), Receita Federal, Federal Police, MPF (Federal Prosecution). Significant enforcement capacity demonstrated by Lava Jato (Car Wash) operation. Political interference risk noted."},
  {"title":"Sanctions Exposure","content":"Not subject to primary OFAC/UK/EU sanctions. Monitor for US FCPA and UK Bribery Act exposure given history of corporate corruption cases."},
  {"title":"Source Availability","content":"Portuguese-language dominant. CNPJ, CVM EDGAR equivalent, Federal Prosecution public indictment database. English sources limited to international media.","rating":"moderate"}
]'::jsonb WHERE country_code = 'BR';

-- Sweden
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Bolagsverket (Swedish Companies Registration Office) — efficient digital registration. AB (Aktiebolag) most common corporate form."},
  {"title":"Beneficial Ownership Transparency","content":"Very High. Verklig Huvudman (beneficial owner) register at Bolagsverket — publicly accessible. Sweden is a global leader in corporate transparency.","rating":"very-high"},
  {"title":"Public Registry Depth","content":"Excellent. Bolagsverket provides full registration details, directors, annual accounts. Skattemyndigheten (tax authority) data cross-referenceable. All public and searchable.","rating":"excellent"},
  {"title":"Enforcement Environment","content":"Finansinspektionen (FI) — active and credible financial regulator. Swedish Prosecution Authority (Åklagarmyndigheten) handles financial crime. Nordic countries consistently rank highest globally for rule of law and low corruption."},
  {"title":"Sanctions Exposure","content":"EU and UN sanctions fully implemented. Additional Nordic cooperation on sanctions enforcement. No independent risk concerns."},
  {"title":"Source Availability","content":"Excellent. Bolagsverket online, Finansinspektionen enforcement register, Allabolag.se for company searches. Strong English-language availability.","rating":"excellent"}
]'::jsonb WHERE country_code = 'SE';

-- India
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Companies Act 2013. Ministry of Corporate Affairs (MCA) registration — CIN (Corporate Identification Number) issued. MCA21 portal for filings."},
  {"title":"Beneficial Ownership Transparency","content":"Medium. Significant Beneficial Owner (SBO) rules under Companies Act 2013 (Section 90). MCA21 Register of SBO — not publicly searchable in full. Form BEN-2 filings accessible with restrictions.","rating":"medium"},
  {"title":"Public Registry Depth","content":"Good. MCA21 provides basic registration, directors, annual returns. Financials filed but access variable. ROC (Registrar of Companies) at state level.","rating":"good"},
  {"title":"Enforcement Environment","content":"Enforcement Directorate (ED) — PMLA (Prevention of Money Laundering Act) enforcement. CBI (Central Bureau of Investigation). SEBI for listed entities. Enforcement active but inconsistent; political dimension to major cases."},
  {"title":"Sanctions Exposure","content":"Not subject to primary OFAC/UK/EU sanctions. Monitor: India''s non-alignment on Russia sanctions creates compliance complexity for entities with Indian counterparties involved in Russia trade."},
  {"title":"Source Availability","content":"Good English-language availability. MCA21 portal, BSE/NSE filings for listed entities, ED press releases, Indian financial press (Mint, Economic Times, Business Standard).","rating":"good"}
]'::jsonb WHERE country_code = 'IN';

-- South Africa
UPDATE jurisdiction SET profile_sections = '[
  {"title":"Incorporation Regime","content":"Companies and Intellectual Property Commission (CIPC). Companies Act 71 of 2008. CIPC online registration and search available."},
  {"title":"Beneficial Ownership Transparency","content":"Medium. General Laws (Anti-Money Laundering and Combating Terrorism Financing) Amendment Act 2022 introduced UBO requirements. CIPC beneficial interest register — partial public access. FATF grey-listed February 2023.","rating":"medium"},
  {"title":"Public Registry Depth","content":"Good. CIPC eServices provides director and shareholder data. Annual financial statements filed. Access improving.","rating":"good"},
  {"title":"Enforcement Environment","content":"Financial Intelligence Centre (FIC), Hawks (Directorate for Priority Crime Investigation), NPA (National Prosecuting Authority). Enforcement capacity affected by state capture legacy. FATF grey-listing driving significant reform."},
  {"title":"Sanctions Exposure","content":"FATF grey-listed 2023 — significant for DD risk scoring. UN sanctions implemented. Not subject to OFAC/UK/EU primary sanctions but monitor for Russia-linked financial flows given historic BRICS alignment."},
  {"title":"Source Availability","content":"Good English-language availability. CIPC portal, SARB regulatory notices, FIC publications, South African financial press (Business Day, Daily Maverick).","rating":"good"}
]'::jsonb WHERE country_code = 'ZA';
