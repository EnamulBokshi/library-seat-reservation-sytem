import { SlotType } from "../../generated/enums";

export interface IToggleSchedulePayload {
  isOpen: boolean;
}

export interface IBulkToggleSchedulePayload {
  startDate?: string;
  endDate?: string;
  dates?: string[];
  slots?: SlotType[];
  isOpen: boolean;
}

export interface IGenerateSchedulePayload {
  daysAhead?: number;
}
