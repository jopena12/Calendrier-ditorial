-- Seed optionnel : les 4 marques KMI avec leurs réseaux par défaut.
-- L'onboarding (brand_profile) reste à faire depuis l'app.

insert into brands (name, website_url, color_hex)
values
  ('Studio By KM', 'https://studiobykm.com', '#e11d48'),
  ('Bornia',       'https://bornia.fr',      '#0ea5e9'),
  ('KMI Group',    null,                     '#6366f1'),
  ('Vumos',        null,                     '#f59e0b')
on conflict do nothing;

insert into brand_platforms (brand_id, platform, active)
select b.id, p.platform, true
from brands b
cross join (values ('linkedin'), ('instagram'), ('facebook'), ('tiktok')) as p(platform)
where b.name in ('Studio By KM', 'Bornia', 'KMI Group', 'Vumos')
on conflict (brand_id, platform) do nothing;
