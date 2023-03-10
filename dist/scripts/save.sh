#!/bin/bash -e
: "${OBJECT_KEY:?OBJECT_KEY env var missing}"
: "${BUCKET:?BUCKET env var missing}"
: "${LOCAL_PATH:?LOCAL_PATH env var missing}"

ZSTD_CLEVEL="${ZSTD_CLEVEL:--4}"
ZSTD_NBTHREADS="${ZSTD_NBTHREADS:-4}"
AWS_MAX_CONCURRENT_REQUESTS="${AWS_MAX_CONCURRENT_REQUESTS:-30}"

aws configure set default.s3.max_concurrent_requests "$AWS_MAX_CONCURRENT_REQUESTS"

mkdir -p "$LOCAL_PATH"

# We'll use the uncompressed size of the folder as an upper bound on the size of the compressed tar archive.
# We have to provide this upper bound to aws s3, so it knows how to break down the file into a reasonable
# number of chunks (there cannot be more than 10k chunks).
uncompressed_size="$(du -sb "$LOCAL_PATH" | awk '{print $1}')"
echo "Cache item uncompressed size: $uncompressed_size"

remote_object="s3://${BUCKET}/${OBJECT_KEY}"
tar -C "$LOCAL_PATH" --zstd -cf - . | aws s3 cp --expected-size "$uncompressed_size" - "$remote_object"
