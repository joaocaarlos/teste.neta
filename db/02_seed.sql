-- ============================================================
--  CapaCity -- Seed Data
-- ============================================================

-- COMPANIES
INSERT INTO companies (id, name, cnpj, type, status, city, orders_count) VALUES
  ('11111111-0001-0001-0001-000000000001', 'MetalPrime Usinagem',   '12.345.678/0001-90', 'Fornecedor',  'Aprovado',    'Recife/PE',        32),
  ('11111111-0002-0002-0002-000000000002', 'Eletro Nordeste SA',    '98.765.432/0001-11', 'Demandante',  'Aprovado',    'Fortaleza/CE',      8),
  ('11111111-0003-0003-0003-000000000003', 'Indfab Nordeste',       '55.555.555/0001-22', 'Fornecedor',  'Em analise',  'Joao Pessoa/PB',    0),
  ('11111111-0004-0004-0004-000000000004', 'Precisao Tech SP',      '33.444.555/0001-66', 'Fornecedor',  'Pendente',    'Sao Paulo/SP',      0),
  ('11111111-0005-0005-0005-000000000005', 'Confeccao Textil NE',   '77.888.999/0001-33', 'Fornecedor',  'Pendente',    'Fortaleza/CE',      0),
  ('11111111-0006-0006-0006-000000000006', 'CapaCity Sistemas',     '00.000.000/0001-00', 'Demandante',  'Aprovado',    'Recife/PE',         0),
  ('11111111-0007-0007-0007-000000000007', 'AutoPecas Brasil Ltda', '11.222.333/0001-44', 'Demandante',  'Aprovado',    'Sao Paulo/SP',     12),
  ('11111111-0008-0008-0008-000000000008', 'Construtora Rio Branco','22.333.444/0001-55', 'Demandante',  'Aprovado',    'Rio Branco/AC',     5),
  ('11111111-0009-0009-0009-000000000009', 'Startup Industrial BR', '33.444.555/0001-67', 'Demandante',  'Aprovado',    'Florianopolis/SC',  3),
  ('11111111-000a-000a-000a-00000000000a', 'Grupo Alimentos MG',    '44.555.666/0001-77', 'Demandante',  'Aprovado',    'Belo Horizonte/MG',18),
  ('11111111-000b-000b-000b-00000000000b', 'Usinagem Noroeste',     '55.666.777/0001-88', 'Fornecedor',  'Aprovado',    'Caruaru/PE',        8),
  ('11111111-000c-000c-000c-00000000000c', 'CNC Master SP',         '66.777.888/0001-99', 'Fornecedor',  'Aprovado',    'Campinas/SP',      22),
  ('11111111-000d-000d-000d-00000000000d', 'Sigma Ind Ltda',        '77.888.999/0001-44', 'Fornecedor',  'Aprovado',    'Joinville/SC',     14),
  ('11111111-000e-000e-000e-00000000000e', 'Caldeiraria Pernambuco','88.999.000/0001-11', 'Fornecedor',  'Aprovado',    'Recife/PE',         7);

-- USERS (passwords: demo123 / admin123)
INSERT INTO users (id, email, password_hash, role, name, company_id, cnpj, avatar) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'joao@metalparts.com.br',     crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Joao Silva',     '11111111-0002-0002-0002-000000000002', '98.765.432/0001-11', 'JS'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'pedro@metalprime.com.br',    crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Pedro Souza',    '11111111-0001-0001-0001-000000000001', '12.345.678/0001-90', 'PS'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'admin@capacity.com.br',      crypt('admin123',gen_salt('bf', 10)), 'admin',      'Admin CapaCity', '11111111-0006-0006-0006-000000000006', '00.000.000/0001-00', 'AD'),
  ('bbbbbbbb-0001-0001-0001-000000000001', 'ana@eletronordeste.com.br',  crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Ana Rodrigues',   '11111111-0002-0002-0002-000000000002', '98.765.432/0001-11', 'AR'),
  ('bbbbbbbb-0002-0002-0002-000000000002', 'carlos@metalprime.com.br',   crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Carlos Silva',    '11111111-0001-0001-0001-000000000001', '12.345.678/0001-90', 'CS'),
  ('bbbbbbbb-0003-0003-0003-000000000003', 'maria@autopecas.com.br',     crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Maria Santos',    '11111111-0007-0007-0007-000000000007', '11.222.333/0001-44', 'MS'),
  ('bbbbbbbb-0004-0004-0004-000000000004', 'roberto@autopecas.com.br',   crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Roberto Farias',  '11111111-0007-0007-0007-000000000007', '11.222.333/0001-44', 'RF'),
  ('bbbbbbbb-0005-0005-0005-000000000005', 'lucia@construtora-rb.com.br',crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Lucia Mendes',    '11111111-0008-0008-0008-000000000008', '22.333.444/0001-55', 'LM'),
  ('bbbbbbbb-0006-0006-0006-000000000006', 'fernando@startupbr.com.br',  crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Fernando Costa',  '11111111-0009-0009-0009-000000000009', '33.444.555/0001-67', 'FC'),
  ('bbbbbbbb-0007-0007-0007-000000000007', 'patricia@startupbr.com.br',  crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Patricia Lima',   '11111111-0009-0009-0009-000000000009', '33.444.555/0001-67', 'PL'),
  ('bbbbbbbb-0008-0008-0008-000000000008', 'eduardo@grupoalimentos.com.br', crypt('demo123', gen_salt('bf', 10)), 'demandante','Eduardo Martins','11111111-000a-000a-000a-00000000000a', '44.555.666/0001-77', 'EM'),
  ('bbbbbbbb-0009-0009-0009-000000000009', 'beatriz@grupoalimentos.com.br', crypt('demo123', gen_salt('bf', 10)), 'demandante','Beatriz Alves',  '11111111-000a-000a-000a-00000000000a', '44.555.666/0001-77', 'BA'),
  ('bbbbbbbb-000a-000a-000a-00000000000a', 'tiago@capacity.com.br',      crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Tiago Almeida',   '11111111-0006-0006-0006-000000000006', '00.000.000/0001-00', 'TA'),
  ('bbbbbbbb-000b-000b-000b-00000000000b', 'rafael@eletronordeste.com.br',crypt('demo123', gen_salt('bf', 10)),'demandante', 'Rafael Pinto',    '11111111-0002-0002-0002-000000000002', '98.765.432/0001-11', 'RP'),
  ('bbbbbbbb-000c-000c-000c-00000000000c', 'camila@autopecas.com.br',    crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Camila Duarte',   '11111111-0007-0007-0007-000000000007', '11.222.333/0001-44', 'CD'),
  ('bbbbbbbb-000d-000d-000d-00000000000d', 'bruno@construtora-rb.com.br',crypt('demo123', gen_salt('bf', 10)), 'demandante', 'Bruno Cardoso',   '11111111-0008-0008-0008-000000000008', '22.333.444/0001-55', 'BC'),
  ('bbbbbbbb-000e-000e-000e-00000000000e', 'juliana@grupoalimentos.com.br',crypt('demo123', gen_salt('bf', 10)),'demandante','Juliana Reis',    '11111111-000a-000a-000a-00000000000a', '44.555.666/0001-77', 'JR'),
  ('bbbbbbbb-000f-000f-000f-00000000000f', 'ricardo@indfab.com.br',      crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Ricardo Barros',  '11111111-0003-0003-0003-000000000003', '55.555.555/0001-22', 'RB'),
  ('bbbbbbbb-0010-0010-0010-000000000010', 'sandra@indfab.com.br',       crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Sandra Oliveira', '11111111-0003-0003-0003-000000000003', '55.555.555/0001-22', 'SO'),
  ('bbbbbbbb-0011-0011-0011-000000000011', 'marcelo@precisaotech.com.br',crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Marcelo Tavares', '11111111-0004-0004-0004-000000000004', '33.444.555/0001-66', 'MT'),
  ('bbbbbbbb-0012-0012-0012-000000000012', 'isabela@precisaotech.com.br',crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Isabela Nunes',   '11111111-0004-0004-0004-000000000004', '33.444.555/0001-66', 'IN'),
  ('bbbbbbbb-0013-0013-0013-000000000013', 'andre@confeccaotextil.com.br',crypt('demo123',gen_salt('bf', 10)), 'fornecedor', 'Andre Pereira',   '11111111-0005-0005-0005-000000000005', '77.888.999/0001-33', 'AP'),
  ('bbbbbbbb-0014-0014-0014-000000000014', 'leticia@usinagemnoroeste.com.br',crypt('demo123',gen_salt('bf',10)),'fornecedor', 'Leticia Castro',  '11111111-000b-000b-000b-00000000000b', '55.666.777/0001-88', 'LC'),
  ('bbbbbbbb-0015-0015-0015-000000000015', 'gustavo@usinagemnoroeste.com.br',crypt('demo123',gen_salt('bf',10)),'fornecedor', 'Gustavo Ramos',   '11111111-000b-000b-000b-00000000000b', '55.666.777/0001-88', 'GR'),
  ('bbbbbbbb-0016-0016-0016-000000000016', 'henrique@cncmaster.com.br',  crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Henrique Vieira', '11111111-000c-000c-000c-00000000000c', '66.777.888/0001-99', 'HV'),
  ('bbbbbbbb-0017-0017-0017-000000000017', 'natalia@cncmaster.com.br',   crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Natalia Rocha',   '11111111-000c-000c-000c-00000000000c', '66.777.888/0001-99', 'NR'),
  ('bbbbbbbb-0018-0018-0018-000000000018', 'lucas@sigmaind.com.br',      crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Lucas Moreira',   '11111111-000d-000d-000d-00000000000d', '77.888.999/0001-44', 'LM'),
  ('bbbbbbbb-0019-0019-0019-000000000019', 'daniela@sigmaind.com.br',    crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Daniela Freitas', '11111111-000d-000d-000d-00000000000d', '77.888.999/0001-44', 'DF'),
  ('bbbbbbbb-001a-001a-001a-00000000001a', 'felipe@caldeirariape.com.br',crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Felipe Dantas',   '11111111-000e-000e-000e-00000000000e', '88.999.000/0001-11', 'FD'),
  ('bbbbbbbb-001b-001b-001b-00000000001b', 'carolina@caldeirariape.com.br',crypt('demo123',gen_salt('bf', 10)),'fornecedor', 'Carolina Tavares','11111111-000e-000e-000e-00000000000e', '88.999.000/0001-11', 'CT'),
  ('bbbbbbbb-001c-001c-001c-00000000001c', 'paulo@metalprime.com.br',    crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Paulo Henrique',  '11111111-0001-0001-0001-000000000001', '12.345.678/0001-90', 'PH'),
  ('bbbbbbbb-001d-001d-001d-00000000001d', 'vanessa@metalprime.com.br',  crypt('demo123', gen_salt('bf', 10)), 'fornecedor', 'Vanessa Lima',    '11111111-0001-0001-0001-000000000001', '12.345.678/0001-90', 'VL'),
  ('bbbbbbbb-001e-001e-001e-00000000001e', 'thiago@capacity.com.br',     crypt('admin123',gen_salt('bf', 10)), 'admin',      'Thiago Mendonca', '11111111-0006-0006-0006-000000000006', '00.000.000/0001-00', 'TM');

-- DEMANDS
INSERT INTO demands (id, title, category, process, material, qty, deadline, urgency, budget, location, status, proposals_count, nda_required, cert_required, created_by) VALUES
  ('DM-4821', '5.000 suportes metalicos aco carbono',       'Usinagem CNC',  'Torneamento CNC',         'Aco SAE 1020',      '5.000 pecas',   '20/05/2026', 'Alta',    'R$ 25.000 - R$ 35.000', 'Recife/PE',       'Em cotacao',      7, FALSE, 'ISO 9001', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('DM-4819', 'Injecao plastica carcaca PP - 2k lote',      'Plastico',      'Injecao Plastica',        'PP copolimero',     '2.000 pecas',   '15/05/2026', 'Critica', 'R$ 12.000 - R$ 18.000', 'Sao Paulo/SP',    'Em negociacao',   4, TRUE,  NULL,       'aaaaaaaa-0001-0001-0001-000000000001'),
  ('DM-4810', 'Corte laser e dobra chapas 2mm inox',        'Corte/Dobra',   'Corte Laser + Dobra CNC', 'Inox 304 - 2mm',   '800 chapas',    '25/05/2026', 'Media',   'R$ 8.000 - R$ 14.000',  'Fortaleza/CE',    'Publicado',       2, FALSE, NULL,       'aaaaaaaa-0001-0001-0001-000000000001'),
  ('DM-4805', 'Soldagem MIG estruturas caldeiraria',         'Soldagem',      'Soldagem MIG/TIG',        'Aco estrutural',    '12 estruturas', '10/06/2026', 'Baixa',   'R$ 45.000 - R$ 60.000', 'Recife/PE',       'Publicado',       1, TRUE,  'ASME',     'aaaaaaaa-0001-0001-0001-000000000001');

-- PROPOSALS
INSERT INTO proposals (id, demand_id, supplier_id, supplier_name, city, score, total, total_raw, unit_price, days, start_date, rating, cert, risk, frete, payment, obs, risk_factors, status, sent_by) VALUES
  ('PR-901', 'DM-4821', '11111111-0001-0001-0001-000000000001', 'MetalPrime Usinagem', 'Recife/PE',      91, 'R$ 25.200', 25200, 'R$ 5,04', 12, '08/05', 4.8, 'ISO 9001',       'Baixo',  'R$ 800',   '30 dias',        'Setup incluso. Tolerancia +/-0,05mm garantida.',                         '[]',                                                                                   'Enviada', 'aaaaaaaa-0002-0002-0002-000000000002'),
  ('PR-902', 'DM-4821', '11111111-0003-0003-0003-000000000003', 'Indfab Nordeste',     'Joao Pessoa/PB', 87, 'R$ 27.500', 27500, 'R$ 5,50',  8, '06/05', 4.6, 'ISO 9001',       'Medio',  'R$ 1.200', 'A vista -5%',    'Prazo agressivo. Turno noturno disponivel.',                              '["Prazo abaixo da media","Primeira vez com este processo"]',               'Enviada', 'aaaaaaaa-0002-0002-0002-000000000002'),
  ('PR-903', 'DM-4821', '11111111-0004-0004-0004-000000000004', 'Precisao Tech SP',    'Sao Paulo/SP',   82, 'R$ 23.800', 23800, 'R$ 4,76', 18, '12/05', 4.9, 'ISO 9001 + IATF','Alto',   'R$ 4.500', '50% adiantado',  'Maior certificacao. Frete impacta custo total.',                          '["Distancia logistica alta","Frete representa 19% do valor"]',            'Enviada', 'aaaaaaaa-0002-0002-0002-000000000002'),
  ('PR-904', 'DM-4821', NULL,                                   'Usinagem Noroeste',   'Caruaru/PE',     72, 'R$ 21.000', 21000, 'R$ 4,20', 10, '07/05', 3.8, 'Nenhuma',        'Critico','R$ 650',   'A vista',        'Preco muito abaixo da media. Sem certificacao.',                          '["Fornecedor com poucas avaliacoes","Preco 22% abaixo da media","Sem certificacao ISO"]', 'Enviada', NULL);

-- ORDERS
INSERT INTO orders (id, demand_id, client_id, supplier_id, client, product, value, value_raw, status, pct, deadline) VALUES
  ('PD-4821', 'DM-4821', '11111111-0002-0002-0002-000000000002', '11111111-0001-0001-0001-000000000001', 'Eletro Nordeste SA',    'Suportes metalicos - 5k pcs', 'R$ 25.200', 25200, 'Em producao',      65,  '20/05/2026'),
  ('PD-4818', NULL,       '11111111-0002-0002-0002-000000000002', '11111111-0001-0001-0001-000000000001', 'Construtora Rio Branco','Flanges solda 800 pcs',        'R$ 18.400', 18400, 'Em inspecao',      90,  '10/05/2026'),
  ('PD-4815', NULL,       '11111111-0002-0002-0002-000000000002', '11111111-0004-0004-0004-000000000004', 'Startup Industrial BR', 'Carcacas PP - 2k pcs',         'R$ 13.200', 13200, 'Aguardando coleta',100, '08/05/2026'),
  ('PD-4810', NULL,       '11111111-0002-0002-0002-000000000002', '11111111-0001-0001-0001-000000000001', 'Grupo Alimentos MG',   'Eixos torneados - 3k pcs',     'R$ 21.800', 21800, 'Entregue',         100, '30/04/2026'),
  ('PD-4806', NULL,       NULL,                                   '11111111-0003-0003-0003-000000000003', 'Sigma Ind Ltda',       'Pecas dobradas - 200un',        'R$ 32.000', 32000, 'Em producao',      40,  '05/05/2026'),
  ('PD-4799', NULL,       NULL,                                   NULL,                                   'Usinagem Noroeste',    'Conjunto soldado',              'R$ 9.400',   9400, 'Cancelado',         0,  '22/04/2026');

-- MACHINES
INSERT INTO machines (id, company_id, name, type, brand, model, year, status, turns, cost, idle, monthly, used) VALUES
  ('MQ-001', '11111111-0001-0001-0001-000000000001', 'Torno CNC Romi Centur 30D',  'Torneamento', 'Romi',    'Centur 30D',    2020, 'Disponivel', 'Tarde, Noite',         'R$ 180/h', 65, 300, 105),
  ('MQ-002', '11111111-0001-0001-0001-000000000001', 'Centro Fresamento DMG Mori', 'Fresamento',  'DMG Mori','CMX 600',       2019, 'Parcial',    'Manha',                'R$ 280/h', 30, 300, 210),
  ('MQ-003', '11111111-0001-0001-0001-000000000001', 'Injetora Arburg 250T',       'Injecao',     'Arburg',  '370S 700-170',  2021, 'Disponivel', 'Manha, Tarde, Noite',  'R$ 240/h', 50, 500, 250),
  ('MQ-004', '11111111-0001-0001-0001-000000000001', 'Corte Laser Trumpf 3kW',     'Corte Laser', 'Trumpf',  'TruLaser 1030', 2022, 'Ocupado',    '-',                    'R$ 350/h',  5, 280, 266);

-- CONTRACTS
INSERT INTO contracts (id, order_id, demandante, fornecedor, demandante_id, fornecedor_id, valor, valor_raw, prazo, status, scope, generated_at, signed_at) VALUES
  ('CT-441', 'PD-4821', 'Eletro Nordeste SA',    'MetalPrime Usinagem', '11111111-0002-0002-0002-000000000002','11111111-0001-0001-0001-000000000001', 'R$ 25.200', 25200, '20/05/2026', 'Assinado',               'Torneamento CNC - 5.000 suportes metalicos O50mm aco SAE 1020', '03/05/2026', '03/05/2026'),
  ('CT-440', 'PD-4818', 'Construtora Rio Branco','MetalPrime Usinagem', '11111111-0002-0002-0002-000000000002','11111111-0001-0001-0001-000000000001', 'R$ 18.400', 18400, '10/05/2026', 'Aguardando assinatura',  'Soldagem MIG - 800 flanges estruturais',                        '01/05/2026', NULL),
  ('CT-435', 'PD-4815', 'Startup Industrial BR', 'Indfab Nordeste',     '11111111-0002-0002-0002-000000000002','11111111-0003-0003-0003-000000000003', 'R$ 13.200', 13200, '08/05/2026', 'Cancelado',              'Injecao Plastica - 2.000 carcacas PP',                          '28/04/2026', NULL);

-- NDAs
INSERT INTO ndas (id, demand_id, contraparte, signed_at, ip, status) VALUES
  ('NDA-038', 'DM-4819', 'Eletro Nordeste SA', '01/05/2026', '189.45.123.88', 'Ativo');

-- TRANSACTIONS
INSERT INTO transactions (id, order_id, party, gross, status, date) VALUES
  ('TXN-881', 'PD-4821', 'MetalPrime Usinagem', 25200, 'Retido',     '03/05/2026'),
  ('TXN-880', 'PD-4818', 'Indfab Nordeste',     18400, 'Liberado',   '01/05/2026'),
  ('TXN-879', 'PD-4815', 'Precisao Tech SP',    13200, 'Pendente',   '30/04/2026'),
  ('TXN-875', 'PD-4810', 'MetalPrime Usinagem',  8600, 'Liberado',   '28/04/2026'),
  ('TXN-872', 'PD-4806', 'Indfab Nordeste',     32000, 'Em disputa', '25/04/2026'),
  ('TXN-868', 'PD-4799', 'Usinagem Noroeste',    9400, 'Cancelado',  '22/04/2026');

-- DISPUTES
INSERT INTO disputes (id, order_id, demandante, fornecedor, type, impact, status, date, description, parecer, resolved_at) VALUES
  ('DP-041','PD-4806','Sigma Ind Ltda',      'CNC Express',     'Qualidade',                   'Alto',  'Em analise','01/05/2026','Pecas com dimensional fora de especificacao. 120 pecas reprovadas no recebimento.', NULL,NULL),
  ('DP-039','PD-4806','DataBR Sistemas',     'Indfab Nordeste', 'Atraso',                      'Medio', 'Aberta',    '28/04/2026','Entrega 8 dias apos prazo contratual sem comunicacao previa.',                       NULL,NULL),
  ('DP-038','PD-4806','AutoPecas Brasil',    'Precisao Tech',   'Quebra de confidencialidade', 'Alto',  'Em analise','25/04/2026','Desenho tecnico confidencial compartilhado com terceiros sem autorizacao.',           NULL,NULL),
  ('DP-035','PD-4799','Embalagens BR',       'Indfab Nordeste', 'Quantidade',                  'Baixo', 'Resolvida', '20/04/2026','Entrega de 80% da quantidade contratada sem justificativa.','Fornecedor reembolsou diferenca proporcional. Aceito pelas partes.','22/04/2026'),
  ('DP-033','PD-4799','MegaMoveis SA',       'Metalurgica NE',  'Acabamento incorreto',        'Medio', 'Resolvida', '15/04/2026','Acabamento superficial diferente do especificado no contrato.',                       'Retrabalho realizado pelo fornecedor sem custo adicional.','18/04/2026');

-- REVIEWS
INSERT INTO reviews (id, order_id, from_company, rating, comment, date, criterios) VALUES
  ('RV-001','PD-4821','Eletro Nordeste SA',    5,'Pecas dentro da tolerancia. Entrega 2 dias antes do prazo.',             '02/05/2026','[["Qualidade tecnica",5],["Cumprimento de prazo",5],["Comunicacao",5],["Documentacao",4]]'),
  ('RV-002','PD-4810','Startup Industrial BR', 4,'Boa comunicacao. Pequeno desvio dimensional resolvido rapidamente.',     '28/04/2026','[["Qualidade tecnica",4],["Cumprimento de prazo",4],["Comunicacao",5],["Documentacao",3]]'),
  ('RV-003','PD-4815','Construtora Rio Branco',5,'Processo impecavel. Produto conforme especificacao.',                    '24/04/2026','[["Qualidade tecnica",5],["Cumprimento de prazo",5],["Comunicacao",4],["Documentacao",5]]');

-- RECURRING CONTRACTS
INSERT INTO recurring_contracts (id, demandante, tipo, processo, volume, valor, inicio, vigencia, sla, status, renovacao) VALUES
  ('CR-021','Eletro Nordeste SA',     'Mensal fixo',       'Torneamento CNC',  '5.000 pcs/mes','R$ 24.500/mes','01/03/2026','01/03/2027','98% entregas no prazo','Ativo',  'Automatica'),
  ('CR-018','AutoPecas Brasil Ltda',  'Capacidade reservada','Fresamento 5X',  '300h/mes',     'R$ 72.000/mes','01/02/2026','01/08/2026','96% entregas no prazo','Ativo',  'Manual'),
  ('CR-015','Construtora Rio Branco', 'Emergencial',       'Soldagem MIG/TIG', 'Sob demanda',  'R$ 320/h',     '15/04/2026','15/07/2026','Resposta em 48h',       'Pausado','Manual');

-- AUDIT LOGS
INSERT INTO audit_logs (evento, usuario, empresa, ip, data, tipo, ref, user_id) VALUES
  ('Login realizado',                 'Carlos Silva',    'MetalPrime Usinagem', '189.45.123.88','03/05/2026 14:31:02','auth',      NULL,                        'aaaaaaaa-0002-0002-0002-000000000002'),
  ('Proposta enviada',                'Carlos Silva',    'MetalPrime Usinagem', '189.45.123.88','03/05/2026 14:35:18','proposta',  'PR-901 - DM-4821',          'aaaaaaaa-0002-0002-0002-000000000002'),
  ('NDA assinado',                    'Ana Rodrigues',   'Eletro Nordeste SA',  '200.16.88.42', '03/05/2026 13:20:04','nda',       'DM-4819',                   'aaaaaaaa-0001-0001-0001-000000000001'),
  ('Contrato gerado',                 'Sistema',         'CapaCity',            '-',            '03/05/2026 13:22:11','contrato',  'CT-441',                    NULL),
  ('Contrato assinado',               'Ana Rodrigues',   'Eletro Nordeste SA',  '200.16.88.42', '03/05/2026 13:28:55','contrato',  'CT-441',                    'aaaaaaaa-0001-0001-0001-000000000001'),
  ('Demanda publicada',               'Ana Rodrigues',   'Eletro Nordeste SA',  '200.16.88.42', '02/05/2026 09:14:33','demanda',   'DM-4821',                   'aaaaaaaa-0001-0001-0001-000000000001'),
  ('Atualizacao de producao',         'Carlos Silva',    'MetalPrime Usinagem', '189.45.123.88','03/05/2026 08:45:00','producao',  'PD-4821 - 65%',             'aaaaaaaa-0002-0002-0002-000000000002'),
  ('Disputa aberta',                  'Roberto Farias',  'AutoPecas Brasil',    '187.88.44.21', '01/05/2026 11:02:18','disputa',   'DP-039',                    NULL),
  ('Arquivo tecnico acessado',        'Carlos Silva',    'MetalPrime Usinagem', '189.45.123.88','03/05/2026 14:36:02','arquivo',   'DM-4821 - desenho_v2.PDF',  'aaaaaaaa-0002-0002-0002-000000000002'),
  ('Login falhou (3x)',                'desconhecido',   '-',                   '45.230.11.99', '02/05/2026 22:14:55','auth_fail', NULL,                        NULL);

-- NOTIFICATIONS
INSERT INTO notifications (user_role, user_id, tipo, icone, titulo, descricao, tempo, lida) VALUES
  ('demandante','aaaaaaaa-0001-0001-0001-000000000001','proposta',    '?','Nova proposta recebida',      'MetalPrime Usinagem enviou proposta para DM-4821 - Score 91',      '5 min', FALSE),
  ('demandante','aaaaaaaa-0001-0001-0001-000000000001','proposta',    '?','Nova proposta recebida',      'Indfab Nordeste enviou proposta para DM-4821 - Score 87',           '18 min',FALSE),
  ('demandante','aaaaaaaa-0001-0001-0001-000000000001','producao',    '?','Producao atualizada',         'PD-4821 agora esta 65% concluido - MetalPrime Usinagem',            '1h',    FALSE),
  ('demandante','aaaaaaaa-0001-0001-0001-000000000001','nda',         '?','NDA pendente de assinatura',  'Indfab Nordeste aguarda sua aprovacao do NDA para DM-4819',         '2h',    TRUE),
  ('demandante','aaaaaaaa-0001-0001-0001-000000000001','contrato',    '?','Contrato aguardando assinatura','CT-440 gerado para pedido PD-4818 com MetalPrime',               '3h',    TRUE),
  ('fornecedor','aaaaaaaa-0002-0002-0002-000000000002','demanda',     '?','Nova demanda compativel',      'DM-4810 - Corte Laser 800 chapas Inox - Fortaleza/CE - R$ 8-14k', '10 min',FALSE),
  ('fornecedor','aaaaaaaa-0002-0002-0002-000000000002','demanda',     '?','Demanda urgente compativel',   'DM-4805 - Soldagem MIG 12 estruturas - Urgencia: Baixa',           '22 min',FALSE),
  ('fornecedor','aaaaaaaa-0002-0002-0002-000000000002','contrato',    '?','Contrato gerado',              'CT-441 foi gerado para PD-4821 - Eletro Nordeste SA',              '1h',    FALSE),
  ('fornecedor','aaaaaaaa-0002-0002-0002-000000000002','pagamento',   '?','Pagamento liberado',           'R$ 18.400 liberado para PD-4818 - Construtora Rio Branco',         '4h',    TRUE),
  ('fornecedor','aaaaaaaa-0002-0002-0002-000000000002','avaliacao',   '?','Nova avaliacao recebida',      'Eletro Nordeste SA avaliou PD-4801 com 5 estrelas',                '1 dia', TRUE),
  ('admin',     'aaaaaaaa-0003-0003-0003-000000000003','verificacao', '?','Empresa aguardando verificacao','Precisao Tech SP enviou documentacao - 2 pendentes',              '30 min',FALSE),
  ('admin',     'aaaaaaaa-0003-0003-0003-000000000003','disputa',     '?','Nova disputa aberta',          'DP-039 - AutoPecas Brasil <-> Indfab Nordeste - Impacto: Medio',    '1h',    FALSE),
  ('admin',     'aaaaaaaa-0003-0003-0003-000000000003','auth_fail',   '?','Tentativas de login suspeitas','IP 45.230.11.99 tentou login 3x sem sucesso',                       '8h',    FALSE),
  ('admin',     'aaaaaaaa-0003-0003-0003-000000000003','empresa',     '?','Nova empresa cadastrada',       'Confeccao Textil NE - Fortaleza/CE - Aguardando verificacao',     '1 dia', TRUE);

-- CONVERSATIONS & MESSAGES
INSERT INTO conversations (id, label, demand_id, participant_a, participant_b, nda_required) VALUES
  ('dm-4821', 'DM-4821 - Eletro Nordeste',     'DM-4821', 'aaaaaaaa-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', TRUE),
  ('dm-4819', 'DM-4819 - Startup Industrial',  'DM-4819', 'aaaaaaaa-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', TRUE),
  ('dm-4805', 'DM-4805 - Construtora',          'DM-4805', 'aaaaaaaa-0001-0001-0001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', FALSE);

INSERT INTO messages (conversation_id, sender_id, from_name, msg, tipo) VALUES
  ('dm-4821','aaaaaaaa-0001-0001-0001-000000000001','Eletro Nordeste SA',  'Precisamos confirmar a tolerancia dimensional. O projeto exige +/-0,05mm.','text'),
  ('dm-4821','aaaaaaaa-0002-0002-0002-000000000002','MetalPrime Usinagem', 'Confirmado. Nosso torno CNC opera com tolerancia de +/-0,03mm. Tenho laudo de calibracao.','text'),
  ('dm-4821','aaaaaaaa-0001-0001-0001-000000000001','Eletro Nordeste SA',  'Perfeito. Seria possivel antecipar para 15/05?','text'),
  ('dm-4821','aaaaaaaa-0002-0002-0002-000000000002','MetalPrime Usinagem', '15/05 e viavel com acrescimo de R$ 800 no setup para turno noturno.','text'),
  ('dm-4819',NULL,                                  'Startup Industrial BR','Ola, temos interesse na sua proposta para injecao plastica.','text'),
  ('dm-4819','aaaaaaaa-0002-0002-0002-000000000002','MetalPrime Usinagem', 'Podemos atender o volume de 2.000 pecas.','text'),
  ('dm-4805',NULL,                                  'Construtora Rio Branco','Precisamos de orcamento para as 12 estruturas.','text');

-- VERIFICATION DOCUMENTS
INSERT INTO verification_documents (company_id, nome, obrigatorio, status, arquivo, enviado) VALUES
  ('11111111-0001-0001-0001-000000000001','Contrato Social',            TRUE, 'Aprovado',    'contrato_social_metalPrime.pdf','29/04/2026'),
  ('11111111-0001-0001-0001-000000000001','Alvara de Funcionamento',    TRUE, 'Aprovado',    'alvara_2026.pdf',               '29/04/2026'),
  ('11111111-0001-0001-0001-000000000001','Comprovante CNPJ',           TRUE, 'Aprovado',    'cnpj_metalPrime.pdf',           '29/04/2026'),
  ('11111111-0001-0001-0001-000000000001','Certificado ISO 9001',       FALSE,'Em analise',  'iso9001_cert_2026.pdf',         '02/05/2026'),
  ('11111111-0001-0001-0001-000000000001','ART/RRT Responsavel Tecnico',FALSE,'Pendente',    NULL,                            NULL);
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;
