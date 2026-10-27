import { getNoteDate } from "../note-date.js";

export const tinylogDate = (entry) => {
  return getNoteDate(entry).format("YYYY-MM-DD HH:mm ZZ");
};
