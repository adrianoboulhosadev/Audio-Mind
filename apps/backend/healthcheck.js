// Docker's HEALTHCHECK for the API. A file and not a one-liner in the compose
// because the shell quoting of an inline node script is a trap nobody should
// have to debug at 2am.
//
// Node 20 has fetch built in, so the image needs no curl.
const url = `http://127.0.0.1:${process.env.PORT ?? 5000}/health`

fetch(url)
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1))
