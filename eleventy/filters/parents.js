export const parents = (relativeUrl) => {
  var paths = relativeUrl.split('/').filter(path => path);

  return paths.slice(0, -1);
}
