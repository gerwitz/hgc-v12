import moment from "moment";

export default {
  layout: "event",
  tags: ["events"],
  eleventyComputed: {
    description: (data) => {
      if (data.description || !data.type || !data.page.date) {
        return data.description;
      }

      return `${data.type} event in ${moment(data.page.date).format("YYYY")}`;
    },
  },
};
