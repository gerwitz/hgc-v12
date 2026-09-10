export default {
  layout: "work",
  tags: ["workRole"],
  eleventyComputed: {
    title: (data) => data.role ? `${data.role} at ${data.company}` : data.title,
  },
};
