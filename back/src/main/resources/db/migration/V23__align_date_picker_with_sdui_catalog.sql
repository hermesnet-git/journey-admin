-- Alinha a definição persistida do seletor de data ao contrato normativo SDUI v1.
-- A migration V19 incluiu placeholder por engano, omitiu minDate/maxDate/format e usou
-- datetime em vez do valor canônico dateTime para a propriedade mode.
UPDATE component_definition
SET props_schema = '[
  {"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
  {"name":"mode","kind":"ENUM","required":true,"defaultValue":"date","tokenGroup":null,"enumValues":["date","time","dateTime"]},
  {"name":"minDate","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
  {"name":"maxDate","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
  {"name":"format","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
  {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
  {"name":"validation","kind":"VALIDATION_LIST","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}
]'::jsonb,
    updated_at = now()
WHERE type = 'ui.datePicker'
  AND version = '1.0.0';
