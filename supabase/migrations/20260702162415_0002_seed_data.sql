/*
# Seed initial data and storage buckets

1. Storage buckets
- kyc-docs: private bucket for KYC/KYB documents (register extract, tax cert). Only owner + admin.
- ad-media: public-read bucket for ad photos/media.
- ad-docs: private bucket for ad warehouse certificates and optional docs.
- deal-docs: private bucket for generated contracts and signed files.

2. Seed data
- prices: ~30 days of daily prices for 6 commodities across EXW/CPT/FOB bases.
- news: 6 sample agri news/analytics articles with tags.
- contract_templates: 3 default templates (sales, contracting, forward) with variable placeholders.

3. Notes
- Buckets created via storage schema inserts (idempotent).
- Price seed uses generate_series for realistic historical series.
*/

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('kyc-docs', 'kyc-docs', false),
  ('ad-media', 'ad-media', true),
  ('ad-docs', 'ad-docs', false),
  ('deal-docs', 'deal-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owners can manage their own folder; public read for ad-media
DROP POLICY IF EXISTS "kyc_owner_write" ON storage.objects;
CREATE POLICY "kyc_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kyc_owner_read" ON storage.objects;
CREATE POLICY "kyc_owner_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')));

DROP POLICY IF EXISTS "ad_media_public_read" ON storage.objects;
CREATE POLICY "ad_media_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'ad-media');

DROP POLICY IF EXISTS "ad_media_owner_write" ON storage.objects;
CREATE POLICY "ad_media_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "ad_media_owner_delete" ON storage.objects;
CREATE POLICY "ad_media_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "ad_docs_owner_write" ON storage.objects;
CREATE POLICY "ad_docs_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "ad_docs_owner_read" ON storage.objects;
CREATE POLICY "ad_docs_owner_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ad-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')));

DROP POLICY IF EXISTS "ad_docs_owner_delete" ON storage.objects;
CREATE POLICY "ad_docs_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "deal_docs_parties" ON storage.objects;
CREATE POLICY "deal_docs_parties" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'deal-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "deal_docs_parties_read" ON storage.objects;
CREATE POLICY "deal_docs_parties_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'deal-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.deals d WHERE d.buyer_id = auth.uid() OR d.seller_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')));

DROP POLICY IF EXISTS "deal_docs_parties_delete" ON storage.objects;
CREATE POLICY "deal_docs_parties_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'deal-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Seed prices: 30 days for 6 commodities x 3 bases
INSERT INTO public.prices (commodity, delivery_basis, price_uah, region, recorded_on)
SELECT
  c.commodity,
  b.basis,
  base_price + (random() * 400 - 200) + (d.day::numeric * trend),
  CASE WHEN b.basis = 'FOB' THEN 'Одеса' WHEN b.basis = 'CPT' THEN 'Київ' ELSE 'Полтава' END,
  (CURRENT_DATE - d.day)
FROM (VALUES
  ('grain', 8200, 15),
  ('corn', 7400, 10),
  ('sunflower', 18500, 25),
  ('rapeseed', 16800, 20),
  ('sugar', 14200, 8),
  ('meal', 12800, 12)
) AS c(commodity, base_price, trend)
CROSS JOIN (VALUES ('EXW'), ('CPT'), ('FOB')) AS b(basis)
CROSS JOIN generate_series(0, 29) AS d(day)
ON CONFLICT DO NOTHING;

-- Seed news
INSERT INTO public.news (title, summary, body, tags, author, image_url) VALUES
('Експорт пшениці зростає на тлі стабілізації логістики', 'За останній тиждень обсяги експорту зернових через морські порти зросли на 12%.', 'Міністерство аграрної політики повідомляє про стабілізацію логістичних маршрутів. Експорт пшениці через одеські порти досяг 1.2 млн тонн за місяць. Аналітики прогнозують подальше зростання попиту з боку країн Близького Сходу та Північної Африки.', ARRAY['Експорт','Пшениця','Аналітика'], 'АгроАналітика', 'https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg'),
('Прогноз погоди: опади сприятимуть вегетації кукурудзи', 'У більшості регіонів очікуються помірні опади, що покращать стан посівів кукурудзи.', 'Синоптики прогнозують помірні опади у центральних та південних регіонах протягом наступного тижня. Це сприятливо вплине на вегетацію кукурудзи, яка перебуває у критичній фазі розвитку. Температурний режим залишиться в межах норми.', ARRAY['Погода','Кукурудза','Прогноз'], 'АгроМетео', 'https://images.pexels.com/photos/411198/pexels-photo-411198.jpeg'),
('Ціни на соняшник продовжують зростати', 'Попит переробників та обмежена пропозиція підтримують високі ціни на соняшник.', 'Ринок соняшнику демонструє стійке зростання цін. Переробні заводи активно закуповують сировину для завантаження потужностей. Експортна ціна FOB Одеса досягла 18500 грн/т. Аналітики очікують збереження високого рівня цін до кінця сезону.', ARRAY['Соняшник','Ціни','Ринок'], 'АгроАналітика', 'https://images.pexels.com/photos/1029605/pexels-photo-1029605.jpeg'),
('Ріпак: нові експортні можливості для українських виробників', 'Європейські ринки відкривають додаткові квоти для імпорту українського ріпаку.', 'ЄС розглядає можливість розширення квот на імпорт агропродукції з України. Ріпак, як ключова олійна культура, отримає пріоритетний доступ. Це створює нові можливості для українських виробників та експортерів. Ціни на ріпак FOB зростають на тлі позитивних новин.', ARRAY['Ріпак','Експорт','ЄС'], 'АгроАналітика', 'https://images.pexels.com/photos/60020/pexels-photo-60020.jpeg'),
('Цукор: внутрішній ринок стабілізується', 'Производство цукку відповідає очікуванням, ціни залишаються стабільними.', 'Цукрові заводи завершують переробку буряку. Внутрішні ціни на цукор стабілізувалися на рівні 14200 грн/т. Експортні можливості обмежені високими логістичними витратами. Споживчий попит залишається стабільним.', ARRAY['Цукор','Ціни','Внутрішній ринок'], 'АгроАналітика', 'https://images.pexels.com/photos/230834/pexels-photo-230834.jpeg'),
('Шрот: попит тваринницьких комплексів зростає', 'Виробники комбікормів збільшують закупівлі шроту на тлі розширення поголів''я.', 'Тваринницький сектор демонструє відновлення, що стимулює попит на білкові компоненти комбікормів. Шрот соняшнику та сої користується підвищеним попитом. Ціни на шрот CPT зросли на 3% за останній місяць. Виробники прогнозують збереження тенденції до кінця року.', ARRAY['Шрот','Тваринництво','Ціни'], 'АгроАналітика', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg')
ON CONFLICT DO NOTHING;

-- Seed contract templates
INSERT INTO public.contract_templates (contract_type, title, template_body) VALUES
('sales', 'Договір купівлі-продажу сільгосппродукції', 'ДОГОВІР КУПІВЛІ-ПРОДАЖУ СІЛЬГОСППРОДУКЦІЇ

м. Київ, {{contract_date}}

Продавець: {{seller_name}}, ЄДРПОУ {{seller_usreou}}, банківські реквізити IBAN {{seller_iban}}, банк {{seller_bank}}
Покупець: {{buyer_name}}, ЄДРПОУ {{buyer_usreou}}, банківські реквізити IBAN {{buyer_iban}}, банк {{buyer_bank}}

1. ПРЕДМЕТ ДОГОВОРУ
Продавець зобов''язується передати у власність Покупця, а Покупець зобов''язується прийняти та оплатити сільгосппродукцію:
- Найменування: {{crop_name}}
- Обсяг: {{volume_tons}} тонн
- Ціна за тонну: {{price_per_ton}} грн (без ПДВ)
- Загальна вартість: {{total_amount}} грн
- Базис поставки: {{delivery_basis}}
- Рік врожаю: {{harvest_year}}
- Показники якості: вологість {{moisture}}%, протеїн {{protein}}%, сміття {{foreign_matter}}%

2. ЯКІСТЬ ПРОДУКЦІЇ
Якість продукції повинна відповідати показникам, зазначеним у Додатку №1 (Складське свідоцтво) та Додатку №2 (Лабораторний аналіз).

3. ПОРЯДОК РОЗРАХУНКІВ
{{payment_terms}}

4. ВІДПОВІДАЛЬНІСТЬ СТОРІН
Сторони несуть відповідальність за невиконання зобов''язань згідно з чинним законодавством України.

Підписи:
Продавець: _________________  Покупець: _________________'),
('contracting', 'Договір контрактації сільгосппродукції', 'ДОГОВІР КОНТРАКТАЦІЇ СІЛЬГОСППРОДУКЦІЇ

м. Київ, {{contract_date}}

Виробник: {{seller_name}}, ЄДРПОУ {{seller_usreou}}, IBAN {{seller_iban}}, банк {{seller_bank}}
Контрактатор: {{buyer_name}}, ЄДРПОУ {{buyer_usreou}}, IBAN {{buyer_iban}}, банк {{buyer_bank}}

1. ПРЕДМЕТ ДОГОВОРУ
Виробник зобов''язується виростити та передати Контрактатору, а Контрактатор зобов''язується прийняти та оплатити:
- Культура: {{crop_name}}
- Обсяг: {{volume_tons}} тонн
- Ціна за тонну: {{price_per_ton}} грн
- Загальна вартість: {{total_amount}} грн
- Базис: {{delivery_basis}}
- Рік врожаю: {{harvest_year}}

2. СТРОКИ ВИРОЩУВАННЯ ТА ПЕРЕДАЧІ
Продукція передається після збирання врожаю {{harvest_year}} року.

3. РОЗРАХУНКИ
{{payment_terms}}

Підписи:
Виробник: _________________  Контрактатор: _________________'),
('forward', 'Форвардний контракт на поставку сільгосппродукції', 'ФОРВАРДНИЙ КОНТРАКТ НА ПОСТАЧАННЯ СІЛЬГОСППРОДУКЦІЇ

м. Київ, {{contract_date}}

Постачальник: {{seller_name}}, ЄДРПОУ {{seller_usreou}}, IBAN {{seller_iban}}, банк {{seller_bank}}
Покупець: {{buyer_name}}, ЄДРПОУ {{buyer_usreou}}, IBAN {{buyer_iban}}, банк {{buyer_bank}}

1. ПРЕДМЕТ КОНТРАКТУ
Постачальник зобов''язується поставити, а Покупець зобов''язується прийняти та оплатити:
- Продукція: {{crop_name}}
- Обсяг: {{volume_tons}} тонн
- Форвардна ціна: {{price_per_ton}} грн/т
- Загальна вартість: {{total_amount}} грн
- Базис: {{delivery_basis}}
- Період поставки: після збирання врожаю {{harvest_year}}

2. ЗАВДАТОК
{{deposit_terms}}

3. РОЗРАХУНКИ
{{payment_terms}}

Підписи:
Постачальник: _________________  Покупець: _________________')
ON CONFLICT DO NOTHING;
