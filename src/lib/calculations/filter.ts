import {CalendarEvent} from "./stats";


// Filtering by Time
    //Sets up different types of filtering
    export type TimeFilter = 
        | {type: "year"; year:number }
        | {type: "month"; year:number; month:number }
        | {type: "week"; year:number; month:number; week:number }
        | {type: "lifetime"}
        | {type: "custom"; from:Date; to: Date};


    //gets range of date from selected filter
    //param: TimeFilter type
    //Output: from and to dates
    function getDateRangeFromFilter(filter: TimeFilter): {from: Date; to: Date} {
        const now = new Date();

        switch (filter.type) {
            case "year" : {
                const from = new Date(filter.year, 0, 1); //Jan 1
                const to = new Date(filter.year, 11, 31, 23, 59, 59); //SELECTEDYEAR-11-31 11:59 
                return {
                    from, 
                    to: now.getFullYear() === filter.year? now : to, //if current year, caps at today
                };
            }
            

            case "month" : {
                const from = new Date(filter.year, filter.month - 1, 1); 
                const lastDay = new Date(filter.year, filter.month, 0).getDate(); 
                const to = new Date(filter.year, filter.month - 1, lastDay, 23, 59, 59);
                return {
                    from,
                    to:
                        now.getFullYear() === filter.year && now.getMonth() === filter.month - 1
                            ? now
                            : to,
                };
            }

            case "week": {
                // For week, we need to find the Monday of that week
                // This is a bit complex - let's start simple: find first day of month, then find the week
                const firstOfMonth = new Date(filter.year, filter.month - 1, 1);
                const firstMonday = new Date(firstOfMonth);
                const dayOfWeek = firstMonday.getDay(); // 0 = Sunday, 1 = Monday
                const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
                firstMonday.setDate(1 + daysToMonday);
        
                // Now find the start of the Nth week
                const weekStart = new Date(firstMonday);
                weekStart.setDate(firstMonday.getDate() + (filter.week - 1) * 7);
        
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59);
        
                return {
                from: weekStart,
                to: now >= weekStart && now <= weekEnd ? now : weekEnd,
                };
            }

            case "lifetime": {
                return {
                from: new Date(0), // beginning of time
                to: now,
                };
            }
        
            case "custom": {
                return {
                from: filter.from,
                to: filter.to,
                };
            }
        }
    }


    //Does the time filtering logic
    //Param: events array and filter we chose
    //output: events array only in the time range
    export function filterByTimeRange(
        events: CalendarEvent[],
        filter: TimeFilter
    ) : CalendarEvent[] {
        const {from, to } = getDateRangeFromFilter(filter);

        return events.filter((event) => {
            const eventStart = event.start;
            return eventStart >= from && eventStart <= to;
        });
    }


////////////////////////////////////
//Filter by calendar
//Takes in the events, and calendar ids
//for each event, returns if calendar ids in parameter are included in calendar
    export function filterByCalendars(
        events: CalendarEvent[],
        calendarIds: string[]
    ): CalendarEvent[] {
        return events.filter((event) => calendarIds.includes(event.calendarId));
    }

