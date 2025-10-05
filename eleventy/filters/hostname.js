import URL from "url";

export const hostname = (url) => {
  var parsedUrl = URL.parse(url);
  return parsedUrl.hostname;
}
