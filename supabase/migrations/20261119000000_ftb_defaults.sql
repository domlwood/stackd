-- Focus: first purchase in personal name with a residential mortgage; flip judged on profit (£20k) only.
update public.workspace_settings
set
  buyer_entity = 'personal',
  buy_box = buy_box || jsonb_build_object('minFlipRoi', 0, 'minFlipProfitPence', 2000000),
  defaults = jsonb_set(
    jsonb_set(
      defaults,
      '{buyer}',
      coalesce(defaults -> 'buyer', '{}'::jsonb) || jsonb_build_object('firstTimeBuyer', true, 'additionalProperty', false)
    ),
    '{finance}',
    coalesce(defaults -> 'finance', '{}'::jsonb) || jsonb_build_object('purchaseLtv', 0.9)
  );
