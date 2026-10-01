export default {
  gemini: {
    webOrigin: "https://hans.gerwitz.com",
    collections: ["gemlog", "notes", "about", "lists"],
    routeAliases: {
      "/writing/": "/posts/",
    },
    routes: [
      "/",
      "/posts/",
      "/notes/",
      "/about/",
      "/lists/",
    ],
  },
};
