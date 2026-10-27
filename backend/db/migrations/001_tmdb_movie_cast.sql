ALTER TABLE movies
    ADD COLUMN IF NOT EXISTS tmdb_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS ix_movies_tmdb_id
    ON movies (tmdb_id)
    WHERE tmdb_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS casts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id bigint NOT NULL UNIQUE,
    name varchar(200) NOT NULL,
    original_name varchar(200),
    known_for_department varchar(80),
    gender integer,
    profile_path varchar(2048),
    popularity double precision
);

CREATE TABLE IF NOT EXISTS movie_cast (
    movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    cast_id uuid NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
    character text,
    cast_order integer NOT NULL DEFAULT 0,
    credit_id varchar(64),
    PRIMARY KEY (movie_id, cast_id)
);

CREATE INDEX IF NOT EXISTS ix_movie_cast_cast_id ON movie_cast (cast_id);

ALTER TABLE casts ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_cast ENABLE ROW LEVEL SECURITY;
