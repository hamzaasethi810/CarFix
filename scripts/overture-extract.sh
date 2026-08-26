#!/usr/bin/env bash
# Pulls automotive places out of Overture Maps for a bounding box.
#
# Reads straight from Overture's public S3 bucket — no account, no key, no
# egress charge. The bbox columns are used for the filter because they are the
# indexed ones; filtering on geometry would read the whole planet.
#
#   ./scripts/overture-extract.sh <west> <south> <east> <north> <output.json>
#
# Virginia:
#   ./scripts/overture-extract.sh -83.7 36.5 -75.2 39.5 data/va-places.json
set -euo pipefail

WEST="${1:?west longitude}"
SOUTH="${2:?south latitude}"
EAST="${3:?east longitude}"
NORTH="${4:?north latitude}"
OUT="${5:?output path}"

# Pinned deliberately: a release change can move the schema, and an import
# should fail loudly rather than silently read different columns.
RELEASE="2026-08-19.0"

mkdir -p "$(dirname "$OUT")"

duckdb -c "
INSTALL spatial; LOAD spatial;
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';

COPY (
  SELECT
    id,
    names.primary                       AS name,
    taxonomy.primary                    AS category,
    confidence                          AS confidence,
    ST_Y(geometry)                      AS lat,
    ST_X(geometry)                      AS lng,
    addresses[1].freeform               AS freeform,
    addresses[1].locality               AS locality,
    addresses[1].region                 AS region,
    addresses[1].postcode               AS postcode,
    addresses[1].country                AS country,
    phones[1]                           AS phone,
    websites[1]                         AS website
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/${RELEASE}/theme=places/type=place/*',
    filename=true, hive_partitioning=1
  )
  WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
    AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
    -- Coarse rollup prefilter. Overture files these two above every workshop
    -- taxonomy; the fine-grained list in overture-categories.ts can still
    -- change freely without re-downloading.
    AND basic_category IN ('automotive_service', 'vehicle_service')
) TO '${OUT}' (FORMAT JSON, ARRAY false);
"

echo "wrote $(wc -l < "$OUT") records to $OUT"
