import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../helpers/CatchAsync";
import { sendResponse } from "../../helpers/SendResponse";
import { FineService } from "./fine.service";
import { FineSource } from "./fine.interface";
import { FineStatus, PaymentMethod } from "../../generated/enums";

const getStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await FineService.getFineStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Fine statistics retrieved successfully.",
    data: result,
  });
});

const getAllFines = catchAsync(async (req: Request, res: Response) => {
  const options = {
    source: (req.query.source as FineSource) || "all",
    status: (req.query.status as FineStatus | "all") || "all",
    paymentMethod: (req.query.paymentMethod as PaymentMethod | "all") || "all",
    searchTerm: req.query.searchTerm as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    sortBy: (req.query.sortBy as any) || "incurredAt",
    sortOrder: ((req.query.sortOrder as string) || "desc") as "asc" | "desc",
  };

  const result = await FineService.getAllFines(options);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Fine ledger records retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const payFine = catchAsync(async (req: Request, res: Response) => {
  const librarianId = req.user.userId;
  const source = req.params.source as "seat" | "loan";
  const id = req.params.id as string;

  const result = await FineService.payFine(source, id, req.body, librarianId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Fine payment settled successfully.",
    data: result,
  });
});

const waiveFine = catchAsync(async (req: Request, res: Response) => {
  const librarianId = req.user.userId;
  const source = req.params.source as "seat" | "loan";
  const id = req.params.id as string;

  const result = await FineService.waiveFine(source, id, req.body, librarianId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Fine waived successfully.",
    data: result,
  });
});

export const FineController = {
  getStats,
  getAllFines,
  payFine,
  waiveFine,
};
