import { dateFnsLocalizer } from "react-big-calendar";
import { format, getDay, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

const locales = {
  "en-US": enUS,
};

export const rbcLocalizer = dateFnsLocalizer({
  format,
  startOfWeek,
  getDay,
  locales,
});
