// CloudFront viewer-request function: serve clean URLs from index.html without redirecting,
// matching `try_files $uri $uri/index.html` in docker/nginx.conf.template.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (uri.split("/").pop().indexOf(".") === -1) {
    request.uri = uri + "/index.html";
  }

  return request;
}
