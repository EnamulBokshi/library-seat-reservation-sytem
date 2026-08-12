"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSlotActive = void 0;
const enums_1 = require("../generated/enums");
/**
 * Checks if the current local time falls within the given date and slot type window.
 * morning: 08:00 - 12:00
 * noon: 12:00 - 14:00
 * afternoon: 14:00 - 18:00
 * evening: 18:00 - 21:00
 */
const isSlotActive = (scheduleDate, slot) => {
    const now = new Date();
    const sDate = new Date(scheduleDate);
    // Verify date matches (Year, Month, Date)
    if (now.getFullYear() !== sDate.getFullYear() ||
        now.getMonth() !== sDate.getMonth() ||
        now.getDate() !== sDate.getDate()) {
        return false;
    }
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const totalMinutes = currentHour * 60 + currentMinute;
    let startMinutes = 0;
    let endMinutes = 0;
    switch (slot) {
        case enums_1.SlotType.morning:
            startMinutes = 8 * 60; // 08:00
            endMinutes = 12 * 60; // 12:00
            break;
        case enums_1.SlotType.noon:
            startMinutes = 12 * 60; // 12:00
            endMinutes = 14 * 60; // 14:00
            break;
        case enums_1.SlotType.afternoon:
            startMinutes = 14 * 60; // 14:00
            endMinutes = 18 * 60; // 18:00
            break;
        case enums_1.SlotType.evening:
            startMinutes = 18 * 60; // 18:00
            endMinutes = 21 * 60; // 21:00
            break;
        default:
            return false;
    }
    return totalMinutes >= startMinutes && totalMinutes < endMinutes;
};
exports.isSlotActive = isSlotActive;
