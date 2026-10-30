-- 002 follow-up: 0006's accent list reached the dev database garbled (it was
-- pasted through a clipboard that wasn't UTF-8). Same function, with the
-- accented letters written as Unicode escapes so the file is plain ASCII.
-- Also maps ø to o.

create or replace function catalogue_search_text(name text, aliases text[]) returns text
  language sql immutable set search_path = public as $$
  select ' ' || trim(regexp_replace(
    translate(lower(name || ' ' || array_to_string(aliases, ' ')),
      U&'\00E0\00E1\00E2\00E4\00E3\00E5\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F2\00F3\00F4\00F6\00F5\00F8\00F9\00FA\00FB\00FC\00F1\00E7',
      'aaaaaaeeeeiiiioooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- Recompute the stored search text for any rows written before this.
update houses set name = name;
update fragrances set name = name;
